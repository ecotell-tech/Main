"""Report service — plan completion + adoption scores."""
from __future__ import annotations

from typing import Optional

from fastapi import Depends

from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import PageParams
from app.database import get_db
from app.models.farmer import Farmer
from app.models.plan import ConsultingPlan, PlanComponentStatus


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def plan_completion(
        self,
        params: PageParams,
        user_id: Optional[int] = None,
    ) -> tuple[list[dict], int]:
        # Subquery: component totals per plan
        comp_q = (
            select(
                PlanComponentStatus.plan_id,
                func.count(PlanComponentStatus.id).label("total"),
                func.sum(
                    case((PlanComponentStatus.status == "done", 1), else_=0)
                ).label("done"),
            )
            .group_by(PlanComponentStatus.plan_id)
            .subquery()
        )

        q = (
            select(
                Farmer.id.label("farmer_id"),
                Farmer.farmer_code,
                Farmer.name.label("farmer_name"),
                ConsultingPlan.id.label("plan_id"),
                ConsultingPlan.plan_code,
                ConsultingPlan.status.label("plan_status"),
                func.coalesce(comp_q.c.total, 0).label("total_components"),
                func.coalesce(comp_q.c.done, 0).label("done_components"),
            )
            .join(ConsultingPlan, ConsultingPlan.farmer_id == Farmer.id, isouter=True)
            .join(comp_q, comp_q.c.plan_id == ConsultingPlan.id, isouter=True)
            .where(
                Farmer.deleted_at.is_(None),
                ConsultingPlan.deleted_at.is_(None),
            )
            .order_by(Farmer.name)
        )
        if user_id:
            q = q.where(ConsultingPlan.consultant_user_id == user_id)

        count_q = select(func.count()).select_from(q.subquery())
        total = (await self.db.execute(count_q)).scalar_one()

        q = q.offset(params.offset).limit(params.limit)
        rows = (await self.db.execute(q)).all()

        result = []
        for r in rows:
            total_c = r.total_components or 0
            done_c  = r.done_components or 0
            pct = round((done_c / total_c * 100) if total_c > 0 else 0.0, 1)
            result.append(
                {
                    "farmer_id":        r.farmer_id,
                    "farmer_code":      r.farmer_code,
                    "farmer_name":      r.farmer_name,
                    "plan_id":          r.plan_id,
                    "plan_code":        r.plan_code,
                    "plan_status":      r.plan_status,
                    "total_components": total_c,
                    "done_components":  done_c,
                    "completion_pct":   pct,
                }
            )
        return result, total

    async def adoption_scores(
        self,
        params: PageParams,
        user_id: Optional[int] = None,
    ) -> tuple[list[dict], int]:
        from app.models.associations import FarmerUserAssignment

        q = (
            select(
                Farmer.id.label("farmer_id"),
                Farmer.farmer_code,
                Farmer.name.label("farmer_name"),
                Farmer.adoption_score,
                Farmer.plan_status,
            )
            .where(Farmer.deleted_at.is_(None))
            .order_by(Farmer.adoption_score.desc().nullslast())
        )
        if user_id:
            q = q.join(
                FarmerUserAssignment,
                (FarmerUserAssignment.farmer_id == Farmer.id)
                & (FarmerUserAssignment.user_id == user_id)
                & (FarmerUserAssignment.is_active == 1),
            )

        count_q = select(func.count()).select_from(q.subquery())
        total   = (await self.db.execute(count_q)).scalar_one()

        q = q.offset(params.offset).limit(params.limit)
        rows = (await self.db.execute(q)).all()

        return [r._asdict() for r in rows], total


    async def team_performance(self) -> dict:
        """Aggregate per-rep stats: registrations, review status, readiness bands."""
        from app.models.auth import User

        stmt = (
            select(
                User.id.label("rep_id"),
                User.name.label("rep_name"),
                User.mobile.label("rep_mobile"),
                func.count(Farmer.id).label("total"),
                func.sum(case((Farmer.review_status == "pending_review", 1), else_=0)).label("pending_review"),
                func.sum(case((Farmer.review_status == "approved",       1), else_=0)).label("approved"),
                func.sum(case((Farmer.review_status == "rejected",       1), else_=0)).label("rejected"),
                func.sum(case((Farmer.adoption_score >= 70,              1), else_=0)).label("high"),
                func.sum(case((and_(Farmer.adoption_score >= 40, Farmer.adoption_score < 70), 1), else_=0)).label("medium"),
                func.sum(case((and_(Farmer.adoption_score.isnot(None), Farmer.adoption_score < 40), 1), else_=0)).label("low"),
                func.avg(Farmer.adoption_score).label("avg_score"),
            )
            .join(User, Farmer.registered_by_user_id == User.id)
            .where(Farmer.deleted_at.is_(None), Farmer.is_draft == False)  # noqa: E712
            .group_by(User.id, User.name, User.mobile)
            .order_by(func.count(Farmer.id).desc())
        )

        rows = (await self.db.execute(stmt)).all()
        reps = [dict(r._mapping) for r in rows]

        return {
            "reps":           reps,
            "total_farmers":  sum(r["total"]          for r in reps),
            "total_pending":  sum(r["pending_review"]  for r in reps),
            "total_approved": sum(r["approved"]        for r in reps),
            "total_rejected": sum(r["rejected"]        for r in reps),
        }


    async def top_farmers(self, user_id: int, limit: int = 10) -> dict:
        """
        Return the rep's top-performing farmers ranked by a composite score:
          composite = adoption_score + plan_bonus (completed=30, active=15)
        Only approved registrations are included so the ranking reflects
        confirmed data quality. Plan completion % is joined from plan components.
        """
        from app.models.plan import ConsultingPlan, PlanComponentStatus
        from app.models.geography import District, Village
        from app.models.associations import FarmerCrop
        from app.models.master import Crop

        plan_bonus = case(
            (Farmer.plan_status == "completed", 30),
            (Farmer.plan_status == "active",    15),
            else_=0,
        )
        composite = (func.coalesce(Farmer.adoption_score, 0) + plan_bonus).label("composite_score")

        # Subquery: plan completion % per farmer
        comp_sq = (
            select(
                ConsultingPlan.farmer_id,
                func.round(
                    func.sum(case((PlanComponentStatus.status == "done", 1), else_=0))
                    * 100.0
                    / func.nullif(func.count(PlanComponentStatus.id), 0),
                    1,
                ).label("pct"),
            )
            .join(PlanComponentStatus, PlanComponentStatus.plan_id == ConsultingPlan.id, isouter=True)
            .where(ConsultingPlan.deleted_at.is_(None))
            .group_by(ConsultingPlan.farmer_id)
            .subquery()
        )

        # Primary crop subquery
        crop_sq = (
            select(Crop.name)
            .join(FarmerCrop, FarmerCrop.crop_id == Crop.id)
            .where(FarmerCrop.farmer_id == Farmer.id)
            .limit(1)
            .correlate(Farmer)
            .scalar_subquery()
        )

        stmt = (
            select(
                Farmer.id.label("farmer_id"),
                Farmer.farmer_code,
                Farmer.name.label("farmer_name"),
                Farmer.initials,
                Farmer.avatar_gradient,
                Farmer.adoption_score,
                Farmer.plan_status,
                Farmer.review_status,
                Village.name.label("village_name"),
                District.name.label("district_name"),
                crop_sq.label("primary_crop"),
                comp_sq.c.pct.label("plan_completion_pct"),
                composite,
            )
            .outerjoin(Village,  Farmer.village_id  == Village.id)
            .outerjoin(District, Village.taluka_id  == District.id)   # District via taluka
            .outerjoin(comp_sq,  comp_sq.c.farmer_id == Farmer.id)
            .where(
                Farmer.deleted_at.is_(None),
                Farmer.is_draft == False,              # noqa: E712
                Farmer.review_status == "approved",
                Farmer.registered_by_user_id == user_id,
            )
            .order_by(composite.desc(), Farmer.adoption_score.desc())
            .limit(limit)
        )

        rows  = (await self.db.execute(stmt)).all()
        total = len(rows)
        return {
            "farmers": [dict(r._mapping) for r in rows],
            "total":   total,
        }


def get_report_service(db: AsyncSession = Depends(get_db)) -> ReportService:
    return ReportService(db)
