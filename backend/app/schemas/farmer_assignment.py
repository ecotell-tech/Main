"""Schemas for bulk farmer→representative task assignment (farmer_user_assignments)."""
from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel


class FarmerAssignmentCreate(BaseModel):
    farmer_ids: list[int]
    user_id: int
    due_date: Optional[date] = None


class FarmerAssignmentOut(BaseModel):
    farmer_id: int
    user_id:   int
    user_name: str
    due_date:  Optional[date] = None
