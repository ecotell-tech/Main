from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict


class CropOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:       int
    name:     str
    category: Optional[str] = None
    season:   Optional[str] = None


class ChallengeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:   int
    name: str


class GovtSchemeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:          int
    name:        str
    description: Optional[str] = None


class InputOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:   int
    name: str
    type: str


class IrrigationTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:   int
    name: str
