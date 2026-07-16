"""Master-data service — crops, challenges, govt schemes, inputs, irrigation types."""
from __future__ import annotations

from fastapi import Depends

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import conflict, not_found
from app.database import get_db
from app.models.associations import FarmerCrop
from app.models.master import (
    Challenge, Crop, GovtScheme, Input, IrrigationInfrastructureType,
)
from app.schemas.master import CropCreate, CropOut, CropUpdate


class MasterService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_crops(self) -> list[CropOut]:
        result = await self.db.execute(
            select(Crop, func.count(func.distinct(FarmerCrop.farmer_id)).label("farms_count"))
            .outerjoin(FarmerCrop, FarmerCrop.crop_id == Crop.id)
            .group_by(Crop.id)
            .order_by(Crop.name)
        )
        return [
            CropOut(
                id=crop.id, name=crop.name, category=crop.category,
                season=crop.season, is_active=crop.is_active, farms_count=farms_count,
            )
            for crop, farms_count in result.all()
        ]

    async def create_crop(self, body: CropCreate) -> CropOut:
        existing = (
            await self.db.execute(select(Crop).where(Crop.name == body.name.strip()))
        ).scalar_one_or_none()
        if existing:
            raise conflict(f"Crop '{body.name}' already exists")

        crop = Crop(name=body.name.strip(), category=body.category, season=body.season)
        self.db.add(crop)
        await self.db.commit()
        await self.db.refresh(crop)
        return CropOut(
            id=crop.id, name=crop.name, category=crop.category,
            season=crop.season, is_active=crop.is_active, farms_count=0,
        )

    async def update_crop(self, crop_id: int, body: CropUpdate) -> CropOut:
        crop = (
            await self.db.execute(select(Crop).where(Crop.id == crop_id))
        ).scalar_one_or_none()
        if crop is None:
            raise not_found("Crop not found")

        for field, value in body.model_dump(exclude_unset=True).items():
            setattr(crop, field, value)
        await self.db.commit()
        await self.db.refresh(crop)

        farms_count = (
            await self.db.execute(
                select(func.count(func.distinct(FarmerCrop.farmer_id)))
                .where(FarmerCrop.crop_id == crop.id)
            )
        ).scalar_one()
        return CropOut(
            id=crop.id, name=crop.name, category=crop.category,
            season=crop.season, is_active=crop.is_active, farms_count=farms_count,
        )

    async def get_challenges(self) -> list[Challenge]:
        result = await self.db.execute(select(Challenge).order_by(Challenge.name))
        return list(result.scalars().all())

    async def get_schemes(self) -> list[GovtScheme]:
        result = await self.db.execute(select(GovtScheme).order_by(GovtScheme.name))
        return list(result.scalars().all())

    async def get_inputs(self) -> list[Input]:
        result = await self.db.execute(select(Input).order_by(Input.name))
        return list(result.scalars().all())

    async def get_irrigation_types(self) -> list[IrrigationInfrastructureType]:
        result = await self.db.execute(
            select(IrrigationInfrastructureType).order_by(IrrigationInfrastructureType.name)
        )
        return list(result.scalars().all())


def get_master_service(db: AsyncSession = Depends(get_db)) -> MasterService:
    return MasterService(db)
