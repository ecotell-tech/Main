"""Schemas for District-level territory assignment (see app/models/territory.py)."""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class TerritoryAssignmentOut(BaseModel):
    district_id:   int
    district_name: str
    state_id:      Optional[int] = None
    user_id:       int
    user_name:     str


class AssignDistrictRequest(BaseModel):
    district_id: int
    user_id:     int


class UnassignDistrictRequest(BaseModel):
    district_id: int
