"""Permission matrix service — reads/writes real role↔permission grants.

`require_permission()` (app/dependencies/auth.py) checks `role_permissions`
on every request with no caching, so any change made here takes effect
immediately for every user of the affected role.
"""
from __future__ import annotations

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import bad_request
from app.database import get_db
from app.models.auth import Permission, Role

# Super-user roles whose grants can never be reduced via the matrix UI —
# they always have every permission (enforced both here and in the seed data).
LOCKED_ROLES = {"manager", "admin"}


class PermissionMatrixService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_matrix(self) -> dict:
        perms = (
            await self.db.execute(select(Permission).order_by(Permission.module, Permission.id))
        ).scalars().all()

        roles = (
            await self.db.execute(
                select(Role).options(selectinload(Role.permissions))
            )
        ).scalars().all()

        return {
            "permissions": perms,
            "roles": {r.name: sorted(p.key for p in r.permissions) for r in roles},
        }

    async def update_matrix(self, roles_payload: dict[str, list[str]]) -> dict:
        all_perms = (await self.db.execute(select(Permission))).scalars().all()
        perms_by_key = {p.key: p for p in all_perms}

        for role_name, perm_keys in roles_payload.items():
            if role_name in LOCKED_ROLES:
                continue  # locked — silently ignored, never reduced

            role = (
                await self.db.execute(
                    select(Role)
                    .options(selectinload(Role.permissions))
                    .where(Role.name == role_name)
                )
            ).scalar_one_or_none()
            if role is None:
                raise bad_request(f"Unknown role: {role_name}")

            unknown = set(perm_keys) - perms_by_key.keys()
            if unknown:
                raise bad_request(f"Unknown permission key(s): {', '.join(sorted(unknown))}")

            role.permissions = [perms_by_key[k] for k in perm_keys]

        await self.db.commit()
        return await self.get_matrix()


def get_permission_service(db: AsyncSession = Depends(get_db)) -> PermissionMatrixService:
    return PermissionMatrixService(db)
