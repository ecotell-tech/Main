"""Master-data router — reference lists for dropdowns."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_user, require_permission
from app.models.auth import User
from app.schemas.master import (
    ChallengeOut, CropCreate, CropOut, CropUpdate, GovtSchemeOut, InputOut, IrrigationTypeOut,
)
from app.services.master_service import MasterService, get_master_service

router = APIRouter()


@router.get("/crops", response_model=list[CropOut])
async def get_crops(
    _: User = Depends(get_current_user),
    service: MasterService = Depends(get_master_service),
):
    return await service.get_crops()


@router.post("/crops", status_code=201, response_model=CropOut)
async def create_crop(
    body: CropCreate,
    _: User = Depends(require_permission("manage_master_data")),
    service: MasterService = Depends(get_master_service),
):
    return await service.create_crop(body)


@router.put("/crops/{crop_id}", response_model=CropOut)
async def update_crop(
    crop_id: int,
    body: CropUpdate,
    _: User = Depends(require_permission("manage_master_data")),
    service: MasterService = Depends(get_master_service),
):
    return await service.update_crop(crop_id, body)


@router.get("/challenges", response_model=list[ChallengeOut])
async def get_challenges(
    _: User = Depends(get_current_user),
    service: MasterService = Depends(get_master_service),
):
    return await service.get_challenges()


@router.get("/schemes", response_model=list[GovtSchemeOut])
async def get_schemes(
    _: User = Depends(get_current_user),
    service: MasterService = Depends(get_master_service),
):
    return await service.get_schemes()


@router.get("/inputs", response_model=list[InputOut])
async def get_inputs(
    _: User = Depends(get_current_user),
    service: MasterService = Depends(get_master_service),
):
    return await service.get_inputs()


@router.get("/irrigation-types", response_model=list[IrrigationTypeOut])
async def get_irrigation_types(
    _: User = Depends(get_current_user),
    service: MasterService = Depends(get_master_service),
):
    return await service.get_irrigation_types()
