"""
Generic async repository base.

Subclass it for each model to get CRUD + pagination for free:

    class FarmerRepository(BaseRepository[Farmer]):
        def __init__(self, db: AsyncSession) -> None:
            super().__init__(Farmer, db)
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, Optional, Sequence, Type, TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import not_found
from app.core.pagination import PageParams

T = TypeVar("T")


class BaseRepository(Generic[T]):
    """Async SQLAlchemy repository with soft-delete awareness."""

    def __init__(self, model: Type[T], db: AsyncSession) -> None:
        self.model = model
        self.db = db

    # ── Base query (auto-excludes soft-deleted rows) ──────────

    def _base_q(self) -> Select:
        q = select(self.model)
        if hasattr(self.model, "deleted_at"):
            q = q.where(self.model.deleted_at.is_(None))
        return q

    # ── Reads ─────────────────────────────────────────────────

    async def get(self, id: int) -> Optional[T]:
        return (
            await self.db.execute(self._base_q().where(self.model.id == id))
        ).scalar_one_or_none()

    async def get_or_404(self, id: int, resource: str = "Record") -> T:
        obj = await self.get(id)
        if obj is None:
            raise not_found(f"{resource} not found")
        return obj

    async def paginate(
        self,
        query: Select,
        params: PageParams,
    ) -> tuple[Sequence[T], int]:
        """Return (rows, total_count) for the given query + page params."""
        total: int = (
            await self.db.execute(select(func.count()).select_from(query.subquery()))
        ).scalar_one()
        rows: Sequence[T] = (
            await self.db.execute(query.offset(params.offset).limit(params.limit))
        ).scalars().all()
        return rows, total

    # ── Writes ────────────────────────────────────────────────

    async def create(self, **data: Any) -> T:
        """Insert a new row and flush to get the auto-generated id.
        Caller is responsible for commit() + refresh()."""
        obj = self.model(**data)
        self.db.add(obj)
        await self.db.flush()
        return obj

    async def save(self, obj: T) -> T:
        """Commit and refresh an already-modified object."""
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def update(self, obj: T, **data: Any) -> T:
        for key, value in data.items():
            setattr(obj, key, value)
        return await self.save(obj)

    async def soft_delete(self, obj: T) -> None:
        if not hasattr(obj, "deleted_at"):
            raise AttributeError(
                f"{self.model.__name__} does not support soft-delete"
            )
        obj.deleted_at = datetime.utcnow()  # type: ignore[attr-defined]
        await self.db.commit()
