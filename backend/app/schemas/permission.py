from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class PermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    key:    str
    label:  str
    module: str | None = None


class PermissionMatrixOut(BaseModel):
    permissions: list[PermissionOut]
    roles:       dict[str, list[str]]   # role name -> granted permission keys


class PermissionMatrixUpdate(BaseModel):
    roles: dict[str, list[str]]         # role name -> desired permission keys
