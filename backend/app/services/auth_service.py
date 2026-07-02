"""
Auth service — encapsulates login, OTP, and token logic.
Keeps business rules out of the router layer.
"""
from __future__ import annotations

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import unauthorized
from app.database import get_db
from app.models.auth import Role, User
from app.schemas.auth import TokenResponse, UserPublic
from app.utils.security import create_access_token, hash_password, verify_password


_TITLES = {"dr.", "mr.", "mrs.", "ms.", "prof.", "dr", "mr", "mrs", "ms", "prof"}

def _initials(name: str) -> str:
    parts = [p for p in name.split() if p.lower() not in _TITLES]
    if len(parts) >= 2:
        return f"{parts[0][0]}{parts[-1][0]}".upper()
    if parts:
        return parts[0][:2].upper() if len(parts[0]) >= 2 else parts[0].upper()
    return name[:2].upper()


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def login(self, mobile: str, password: str) -> TokenResponse:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.role))
            .where(User.mobile == mobile, User.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()

        if not user or not user.password_hash or not verify_password(password, user.password_hash):
            raise unauthorized("Invalid mobile or password")

        if user.status != "active":
            raise unauthorized("Account is not active")

        token = create_access_token({"sub": str(user.id), "role": user.role.name})

        return TokenResponse(
            access_token=token,
            user=UserPublic(
                id=user.id,
                name=user.name,
                mobile=user.mobile,
                role=user.role.name,
                initials=_initials(user.name),
                manager_user_id=user.manager_user_id,
            ),
        )

    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not user.password_hash or not verify_password(current_password, user.password_hash):
            raise unauthorized("Current password is incorrect")
        user.password_hash = hash_password(new_password)
        await self.db.commit()


# ── FastAPI dependency ────────────────────────────────────────

def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)
