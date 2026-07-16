from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class NotificationPreferencesOut(BaseModel):
    visitReminders: bool
    planUpdates:    bool
    newAssignments: bool


class NotificationPreferencesUpdate(BaseModel):
    visitReminders: Optional[bool] = None
    planUpdates:    Optional[bool] = None
    newAssignments: Optional[bool] = None
