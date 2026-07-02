"""Geography router — cascading dropdown data + create endpoints."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_user, require_permission
from app.models.auth import User
from app.schemas.geography import (
    StateCreate, StateOut,
    DistrictCreate, DistrictOut,
    TalukaCreate, TalukaOut,
    VillageCreate, VillageContextOut, VillageOut,
)
from app.services.geography_service import GeographyService, get_geography_service

router = APIRouter()


@router.get("/states", response_model=list[StateOut])
async def get_states(
    _: User = Depends(get_current_user),
    service: GeographyService = Depends(get_geography_service),
):
    return await service.get_states()


@router.get("/districts", response_model=list[DistrictOut])
async def get_districts(
    state_id: Optional[int] = None,
    _: User = Depends(get_current_user),
    service: GeographyService = Depends(get_geography_service),
):
    return await service.get_districts(state_id)


@router.get("/talukas", response_model=list[TalukaOut])
async def get_talukas(
    district_id: Optional[int] = None,
    _: User = Depends(get_current_user),
    service: GeographyService = Depends(get_geography_service),
):
    return await service.get_talukas(district_id)


@router.get("/villages", response_model=list[VillageOut])
async def get_villages(
    taluka_id: Optional[int] = None,
    _: User = Depends(get_current_user),
    service: GeographyService = Depends(get_geography_service),
):
    return await service.get_villages(taluka_id)


@router.post("/states", response_model=StateOut, status_code=201)
async def create_state(
    body: StateCreate,
    _: User = Depends(require_permission("manage_roles")),
    service: GeographyService = Depends(get_geography_service),
):
    return await service.create_state(body.name, body.code)


@router.post("/districts", response_model=DistrictOut, status_code=201)
async def create_district(
    body: DistrictCreate,
    _: User = Depends(require_permission("manage_roles")),
    service: GeographyService = Depends(get_geography_service),
):
    return await service.create_district(body.state_id, body.name)


@router.post("/talukas", response_model=TalukaOut, status_code=201)
async def create_taluka(
    body: TalukaCreate,
    _: User = Depends(require_permission("manage_roles")),
    service: GeographyService = Depends(get_geography_service),
):
    return await service.create_taluka(body.district_id, body.name)


@router.post("/villages", response_model=VillageOut, status_code=201)
async def create_village(
    body: VillageCreate,
    _: User = Depends(require_permission("manage_roles")),
    service: GeographyService = Depends(get_geography_service),
):
    return await service.create_village(body.taluka_id, body.name, body.pin_code)


@router.get("/village/{village_id}", response_model=VillageContextOut)
async def get_village_context(
    village_id: int,
    _: User = Depends(get_current_user),
    service: GeographyService = Depends(get_geography_service),
):
    """Return full geographic hierarchy for a single village (used by resume-draft feature)."""
    return await service.get_village_context(village_id)
