from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SystemBackupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:            int
    backup_type:   str
    status:        str
    file_size_mb:  Optional[Decimal] = None
    destination:   Optional[str] = None
    started_at:    datetime
    completed_at:  Optional[datetime] = None
    notes:         Optional[str] = None
