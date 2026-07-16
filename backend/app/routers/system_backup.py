"""Backup run history — read-only. No backup automation exists yet in this
project (no scheduled job populates system_backups), so this will return an
empty list until a real backup process is wired up to write rows here."""
from fastapi import APIRouter, Depends

from app.dependencies.auth import require_permission
from app.models.auth import User
from app.schemas.system_backup import SystemBackupOut
from app.services.system_backup_service import SystemBackupService, get_system_backup_service

router = APIRouter()


@router.get("", response_model=list[SystemBackupOut])
async def list_backups(
    limit: int = 50,
    service: SystemBackupService = Depends(get_system_backup_service),
    _: User = Depends(require_permission("view_audit_log")),
):
    return await service.list_backups(limit=limit)
