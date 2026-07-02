"""Consulting plans router."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends

from app.core.pagination import PageParams, page_params
from app.dependencies.auth import get_current_user, require_permission
from app.models.auth import User
from app.schemas.plan import (
    ComponentStatusOut, ComponentStatusUpdate,
    PlanCreate, PlanDetail, PlanListResponse, PlanUpdate,
)
from app.services.plan_service import PlanService, get_plan_service

router = APIRouter()


def _comp_out(comp) -> dict:
    return {
        "id":                comp.id,
        "component_type_id": comp.component_type_id,
        "component_code":    comp.component_type.code  if comp.component_type else None,
        "component_label":   comp.component_type.label if comp.component_type else None,
        "status":            comp.status,
        "completed_at":      comp.completed_at,
        "notes":             comp.notes,
    }


def _summarise(plan) -> dict:
    return {
        "id":             plan.id,
        "plan_code":      plan.plan_code,
        "farmer_id":      plan.farmer_id,
        "farmer_name":    plan.farmer.name if plan.farmer else None,
        "status":         plan.status,
        "overall_status": plan.overall_status,
        "start_date":     plan.start_date,
        "end_date":       plan.end_date,
        "created_at":     plan.created_at,
    }


def _detail(plan) -> dict:
    d = _summarise(plan)
    d.update(
        {
            "consultant_user_id":  plan.consultant_user_id,
            "created_by_user_id":  plan.created_by_user_id,
            "approved_by_user_id": plan.approved_by_user_id,
            "notes":               plan.notes,
            "components":          [_comp_out(c) for c in (plan.components or [])],
        }
    )
    return d


@router.get("", response_model=PlanListResponse)
async def list_plans(
    params: PageParams = Depends(page_params),
    farmer_id: Optional[int] = None,
    status:    Optional[str] = None,
    current_user: User = Depends(require_permission("view_plans")),
    service: PlanService = Depends(get_plan_service),
):
    rows, total = await service.list(
        params, user_id=current_user.id, farmer_id=farmer_id, status=status
    )
    return {
        "plans": [_summarise(p) for p in rows],
        "total": total,
        "page":  params.page,
        "limit": params.limit,
        "pages": params.total_pages(total),
    }


@router.get("/{plan_id}", response_model=PlanDetail)
async def get_plan(
    plan_id: int,
    _: User = Depends(require_permission("view_plans")),
    service: PlanService = Depends(get_plan_service),
):
    plan = await service.get_or_404(plan_id)
    return _detail(plan)


@router.post("", response_model=PlanDetail, status_code=201)
async def create_plan(
    body: PlanCreate,
    current_user: User = Depends(require_permission("create_plan")),
    service: PlanService = Depends(get_plan_service),
):
    plan = await service.create(body.model_dump(exclude_none=True), created_by_user_id=current_user.id)
    return _detail(plan)


@router.put("/{plan_id}", response_model=PlanDetail)
async def update_plan(
    plan_id: int,
    body: PlanUpdate,
    _: User = Depends(require_permission("create_plan")),
    service: PlanService = Depends(get_plan_service),
):
    plan = await service.update(plan_id, body.model_dump(exclude_none=True))
    return _detail(plan)


@router.put("/{plan_id}/components/{component_type_id}", response_model=ComponentStatusOut)
async def update_plan_component(
    plan_id: int,
    component_type_id: int,
    body: ComponentStatusUpdate,
    _: User = Depends(require_permission("create_plan")),
    service: PlanService = Depends(get_plan_service),
):
    comp = await service.update_component(plan_id, component_type_id, body.status, body.notes)
    return _comp_out(comp)
