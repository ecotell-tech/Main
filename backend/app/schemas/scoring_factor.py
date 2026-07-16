from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict


class ScoringFactorOptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:            int
    label:         str
    score_points:  int
    display_order: int


class ScoringFactorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:          int
    code:        str
    label:       str
    description: Optional[str] = None
    icon_class:  Optional[str] = None
    color:       Optional[str] = None
    weight:      int
    is_active:   bool
    options:     list[ScoringFactorOptionOut] = []


class ScoringFactorWeightUpdate(BaseModel):
    id:     int
    weight: int


class ScoringFactorsUpdate(BaseModel):
    """Body for PUT /admin/scoring — bulk-update weights for all factors."""
    factors: list[ScoringFactorWeightUpdate]
