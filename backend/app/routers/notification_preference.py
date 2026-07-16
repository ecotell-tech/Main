"""Per-user notification preferences — available to any authenticated user
(self-scoped; each user manages only their own preferences)."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_user
from app.models.auth import User
from app.schemas.notification_preference import (
    NotificationPreferencesOut, NotificationPreferencesUpdate,
)
from app.services.notification_preference_service import (
    NotificationPreferenceService, get_notification_preference_service,
)

router = APIRouter()


@router.get("", response_model=NotificationPreferencesOut)
async def get_notification_preferences(
    service: NotificationPreferenceService = Depends(get_notification_preference_service),
    current_user: User = Depends(get_current_user),
):
    return await service.get_preferences(current_user.id)


@router.put("", response_model=NotificationPreferencesOut)
async def update_notification_preferences(
    body: NotificationPreferencesUpdate,
    service: NotificationPreferenceService = Depends(get_notification_preference_service),
    current_user: User = Depends(get_current_user),
):
    return await service.update_preferences(current_user.id, body.model_dump())
