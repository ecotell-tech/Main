"""Pydantic schemas for user management (onboarding / listing / editing)."""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class UserCreate(BaseModel):
    name: str
    mobile: str
    email: Optional[str] = None
    role: str                          # role slug, e.g. "team_lead"
    manager_user_id: Optional[int] = None
    territory: Optional[str] = None
    district: Optional[str] = None
    status: str = "active"

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name must not be blank")
        return v

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        digits = v.replace(" ", "").replace("-", "")
        if not digits.isdigit() or len(digits) < 10:
            raise ValueError("Mobile must be at least 10 digits")
        return digits


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    manager_user_id: Optional[int] = None
    territory: Optional[str] = None
    district: Optional[str] = None
    status: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=False)  # built from dicts, not ORM rows

    id: int
    name: str
    mobile: str
    email: Optional[str] = None
    role: str
    manager_user_id: Optional[int] = None
    territory: Optional[str] = None
    district: Optional[str] = None
    status: str
    initials: str
    joined_date: Optional[str] = None
