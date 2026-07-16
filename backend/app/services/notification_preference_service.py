"""Per-user notification preferences — real persistence for the Settings tab."""
from __future__ import annotations

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.notification_preference import NotificationPreference

DEFAULT_PREFS = {
    "visitReminders": True,
    "planUpdates":    True,
    "newAssignments": False,
}


class NotificationPreferenceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_preferences(self, user_id: int) -> dict:
        rows = (
            await self.db.execute(
                select(NotificationPreference).where(NotificationPreference.user_id == user_id)
            )
        ).scalars().all()
        prefs = dict(DEFAULT_PREFS)
        for row in rows:
            if row.notification_type in prefs:
                prefs[row.notification_type] = row.is_enabled
        return prefs

    async def update_preferences(self, user_id: int, updates: dict) -> dict:
        for key, value in updates.items():
            if key not in DEFAULT_PREFS or value is None:
                continue
            existing = (
                await self.db.execute(
                    select(NotificationPreference).where(
                        NotificationPreference.user_id == user_id,
                        NotificationPreference.notification_type == key,
                    )
                )
            ).scalar_one_or_none()
            if existing:
                existing.is_enabled = value
            else:
                self.db.add(
                    NotificationPreference(user_id=user_id, notification_type=key, is_enabled=value)
                )
        await self.db.commit()
        return await self.get_preferences(user_id)


def get_notification_preference_service(db: AsyncSession = Depends(get_db)) -> NotificationPreferenceService:
    return NotificationPreferenceService(db)
