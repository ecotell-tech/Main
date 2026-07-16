from __future__ import annotations

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import bad_request
from app.database import get_db
from app.models.scoring_factor import ScoringFactor
from app.schemas.scoring_factor import ScoringFactorsUpdate


class ScoringFactorService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_factors(self) -> list[ScoringFactor]:
        result = await self.db.execute(
            select(ScoringFactor)
            .options(selectinload(ScoringFactor.options))
            .order_by(ScoringFactor.id)
        )
        return list(result.scalars().all())

    async def update_weights(self, body: ScoringFactorsUpdate) -> list[ScoringFactor]:
        total = sum(f.weight for f in body.factors)
        if total != 100:
            raise bad_request(f"Weights must total exactly 100% (got {total}%)")

        for item in body.factors:
            factor = await self.db.get(ScoringFactor, item.id)
            if factor is None:
                raise bad_request(f"Unknown scoring factor id {item.id}")
            factor.weight = item.weight

        await self.db.commit()
        return await self.get_factors()


def get_scoring_factor_service(db: AsyncSession = Depends(get_db)) -> ScoringFactorService:
    return ScoringFactorService(db)
