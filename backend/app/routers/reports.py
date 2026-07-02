"""Reports router — plan completion + adoption score reports."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.core.pagination import PageParams, page_params
from app.dependencies.auth import get_current_user, require_permission
from app.models.auth import User
from app.schemas.report import AdoptionScoreResponse, PlanCompletionResponse, TeamPerformanceResponse, TopFarmersResponse
from app.services.report_service import ReportService, get_report_service

router = APIRouter()


@router.get("/plan-completion", response_model=PlanCompletionResponse)
async def plan_completion_report(
    params: PageParams = Depends(page_params),
    current_user: User = Depends(require_permission("view_reports")),
    service: ReportService = Depends(get_report_service),
):
    rows, total = await service.plan_completion(params, user_id=current_user.id)
    return {
        "rows":  rows,
        "total": total,
        "page":  params.page,
        "limit": params.limit,
        "pages": params.total_pages(total),
    }


@router.get("/team-performance", response_model=TeamPerformanceResponse)
async def team_performance_report(
    service:      ReportService = Depends(get_report_service),
    _:            User          = Depends(require_permission("view_reports")),
):
    return await service.team_performance()


@router.get("/top-farmers", response_model=TopFarmersResponse)
async def top_farmers_report(
    limit:        int          = Query(10, ge=1, le=50),
    service:      ReportService = Depends(get_report_service),
    current_user: User          = Depends(require_permission("view_reports")),
):
    """Top-performing farmers for the logged-in representative.
    Ranked by composite score (adoption_score + plan completion bonus).
    Only approved registrations are returned.
    """
    return await service.top_farmers(current_user.id, limit=limit)


@router.get("/adoption-scores", response_model=AdoptionScoreResponse)
async def adoption_score_report(
    params: PageParams = Depends(page_params),
    current_user: User = Depends(require_permission("view_reports")),
    service: ReportService = Depends(get_report_service),
):
    rows, total = await service.adoption_scores(params, user_id=current_user.id)
    return {
        "rows":  rows,
        "total": total,
        "page":  params.page,
        "limit": params.limit,
        "pages": params.total_pages(total),
    }
