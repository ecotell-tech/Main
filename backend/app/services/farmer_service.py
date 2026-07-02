"""
Farmer service — all business logic for farmer CRUD.
Routers stay thin and delegate here.
"""
from __future__ import annotations

from datetime import date as _date
from typing import Optional, Sequence

from fastapi import Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.crud import BaseRepository
from app.core.exceptions import conflict, not_found
from app.core.pagination import PageParams
from app.database import get_db
from app.models.auth import User
from app.models.farmer import Farmer
from app.models.farmer_photo import FarmerPhoto
from app.models.geography import District, State, Taluka, Village
from app.schemas.farmer import (
    BulkFarmerCreate,
    BulkFarmerRow,
    BulkImportResponse,
    BulkImportRowResult,
    FarmerCreate,
    FarmerDetail,
    FarmerPhotoOut,
    FarmerSummary,
    FarmerUpdate,
)


# ── Shared column lists ───────────────────────────────────────

_SUMMARY_COLS = [
    Farmer.id, Farmer.farmer_code, Farmer.name, Farmer.initials,
    Farmer.mobile, Farmer.gender, Farmer.village_id, Farmer.land_acres,
    Farmer.farming_type, Farmer.adoption_score, Farmer.plan_status,
    Farmer.last_visit_date, Farmer.next_visit_date, Farmer.avatar_gradient,
    Farmer.created_at,
    Farmer.review_status, Farmer.rejection_reason, Farmer.registered_by_user_id,
]

_GEO_COLS = [
    Village.name.label("village_name"),
    Taluka.name.label("taluka_name"),
    District.name.label("district_name"),
]

_GEO_JOINS = lambda q: (  # noqa: E731
    q
    .outerjoin(Village,  Farmer.village_id   == Village.id)
    .outerjoin(Taluka,   Village.taluka_id   == Taluka.id)
    .outerjoin(District, Taluka.district_id  == District.id)
)


# ── Repository ────────────────────────────────────────────────

class FarmerRepository(BaseRepository[Farmer]):
    """Data-access layer — only raw DB operations here."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Farmer, db)

    async def get_by_mobile(self, mobile: str) -> Optional[Farmer]:
        return (
            await self.db.execute(
                self._base_q().where(Farmer.mobile == mobile)
            )
        ).scalar_one_or_none()

    async def list_with_geography(
        self,
        params: PageParams,
        search: Optional[str] = None,
        plan_status: Optional[str] = None,
        registered_by_user_id: Optional[int] = None,
        is_draft: Optional[bool] = None,
    ) -> tuple[list[dict], int]:
        base = _GEO_JOINS(
            select(*_SUMMARY_COLS, *_GEO_COLS, User.name.label("rep_name"))
            .where(Farmer.deleted_at.is_(None))
            .order_by(Farmer.created_at.desc())
        ).outerjoin(User, Farmer.registered_by_user_id == User.id)

        if registered_by_user_id is not None:
            base = base.where(Farmer.registered_by_user_id == registered_by_user_id)
        if search:
            term = f"%{search}%"
            base = base.where(or_(Farmer.name.ilike(term), Farmer.mobile.contains(search)))
        if plan_status:
            base = base.where(Farmer.plan_status == plan_status)
        if is_draft is not None:
            base = base.where(Farmer.is_draft == is_draft)

        total = (
            await self.db.execute(select(func.count()).select_from(base.subquery()))
        ).scalar_one()

        rows = (
            await self.db.execute(base.offset(params.offset).limit(params.limit))
        ).all()

        return [dict(r._mapping) for r in rows], total

    async def get_detail_with_joins(self, farmer_id: int) -> Optional[dict]:
        from app.models.associations import FarmerCrop  # local to avoid circular
        from app.models.master import Crop

        crop_sq = (
            select(Crop.name)
            .join(FarmerCrop, FarmerCrop.crop_id == Crop.id)
            .where(FarmerCrop.farmer_id == farmer_id)
            .limit(1)
            .scalar_subquery()
        )

        # All Farmer columns
        farmer_cols = [
            getattr(Farmer, c.key)
            for c in Farmer.__mapper__.column_attrs
            if c.key != "deleted_at"
        ]

        row = (
            await self.db.execute(
                _GEO_JOINS(
                    select(
                        *farmer_cols,
                        *_GEO_COLS,
                        State.name.label("state_name"),
                        User.name.label("rep_name"),
                        User.mobile.label("rep_mobile"),
                        crop_sq.label("primary_crop"),
                    )
                    .where(Farmer.id == farmer_id)
                    .where(Farmer.deleted_at.is_(None))
                )
                # State must come after _GEO_JOINS so District is already in scope
                .outerjoin(State, District.state_id == State.id)
                .outerjoin(User, Farmer.registered_by_user_id == User.id)
            )
        ).first()

        return dict(row._mapping) if row else None


# ── Adoption score calculator ─────────────────────────────────

def _compute_adoption_score(
    interest_level:       str | None = None,
    training_willingness: str | None = None,
    adoption_timeline:    str | None = None,
    attended_training:    int        = 0,
    farming_type:         str | None = None,
) -> int:
    """
    0-100 score derived from five readiness fields.
    Weights: Interest 35 + Willingness 25 + Timeline 20 + Training 10 + Method 10.
    """
    score = 0
    score += {'high': 35, 'medium': 20, 'low': 5}.get(interest_level or '', 0)
    score += {'very_willing': 25, 'moderate': 15, 'not_willing': 0}.get(training_willingness or '', 0)
    score += {
        'Immediate (1 season)': 20,
        '6–12 months': 15,
        '1–2 years': 10,
        '2–3 years': 5,
        'Not decided': 2,
    }.get(adoption_timeline or '', 0)
    score += 10 if attended_training else 0
    score += {'organic': 10, 'natural': 10, 'mixed': 5, 'chemical': 0}.get(farming_type or '', 0)
    return min(score, 100)


# ── Service ───────────────────────────────────────────────────

class FarmerService:
    """Business logic layer — validation, code generation, orchestration."""

    def __init__(self, db: AsyncSession) -> None:
        self.repo = FarmerRepository(db)

    async def list(
        self,
        params: PageParams,
        search: Optional[str] = None,
        plan_status: Optional[str] = None,
        registered_by_user_id: Optional[int] = None,
    ) -> tuple[list[FarmerSummary], int]:
        rows, total = await self.repo.list_with_geography(
            params, search, plan_status, registered_by_user_id, is_draft=False
        )
        return [FarmerSummary.model_validate(r) for r in rows], total

    async def list_drafts(
        self,
        registered_by_user_id: int,
        params: Optional[PageParams] = None,
    ) -> tuple[list[FarmerSummary], int]:
        if params is None:
            params = PageParams(page=1, limit=100)
        rows, total = await self.repo.list_with_geography(
            params,
            registered_by_user_id=registered_by_user_id,
            is_draft=True,
        )
        return [FarmerSummary.model_validate(r) for r in rows], total

    async def get_or_404(self, farmer_id: int) -> FarmerDetail:
        db = self.repo.db

        # ── Main JOIN query ──────────────────────────────────────────────
        # Wrap in try/except so a DB error here raises HTTPException (a proper
        # HTTP response) instead of an uncaught exception that can leave the
        # session in "requires rollback" state and prevent uvicorn from sending
        # any response at all (which the browser sees as "Failed to fetch").
        try:
            row = await self.repo.get_detail_with_joins(farmer_id)
        except Exception as exc:
            try:
                await db.rollback()
            except Exception:
                pass
            raise HTTPException(status_code=500, detail=f"Database error: {exc}") from exc

        if row is None:
            raise not_found("Farmer not found")

        # ── Photos (non-fatal) ───────────────────────────────────────────
        try:
            photos = (
                await db.execute(
                    select(FarmerPhoto)
                    .where(FarmerPhoto.farmer_id == farmer_id)
                    .order_by(FarmerPhoto.created_at)
                )
            ).scalars().all()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass
            photos = []

        # ── Crops (non-fatal) ────────────────────────────────────────────
        from app.models.associations import FarmerCrop
        from app.models.master import Crop as CropModel
        try:
            crop_names = (
                await db.execute(
                    select(CropModel.name)
                    .join(FarmerCrop, FarmerCrop.crop_id == CropModel.id)
                    .where(FarmerCrop.farmer_id == farmer_id)
                    .order_by(FarmerCrop.is_primary.desc(), CropModel.name)
                )
            ).scalars().all()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass
            crop_names = []

        detail = FarmerDetail.model_validate(row)
        detail.farm_photos = [FarmerPhotoOut.model_validate(p) for p in photos]
        detail.crops = list(crop_names)
        return detail

    async def check_mobile(self, mobile: str) -> dict:
        farmer = await self.repo.get_by_mobile(mobile)
        return {"duplicate": farmer is not None, "farmer_id": farmer.id if farmer else None}

    async def create(
        self,
        payload: FarmerCreate,
        registered_by_user_id: int,
        is_draft: bool = False,
    ) -> FarmerDetail:
        db = self.repo.db

        try:
            if await self.repo.get_by_mobile(payload.mobile):
                raise conflict("A farmer with this mobile number already exists")
        except HTTPException:
            raise
        except Exception as exc:
            try:
                await db.rollback()
            except Exception:
                pass
            raise HTTPException(status_code=500, detail=f"Database error: {exc}") from exc

        parts = [payload.first_name]
        if payload.middle_name:
            parts.append(payload.middle_name)
        if payload.last_name:
            parts.append(payload.last_name)

        data = payload.model_dump(exclude_none=True)
        custom_code = data.pop("farmer_code", None)
        data.update(
            name=" ".join(parts),
            farmer_code="TMP-0000",
            registered_by_user_id=registered_by_user_id,
            is_draft=is_draft,
        )

        try:
            farmer = await self.repo.create(**data)
            farmer.farmer_code = custom_code.strip() if custom_code else f"FMR-{farmer.id:04d}"
            await self.repo.save(farmer)
        except HTTPException:
            raise
        except Exception as exc:
            try:
                await db.rollback()
            except Exception:
                pass
            raise HTTPException(status_code=500, detail=f"Database error: {exc}") from exc

        return await self.get_or_404(farmer.id)

    # Roles that can self-approve: they ARE the approval authority, so requiring
    # them to separately approve their own submission is redundant.
    _AUTO_APPROVE_ROLES = {"team_lead", "admin", "manager"}

    async def complete_registration(self, farmer_id: int, registered_by=None) -> FarmerDetail:
        db = self.repo.db
        try:
            farmer = await self.repo.get_or_404(farmer_id, "Farmer")
            role_name = registered_by.role.name if registered_by else None
            auto_approve = role_name in self._AUTO_APPROVE_ROLES
            await self.repo.update(
                farmer,
                is_draft=False,
                review_status="approved" if auto_approve else "pending_review",
                approved_by_user_id=registered_by.id if auto_approve else None,
                approved_date=_date.today() if auto_approve else None,
                rejection_reason=None,
                rejected_by_user_id=None,
            )
        except HTTPException:
            raise
        except Exception as exc:
            try:
                await db.rollback()
            except Exception:
                pass
            raise HTTPException(status_code=500, detail=f"Database error: {exc}") from exc
        return await self.get_or_404(farmer_id)

    async def reject(self, farmer_id: int, reason: Optional[str], rejected_by_user_id: int) -> FarmerDetail:
        db = self.repo.db
        try:
            farmer = await self.repo.get_or_404(farmer_id, "Farmer")
            await self.repo.update(
                farmer,
                review_status="rejected",
                rejection_reason=reason or None,
                rejected_by_user_id=rejected_by_user_id,
            )
        except HTTPException:
            raise
        except Exception as exc:
            try:
                await db.rollback()
            except Exception:
                pass
            raise HTTPException(status_code=500, detail=f"Database error: {exc}") from exc
        return await self.get_or_404(farmer_id)

    async def update(self, farmer_id: int, payload: FarmerUpdate) -> FarmerDetail:
        db = self.repo.db
        data = payload.model_dump(exclude_none=True)
        crop_names = data.pop("crop_names", None)

        if data:
            try:
                farmer = await self.repo.get_or_404(farmer_id, "Farmer")
                # Compute adoption score from merged (current DB state + incoming update).
                # Include it in the same write so no second round-trip is needed.
                data['adoption_score'] = _compute_adoption_score(
                    interest_level       = data.get('interest_level',       farmer.interest_level),
                    training_willingness = data.get('training_willingness', farmer.training_willingness),
                    adoption_timeline    = data.get('adoption_timeline',    farmer.adoption_timeline),
                    attended_training    = data.get('attended_training',    farmer.attended_training or 0),
                    farming_type         = data.get('farming_type',         farmer.farming_type),
                )
                await self.repo.update(farmer, **data)
            except HTTPException:
                raise
            except Exception as exc:
                try:
                    await db.rollback()
                except Exception:
                    pass
                raise HTTPException(status_code=500, detail=f"Database error: {exc}") from exc

        if crop_names is not None:
            return await self.set_crops(farmer_id, crop_names)

        return await self.get_or_404(farmer_id)

    async def set_crops(self, farmer_id: int, crop_names: list[str]) -> FarmerDetail:
        """Replace all farmer_crops rows for this farmer based on crop names."""
        from sqlalchemy import delete as sa_delete, select as sa_select
        from app.models.associations import FarmerCrop
        from app.models.master import Crop

        db = self.repo.db
        try:
            await self.repo.get_or_404(farmer_id, "Farmer")
            await db.execute(sa_delete(FarmerCrop).where(FarmerCrop.farmer_id == farmer_id))

            if crop_names:
                rows = (
                    await db.execute(
                        sa_select(Crop.id, Crop.name).where(Crop.name.in_(crop_names))
                    )
                ).all()
                crop_id_map = {r.name: r.id for r in rows}
                for i, name in enumerate(crop_names):
                    crop_id = crop_id_map.get(name)
                    if crop_id:
                        db.add(FarmerCrop(
                            farmer_id=farmer_id,
                            crop_id=crop_id,
                            is_primary=1 if i == 0 else 0,
                        ))

            await db.commit()
        except HTTPException:
            raise
        except Exception as exc:
            try:
                await db.rollback()
            except Exception:
                pass
            raise HTTPException(status_code=500, detail=f"Database error: {exc}") from exc

        return await self.get_or_404(farmer_id)

    async def soft_delete(self, farmer_id: int) -> None:
        farmer = await self.repo.get_or_404(farmer_id, "Farmer")
        await self.repo.soft_delete(farmer)

    async def _resolve_village(
        self,
        state_name:    Optional[str],
        district_name: Optional[str],
        taluka_name:   Optional[str],
        village_name:  Optional[str],
    ) -> Optional[int]:
        if not village_name:
            return None
        q = (
            select(Village.id)
            .outerjoin(Taluka,   Village.taluka_id  == Taluka.id)
            .outerjoin(District, Taluka.district_id == District.id)
            .outerjoin(State,    District.state_id  == State.id)
            .where(Village.name.ilike(village_name))
        )
        if taluka_name:
            q = q.where(Taluka.name.ilike(taluka_name))
        if district_name:
            q = q.where(District.name.ilike(district_name))
        if state_name:
            q = q.where(State.name.ilike(state_name))
        return (await self.repo.db.execute(q.limit(1))).scalar_one_or_none()

    async def bulk_import(
        self,
        rows: list[BulkFarmerRow],
        registered_by_user_id: int,
    ) -> BulkImportResponse:
        results: list[BulkImportRowResult] = []
        imported = 0

        for idx, row in enumerate(rows, start=2):  # row 2 = first data row in Excel
            try:
                # Resolve village_id from name-based geography if not given directly
                village_id = row.village_id
                if village_id is None and row.village_name:
                    village_id = await self._resolve_village(
                        row.state_name, row.district_name,
                        row.taluka_name, row.village_name,
                    )

                payload = FarmerCreate(
                    farmer_code=row.farmer_code,
                    first_name=row.first_name,
                    middle_name=row.middle_name,
                    last_name=row.last_name,
                    mobile=row.mobile,
                    alt_mobile=row.alt_mobile,
                    gender=row.gender,
                    dob=row.dob,
                    education_level=row.education_level,
                    village_id=village_id,
                    pin_code=row.pin_code,
                    nearest_mandi=row.nearest_mandi,
                    gps_lat=row.gps_lat,
                    gps_lng=row.gps_lng,
                    land_acres=row.land_acres,
                    irrigated_land_acres=row.irrigated_land_acres,
                    non_irrigated_land_acres=row.non_irrigated_land_acres,
                    soil_type=row.soil_type,
                    water_source=row.water_source,
                    land_ownership=row.land_ownership,
                    farming_type=row.farming_type,
                    practice_notes=row.practice_notes,
                    interest_level=row.interest_level,
                    training_willingness=row.training_willingness,
                    adoption_timeline=row.adoption_timeline,
                    priority=row.priority,
                    next_action=row.next_action,
                    referred_by=row.referred_by,
                    family_members=row.family_members,
                    annual_income=row.annual_income,
                    survey_date=row.survey_date,
                )

                farmer = await self.create(payload, registered_by_user_id, is_draft=False)

                if row.primary_crop:
                    try:
                        await self.set_crops(farmer.id, [row.primary_crop])
                    except Exception:
                        pass  # crop lookup failure is non-fatal

                imported += 1
                results.append(BulkImportRowResult(
                    row=idx, success=True,
                    farmer_id=farmer.id, farmer_code=farmer.farmer_code,
                ))
            except Exception as exc:
                results.append(BulkImportRowResult(
                    row=idx, success=False,
                    error=str(exc),
                ))

        return BulkImportResponse(
            imported=imported,
            skipped=len(rows) - imported,
            results=results,
        )


# ── FastAPI dependency ────────────────────────────────────────

def get_farmer_service(db: AsyncSession = Depends(get_db)) -> FarmerService:
    return FarmerService(db)
