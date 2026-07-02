from __future__ import annotations

from pydantic import BaseModel, ConfigDict, field_validator


class StateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:   int
    name: str
    code: str | None = None


class DistrictOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:       int
    state_id: int
    name:     str


class TalukaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:          int
    district_id: int
    name:        str


class VillageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:        int
    taluka_id: int
    name:      str
    pin_code:  str | None = None


class StateCreate(BaseModel):
    name: str
    code: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name must not be blank")
        return v


class DistrictCreate(BaseModel):
    state_id: int
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name must not be blank")
        return v


class TalukaCreate(BaseModel):
    district_id: int
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name must not be blank")
        return v


class VillageCreate(BaseModel):
    taluka_id: int
    name: str
    pin_code: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name must not be blank")
        return v


class VillageContextOut(BaseModel):
    """Full hierarchy returned by GET /geography/village/{id}."""
    village_id:    int
    village_name:  str
    pin_code:      str | None = None
    taluka_id:     int
    taluka_name:   str
    district_id:   int
    district_name: str
    state_id:      int
    state_name:    str
