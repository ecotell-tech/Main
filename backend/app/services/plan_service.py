"""Consulting plan service — business logic + repository."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import Depends

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.crud import BaseRepository
from app.core.exceptions import not_found
from app.core.pagination import PageParams
from app.database import get_db
from app.models.plan import ConsultingPlan, PlanComponentStatus, PlanComponentType


class PlanRepository(BaseRepository[ConsultingPlan]):

    def _base_q(self):
        return select(ConsultingPlan).where(ConsultingPlan.deleted_at.is_(None))

    async def list_filtered(
        self,
        params: PageParams,
        user_id: Optional[int] = None,
        farmer_id: Optional[int] = None,
        status: Optional[str] = None,
    ):
        q = (
            self._base_q()
            .options(selectinload(ConsultingPlan.farmer))
            .order_by(ConsultingPlan.created_at.desc())
        )
        if user_id:
            q = q.where(ConsultingPlan.consultant_user_id == user_id)
        if farmer_id:
            q = q.where(ConsultingPlan.farmer_id == farmer_id)
        if status:
            q = q.where(ConsultingPlan.status == status)
        return await self.paginate(q, params)

    async def get_with_relations(self, plan_id: int) -> Optional[ConsultingPlan]:
        result = await self.db.execute(
            self._base_q()
            .options(
                selectinload(ConsultingPlan.farmer),
                selectinload(ConsultingPlan.components).selectinload(
                    PlanComponentStatus.component_type
                ),
            )
            .where(ConsultingPlan.id == plan_id)
        )
        return result.scalar_one_or_none()

    async def get_next_code(self) -> str:
        year = datetime.now().year
        from sqlalchemy import func
        total = (
            await self.db.execute(select(func.count(ConsultingPlan.id)))
        ).scalar_one()
        return f"PLN-{year}-{total + 1:05d}"


class PlanService:
    def __init__(self, db: AsyncSession):
        self.db   = db
        self.repo = PlanRepository(db, ConsultingPlan)

    async def list(
        self,
        params: PageParams,
        user_id: Optional[int] = None,
        farmer_id: Optional[int] = None,
        status: Optional[str] = None,
    ):
        return await self.repo.list_filtered(params, user_id, farmer_id, status)

    async def get_or_404(self, plan_id: int) -> ConsultingPlan:
        obj = await self.repo.get_with_relations(plan_id)
        if not obj:
            raise not_found(f"Plan {plan_id} not found")
        return obj

    async def create(self, data: dict, created_by_user_id: int) -> ConsultingPlan:
        component_type_ids = data.pop("component_type_ids", None)
        code = await self.repo.get_next_code()
        plan = await self.repo.create(
            plan_code=code,
            created_by_user_id=created_by_user_id,
            overall_status="plan_created",
            **data,
        )
        await self.db.flush()

        # Seed component rows
        if component_type_ids:
            types_result = await self.db.execute(
                select(PlanComponentType).where(
                    PlanComponentType.id.in_(component_type_ids)
                )
            )
            for pct in types_result.scalars().all():
                comp = PlanComponentStatus(plan_id=plan.id, component_type_id=pct.id)
                self.db.add(comp)
        else:
            # Default: add all active component types
            all_types = await self.db.execute(
                select(PlanComponentType).where(PlanComponentType.is_active == 1)
            )
            for pct in all_types.scalars().all():
                comp = PlanComponentStatus(plan_id=plan.id, component_type_id=pct.id)
                self.db.add(comp)

        await self.db.commit()
        await self.db.refresh(plan)
        return await self.repo.get_with_relations(plan.id)

    async def update(self, plan_id: int, data: dict) -> ConsultingPlan:
        plan = await self.repo.get_or_404(plan_id, "Plan")
        updates = {k: v for k, v in data.items() if v is not None}
        await self.repo.update(plan, **updates)
        return await self.repo.get_with_relations(plan_id)

    async def update_component(
        self, plan_id: int, component_type_id: int, status: str, notes: Optional[str]
    ) -> PlanComponentStatus:
        result = await self.db.execute(
            select(PlanComponentStatus).where(
                PlanComponentStatus.plan_id == plan_id,
                PlanComponentStatus.component_type_id == component_type_id,
            )
        )
        comp = result.scalar_one_or_none()
        if not comp:
            raise not_found(f"Component {component_type_id} not found in plan {plan_id}")

        comp.status = status
        if notes is not None:
            comp.notes = notes
        if status == "done":
            comp.completed_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(comp)
        return comp

    async def soft_delete(self, plan_id: int) -> None:
        plan = await self.repo.get_or_404(plan_id, "Plan")
        await self.repo.soft_delete(plan)


def get_plan_service(db: AsyncSession = Depends(get_db)) -> PlanService:
    return PlanService(db)
