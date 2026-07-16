from __future__ import annotations

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import not_found
from app.database import get_db
from app.models.auth import User
from app.models.geography import District
from app.models.territory import Territory, UserTerritoryAssignment
from app.schemas.territory import TerritoryAssignmentOut


class TerritoryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_active_assignments(self) -> list[TerritoryAssignmentOut]:
        rows = (
            await self.db.execute(
                select(
                    Territory.district_id, District.name.label("district_name"),
                    Territory.state_id, UserTerritoryAssignment.user_id, User.name.label("user_name"),
                )
                .join(UserTerritoryAssignment, UserTerritoryAssignment.territory_id == Territory.id)
                .join(User, User.id == UserTerritoryAssignment.user_id)
                .join(District, District.id == Territory.district_id)
                .where(UserTerritoryAssignment.is_active == 1)
            )
        ).all()
        return [TerritoryAssignmentOut.model_validate(dict(r._mapping)) for r in rows]

    async def _get_or_create_territory(self, district_id: int) -> Territory:
        existing = (
            await self.db.execute(select(Territory).where(Territory.district_id == district_id))
        ).scalar_one_or_none()
        if existing:
            return existing

        district = await self.db.get(District, district_id)
        if district is None:
            raise not_found("District not found")

        territory = Territory(name=district.name, state_id=district.state_id, district_id=district_id)
        self.db.add(territory)
        await self.db.flush()
        return territory

    async def assign_district(self, district_id: int, user_id: int, assigned_by_user_id: int) -> TerritoryAssignmentOut:
        user = await self.db.get(User, user_id)
        if user is None:
            raise not_found("Representative not found")

        territory = await self._get_or_create_territory(district_id)

        existing_rows = (
            await self.db.execute(
                select(UserTerritoryAssignment).where(
                    UserTerritoryAssignment.territory_id == territory.id,
                    UserTerritoryAssignment.is_active == 1,
                )
            )
        ).scalars().all()
        for row in existing_rows:
            row.is_active = 0

        same_pair = (
            await self.db.execute(
                select(UserTerritoryAssignment).where(
                    UserTerritoryAssignment.territory_id == territory.id,
                    UserTerritoryAssignment.user_id == user_id,
                )
            )
        ).scalar_one_or_none()
        if same_pair:
            same_pair.is_active = 1
            same_pair.assigned_by_user_id = assigned_by_user_id
        else:
            self.db.add(UserTerritoryAssignment(
                territory_id=territory.id, user_id=user_id,
                assigned_by_user_id=assigned_by_user_id, is_active=1,
            ))

        await self.db.commit()
        return TerritoryAssignmentOut(
            district_id=district_id, district_name=territory.name,
            state_id=territory.state_id, user_id=user_id, user_name=user.name,
        )

    async def unassign_district(self, district_id: int) -> None:
        territory = (
            await self.db.execute(select(Territory).where(Territory.district_id == district_id))
        ).scalar_one_or_none()
        if territory is None:
            return
        rows = (
            await self.db.execute(
                select(UserTerritoryAssignment).where(
                    UserTerritoryAssignment.territory_id == territory.id,
                    UserTerritoryAssignment.is_active == 1,
                )
            )
        ).scalars().all()
        for row in rows:
            row.is_active = 0
        await self.db.commit()


def get_territory_service(db: AsyncSession = Depends(get_db)) -> TerritoryService:
    return TerritoryService(db)
