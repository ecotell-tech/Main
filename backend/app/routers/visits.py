"""Visit router — field-visit CRUD for agronomists / DEOs."""
from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends

from app.core.pagination import PageParams, page_params
from app.dependencies.auth import get_current_user, require_permission
from app.models.auth import User
from app.schemas.visit import (
    VisitCreate, VisitDetail, VisitListResponse,
    VisitTypeOut, VisitUpdate,
)
from app.services.visit_service import VisitService, get_visit_service

router = APIRouter()


def _summarise(visit) -> dict:
    return {
        "id":              visit.id,
        "visit_code":      visit.visit_code,
        "farmer_id":       visit.farmer_id,
        "farmer_name":     visit.farmer.name if visit.farmer else None,
        "visit_type_id":   visit.visit_type_id,
        "visit_type_name": visit.visit_type.name if visit.visit_type else None,
        "status":          visit.status,
        "scheduled_date":  visit.scheduled_date,
        "visited_date":    visit.visited_date,
        "location":        visit.location,
        "created_at":      visit.created_at,
    }


def _detail(visit) -> dict:
    d = _summarise(visit)
    d.update(
        {
            "conducted_by_user_id": visit.conducted_by_user_id,
            "conducted_by_name":    visit.conducted_by.name if visit.conducted_by else None,
            "related_plan_id":      visit.related_plan_id,
            "notes":                visit.notes,
        }
    )
    return d


# ── Master ──────────────────────────────────────────────────────────────────

@router.get("/types", response_model=list[VisitTypeOut])
async def get_visit_types(
    _: User = Depends(get_current_user),
    service: VisitService = Depends(get_visit_service),
):
    """Return the master list of visit categories."""
    return await service.get_types()


# ── CRUD ────────────────────────────────────────────────────────────────────

@router.get("", response_model=VisitListResponse)
async def list_visits(
    params: PageParams = Depends(page_params),
    farmer_id:  Optional[int]  = None,
    status:     Optional[str]  = None,
    from_date:  Optional[date] = None,
    to_date:    Optional[date] = None,
    current_user: User = Depends(require_permission("view_visits")),
    service: VisitService = Depends(get_visit_service),
):
    rows, total = await service.list(
        params,
        user_id=current_user.id,
        farmer_id=farmer_id,
        status=status,
        from_date=from_date,
        to_date=to_date,
    )
    return {
        "visits": [_summarise(v) for v in rows],
        "total":  total,
        "page":   params.page,
        "limit":  params.limit,
        "pages":  params.total_pages(total),
    }


@router.get("/{visit_id}", response_model=VisitDetail)
async def get_visit(
    visit_id: int,
    _: User = Depends(require_permission("view_visits")),
    service: VisitService = Depends(get_visit_service),
):
    visit = await service.get_or_404(visit_id)
    return _detail(visit)


@router.post("", response_model=VisitDetail, status_code=201)
async def create_visit(
    body: VisitCreate,
    current_user: User = Depends(require_permission("create_visit")),
    service: VisitService = Depends(get_visit_service),
):
    visit = await service.create(
        body.model_dump(exclude_none=True),
        conducted_by_user_id=current_user.id,
    )
    return _detail(visit)


@router.put("/{visit_id}", response_model=VisitDetail)
async def update_visit(
    visit_id: int,
    body: VisitUpdate,
    _: User = Depends(require_permission("create_visit")),
    service: VisitService = Depends(get_visit_service),
):
    visit = await service.update(visit_id, body.model_dump(exclude_none=True))
    return _detail(visit)
