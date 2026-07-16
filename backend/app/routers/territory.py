from fastapi import APIRouter, Depends

from app.dependencies.auth import require_permission
from app.models.auth import User
from app.schemas.territory import AssignDistrictRequest, TerritoryAssignmentOut, UnassignDistrictRequest
from app.services.territory_service import TerritoryService, get_territory_service

router = APIRouter()


@router.get("", response_model=list[TerritoryAssignmentOut])
async def list_assignments(
    service:      TerritoryService = Depends(get_territory_service),
    current_user: User             = Depends(require_permission("manage_users")),
):
    return await service.get_active_assignments()


@router.post("", response_model=TerritoryAssignmentOut)
async def assign_district(
    body:         AssignDistrictRequest,
    service:      TerritoryService = Depends(get_territory_service),
    current_user: User             = Depends(require_permission("manage_users")),
):
    return await service.assign_district(body.district_id, body.user_id, current_user.id)


@router.post("/unassign", status_code=204)
async def unassign_district(
    body:         UnassignDistrictRequest,
    service:      TerritoryService = Depends(get_territory_service),
    current_user: User             = Depends(require_permission("manage_users")),
):
    await service.unassign_district(body.district_id)
