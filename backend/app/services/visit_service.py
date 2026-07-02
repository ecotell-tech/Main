"""Visit service — business logic + repository."""
from __future__ import annotations

from datetime import date
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from fastapi import Depends

from app.core.crud import BaseRepository
from app.core.exceptions import not_found
from app.core.pagination import PageParams
from app.database import get_db
from app.models.farmer import Farmer
from app.models.visit import Visit, VisitType


class VisitRepository(BaseRepository[Visit]):

    async def list_filtered(
        self,
        params: PageParams,
        user_id: Optional[int] = None,
        farmer_id: Optional[int] = None,
        status: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ):
        q = (
            select(Visit)
            .options(
                selectinload(Visit.farmer),
                selectinload(Visit.visit_type),
            )
        )
        if user_id:
            q = q.where(Visit.conducted_by_user_id == user_id)
        if farmer_id:
            q = q.where(Visit.farmer_id == farmer_id)
        if status:
            q = q.where(Visit.status == status)
        if from_date:
            q = q.where(Visit.scheduled_date >= from_date)
        if to_date:
            q = q.where(Visit.scheduled_date <= to_date)
        q = q.order_by(Visit.created_at.desc())
        return await self.paginate(q, params)

    async def get_with_relations(self, visit_id: int) -> Optional[Visit]:
        result = await self.db.execute(
            select(Visit)
            .options(
                selectinload(Visit.farmer),
                selectinload(Visit.conducted_by),
                selectinload(Visit.visit_type),
            )
            .where(Visit.id == visit_id)
        )
        return result.scalar_one_or_none()

    async def get_next_code(self) -> str:
        from datetime import datetime
        year = datetime.now().year
        from sqlalchemy import func
        total = (await self.db.execute(select(func.count(Visit.id)))).scalar_one()
        return f"VIS-{year}-{total + 1:05d}"


class VisitService:
    def __init__(self, db: AsyncSession):
        self.db   = db
        self.repo = VisitRepository(Visit, db)

    async def list(
        self,
        params: PageParams,
        user_id: Optional[int] = None,
        farmer_id: Optional[int] = None,
        status: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ):
        return await self.repo.list_filtered(
            params, user_id=user_id, farmer_id=farmer_id,
            status=status, from_date=from_date, to_date=to_date,
        )

    async def get_or_404(self, visit_id: int) -> Visit:
        obj = await self.repo.get_with_relations(visit_id)
        if not obj:
            raise not_found(f"Visit {visit_id} not found")
        return obj

    async def get_types(self) -> list[VisitType]:
        result = await self.db.execute(select(VisitType).order_by(VisitType.name))
        return list(result.scalars().all())

    async def create(self, data: dict, conducted_by_user_id: int) -> Visit:
        code = await self.repo.get_next_code()
        visit = await self.repo.create(
            visit_code=code,
            conducted_by_user_id=conducted_by_user_id,
            **data,
        )
        await self.repo.save(visit)
        return await self.repo.get_with_relations(visit.id)  # reload with joins

    async def update(self, visit_id: int, data: dict) -> Visit:
        visit = await self.repo.get_or_404(visit_id, "Visit")
        updates = {k: v for k, v in data.items() if v is not None}

        # When marking completed — update farmer.last_visit_date
        if updates.get("status") == "completed" and updates.get("visited_date"):
            farmer_result = await self.db.execute(
                select(Farmer).where(Farmer.id == visit.farmer_id)
            )
            farmer = farmer_result.scalar_one_or_none()
            if farmer:
                farmer.last_visit_date = updates["visited_date"]

        await self.repo.update(visit, **updates)
        return await self.repo.get_with_relations(visit_id)


def get_visit_service(db: AsyncSession = Depends(get_db)) -> VisitService:
    return VisitService(db)
