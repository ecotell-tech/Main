"""Dashboard router — real KPI aggregation."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_user
from app.models.auth import User
from app.schemas.dashboard import (
    ActivityEntry, ComponentSummaryItem, CrossRoleActivity,
    DashboardStats, LeadershipStats, RepPerformanceStat,
)
from app.services.dashboard_service import DashboardService, get_dashboard_service

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    current_user: User = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
):
    return await service.get_stats(current_user.id)


@router.get("/plan-components", response_model=list[ComponentSummaryItem])
async def get_plan_components(
    current_user: User = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
):
    return await service.get_plan_component_summary(current_user.id)


@router.get("/activity", response_model=list[ActivityEntry])
async def get_activity(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
):
    return await service.get_activity(current_user.id, limit=limit)


@router.get("/leadership", response_model=LeadershipStats)
async def get_leadership_stats(
    _: User = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
):
    return await service.get_leadership_stats()


@router.get("/rep-performance", response_model=list[RepPerformanceStat])
async def get_rep_performance(
    _: User = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
):
    return await service.get_rep_performance()


@router.get("/all-activity", response_model=list[CrossRoleActivity])
async def get_all_activity(
    limit: int = 50,
    _: User = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
):
    return await service.get_all_activity(limit=limit)
