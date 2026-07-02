"""Master-data service — crops, challenges, govt schemes, inputs, irrigation types."""
from __future__ import annotations

from fastapi import Depends

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.master import (
    Challenge, Crop, GovtScheme, Input, IrrigationInfrastructureType,
)


class MasterService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_crops(self) -> list[Crop]:
        result = await self.db.execute(select(Crop).order_by(Crop.name))
        return list(result.scalars().all())

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
