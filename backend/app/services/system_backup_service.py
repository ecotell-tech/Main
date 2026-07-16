from __future__ import annotations

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.system_backup import SystemBackup


class SystemBackupService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_backups(self, limit: int = 50) -> list[SystemBackup]:
        result = await self.db.execute(
            select(SystemBackup).order_by(SystemBackup.started_at.desc()).limit(limit)
        )
        return list(result.scalars().all())


def get_system_backup_service(db: AsyncSession = Depends(get_db)) -> SystemBackupService:
    return SystemBackupService(db)
