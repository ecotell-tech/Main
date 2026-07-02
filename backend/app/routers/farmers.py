import time
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import delete as sa_delete, select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import PageParams, page_params
from app.database import get_db
from app.dependencies.auth import get_current_user, require_permission
from app.models.auth import User
from app.models.farmer_photo import FarmerPhoto
from app.schemas.farmer import (
    BulkFarmerCreate,
    BulkImportResponse,
    CropsPayload,
    FarmerCreate,
    FarmerDetail,
    FarmerListResponse,
    FarmerUpdate,
    MobileCheckResponse,
    RejectFarmerPayload,
)
from app.services.farmer_service import FarmerService, get_farmer_service

router = APIRouter()

_SELF_SCOPED_ROLES  = {"agronomist", "data_entry_operator"}
_ALLOWED_MIME       = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
_EXT_MAP            = {"image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp"}
_MIME_FROM_EXT      = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
_MAX_BYTES          = 3 * 1024 * 1024   # 3 MB
_PHOTO_SLOTS        = ["farmer", "land", "well", "soil", "house"]
_PHOTO_CAPTIONS     = {
    "farmer": "Farmer Portrait",
    "land":   "Land / Field",
    "well":   "Well / Borewell",
    "soil":   "Soil Sample",
    "house":  "House / Farm",
}


@router.get("", response_model=FarmerListResponse)
async def list_farmers(
    params:       PageParams    = Depends(page_params),
    search:       Optional[str] = Query(None, description="Search by name or mobile"),
    plan_status:  Optional[str] = Query(None, description="Filter by plan_status"),
    service:      FarmerService = Depends(get_farmer_service),
    current_user: User          = Depends(require_permission("view_farmers")),
):
    own_only = current_user.role.name in _SELF_SCOPED_ROLES
    rows, total = await service.list(
        params, search, plan_status,
        registered_by_user_id=current_user.id if own_only else None,
    )
    return FarmerListResponse(
        farmers=list(rows),
        total=total,
        page=params.page,
        limit=params.limit,
        pages=params.total_pages(total),
    )


@router.get("/check-mobile", response_model=MobileCheckResponse)
async def check_mobile(
    mobile:  str           = Query(..., description="Mobile number to check"),
    service: FarmerService = Depends(get_farmer_service),
    _:       User          = Depends(get_current_user),
):
    return await service.check_mobile(mobile)


@router.get("/drafts", response_model=FarmerListResponse)
async def list_draft_farmers(
    params:       PageParams    = Depends(page_params),
    service:      FarmerService = Depends(get_farmer_service),
    current_user: User          = Depends(require_permission("create_farmer")),
):
    """Return all in-progress wizard drafts belonging to the current user."""
    rows, total = await service.list_drafts(current_user.id, params)
    return FarmerListResponse(
        farmers=list(rows),
        total=total,
        page=params.page,
        limit=params.limit,
        pages=params.total_pages(total),
    )


@router.put("/{farmer_id}/complete", response_model=FarmerDetail)
async def complete_registration(
    farmer_id:    int,
    service:      FarmerService = Depends(get_farmer_service),
    current_user: User          = Depends(require_permission("create_farmer")),
):
    """Mark a draft farmer as fully registered (sets is_draft=False)."""
    return await service.complete_registration(farmer_id, current_user)


@router.put("/{farmer_id}/reject", response_model=FarmerDetail)
async def reject_farmer(
    farmer_id:    int,
    payload:      RejectFarmerPayload,
    service:      FarmerService = Depends(get_farmer_service),
    current_user: User          = Depends(require_permission("approve_plan")),
):
    """Team Lead rejects a farmer registration with an optional reason.
    The representative will see an edit icon and can re-submit after corrections.
    """
    return await service.reject(farmer_id, payload.reason, current_user.id)


@router.post("/bulk", status_code=status.HTTP_200_OK, response_model=BulkImportResponse)
async def bulk_import_farmers(
    payload:      BulkFarmerCreate,
    service:      FarmerService = Depends(get_farmer_service),
    current_user: User          = Depends(require_permission("create_farmer")),
):
    return await service.bulk_import(payload.farmers, current_user.id)


@router.post("/{farmer_id}/photos", status_code=status.HTTP_201_CREATED)
async def upload_farmer_photos(
    farmer_id:    int,
    photo_farmer: Optional[UploadFile] = File(None),
    photo_land:   Optional[UploadFile] = File(None),
    photo_well:   Optional[UploadFile] = File(None),
    photo_soil:   Optional[UploadFile] = File(None),
    photo_house:  Optional[UploadFile] = File(None),
    db:           AsyncSession         = Depends(get_db),
    current_user: User                 = Depends(require_permission("create_farmer")),
):
    """
    Accept up to 5 photos (one per slot) for a farmer.
    Files are stored at uploads/farmer_photos/{YYYY-MM-DD}/{representative_id}/
    so each rep's uploads are isolated by date and identity.
    Uploading a new file for a slot replaces any existing photo for that slot.
    """
    today     = date.today().isoformat()          # e.g. "2026-06-14"
    rep_id    = str(current_user.id)
    upload_dir = Path("uploads") / "farmer_photos" / today / rep_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    uploads = {
        "farmer": photo_farmer,
        "land":   photo_land,
        "well":   photo_well,
        "soil":   photo_soil,
        "house":  photo_house,
    }

    saved       = []
    skipped_mime = []

    # ── Read + validate all files BEFORE touching the DB ──────────────────
    ready = []
    for photo_type, upload in uploads.items():
        if upload is None or not upload.filename:
            continue
        mime = (upload.content_type or "").lower()
        # Fallback: infer MIME from file extension when browser omits content-type
        if mime not in _ALLOWED_MIME:
            ext_guess = Path(upload.filename).suffix.lower().lstrip(".")
            mime = _MIME_FROM_EXT.get(ext_guess, mime)
        if mime not in _ALLOWED_MIME:
            skipped_mime.append(photo_type)
            continue
        content = await upload.read()
        if len(content) > _MAX_BYTES:
            continue
        ext = _EXT_MAP.get(mime, "jpg")
        ready.append((photo_type, content, ext))

    # ── DB + disk writes wrapped in try/except so the session never poisons ─
    try:
        for photo_type, content, ext in ready:
            filename = f"{farmer_id}_{photo_type}.{ext}"
            rel_path = f"farmer_photos/{today}/{rep_id}/{filename}"
            dest     = upload_dir / filename

            old_path = (
                await db.execute(
                    sa_select(FarmerPhoto.file_path)
                    .where(FarmerPhoto.farmer_id == farmer_id)
                    .where(FarmerPhoto.photo_type == photo_type)
                )
            ).scalar_one_or_none()

            await db.execute(
                sa_delete(FarmerPhoto)
                .where(FarmerPhoto.farmer_id == farmer_id)
                .where(FarmerPhoto.photo_type == photo_type)
            )

            # Delete previous file if it lives in a different date/rep folder
            if old_path and old_path != rel_path:
                old_file = Path("uploads") / old_path
                if old_file.exists():
                    old_file.unlink(missing_ok=True)

            dest.write_bytes(content)

            db.add(FarmerPhoto(
                farmer_id  = farmer_id,
                photo_type = photo_type,
                file_path  = rel_path,
                caption    = _PHOTO_CAPTIONS.get(photo_type, photo_type.title()),
            ))
            saved.append(photo_type)

        await db.commit()
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Photo save failed: {exc}",
        ) from exc

    result: dict = {"saved": saved, "farmer_id": farmer_id}
    if skipped_mime:
        result["skipped_unsupported"] = skipped_mime
    return result


@router.get("/{farmer_id}", response_model=FarmerDetail)
async def get_farmer(
    farmer_id: int,
    service:   FarmerService = Depends(get_farmer_service),
    _:         User          = Depends(require_permission("view_farmers")),
):
    return await service.get_or_404(farmer_id)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=FarmerDetail)
async def create_farmer(
    payload:      FarmerCreate,
    service:      FarmerService = Depends(get_farmer_service),
    current_user: User          = Depends(require_permission("create_farmer")),
):
    # Wizard always creates a draft; complete_registration sets is_draft=False on final submit.
    return await service.create(payload, current_user.id, is_draft=True)


@router.put("/{farmer_id}", response_model=FarmerDetail)
async def update_farmer(
    farmer_id: int,
    payload:   FarmerUpdate,
    service:   FarmerService = Depends(get_farmer_service),
    _:         User          = Depends(require_permission("edit_farmer")),
):
    return await service.update(farmer_id, payload)


@router.put("/{farmer_id}/crops", response_model=FarmerDetail)
async def set_crops(
    farmer_id: int,
    payload:   CropsPayload,
    service:   FarmerService = Depends(get_farmer_service),
    _:         User          = Depends(require_permission("edit_farmer")),
):
    """Replace all crops for a farmer (upsert from crop names)."""
    return await service.set_crops(farmer_id, payload.crop_names)


@router.delete("/{farmer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_farmer(
    farmer_id: int,
    service:   FarmerService = Depends(get_farmer_service),
    _:         User          = Depends(require_permission("edit_farmer")),
):
    await service.soft_delete(farmer_id)
