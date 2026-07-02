"""Geography service — cascading dropdown queries."""
from __future__ import annotations

from typing import Optional

from fastapi import Depends

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import not_found
from app.database import get_db
from app.models.geography import District, State, Taluka, Village


class GeographyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_states(self) -> list[State]:
        result = await self.db.execute(select(State).order_by(State.name))
        return list(result.scalars().all())

    async def get_districts(self, state_id: Optional[int] = None) -> list[District]:
        q = select(District).order_by(District.name)
        if state_id:
            q = q.where(District.state_id == state_id)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_talukas(self, district_id: Optional[int] = None) -> list[Taluka]:
        q = select(Taluka).order_by(Taluka.name)
        if district_id:
            q = q.where(Taluka.district_id == district_id)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_villages(self, taluka_id: Optional[int] = None) -> list[Village]:
        q = select(Village).order_by(Village.name)
        if taluka_id:
            q = q.where(Village.taluka_id == taluka_id)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def create_state(self, name: str, code: str | None) -> State:
        obj = State(name=name.strip(), code=code.strip().upper() if code else None)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def create_district(self, state_id: int, name: str) -> District:
        obj = District(state_id=state_id, name=name.strip())
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def create_taluka(self, district_id: int, name: str) -> Taluka:
        obj = Taluka(district_id=district_id, name=name.strip())
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def create_village(self, taluka_id: int, name: str, pin_code: str | None) -> Village:
        obj = Village(taluka_id=taluka_id, name=name.strip(), pin_code=pin_code)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def get_village_context(self, village_id: int) -> dict:
        """Return full hierarchy for a village: village → taluka → district → state."""
        from sqlalchemy import literal_column
        q = (
            select(
                Village.id.label("village_id"),
                Village.name.label("village_name"),
                Village.pin_code,
                Taluka.id.label("taluka_id"),
                Taluka.name.label("taluka_name"),
                District.id.label("district_id"),
                District.name.label("district_name"),
                State.id.label("state_id"),
                State.name.label("state_name"),
            )
            .join(Taluka,   Taluka.id   == Village.taluka_id)
            .join(District, District.id == Taluka.district_id)
            .join(State,    State.id    == District.state_id)
            .where(Village.id == village_id)
        )
        result = await self.db.execute(q)
        row = result.mappings().first()
        if row is None:
            raise not_found(f"Village {village_id} not found")
        return dict(row)


def get_geography_service(db: AsyncSession = Depends(get_db)) -> GeographyService:
    return GeographyService(db)
