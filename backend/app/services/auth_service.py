"""
Auth service — encapsulates login, OTP, and token logic.
Keeps business rules out of the router layer.
"""
from __future__ import annotations

import logging
import random

from fastapi import Depends
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import unauthorized
from app.core.redis import get_redis
from app.database import get_db
from app.models.auth import User
from app.schemas.auth import TokenResponse, UserPublic
from app.utils.security import create_access_token, hash_password, verify_password

logger = logging.getLogger(__name__)

_TITLES = {"dr.", "mr.", "mrs.", "ms.", "prof.", "dr", "mr", "mrs", "ms", "prof"}

def _initials(name: str) -> str:
    parts = [p for p in name.split() if p.lower() not in _TITLES]
    if len(parts) >= 2:
        return f"{parts[0][0]}{parts[-1][0]}".upper()
    if parts:
        return parts[0][:2].upper() if len(parts[0]) >= 2 else parts[0].upper()
    return name[:2].upper()

# OTP config — matches the frontend's APP_CONFIG.otp (6 digits, 120s expiry).
_OTP_TTL_SECONDS  = 120
_OTP_MAX_ATTEMPTS = 5


class AuthService:
    def __init__(self, db: AsyncSession, redis: Redis) -> None:
        self.db = db
        self.redis = redis

    def _issue_token(self, user: User) -> TokenResponse:
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

    async def _get_active_user(self, mobile: str) -> User | None:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.role))
            .where(User.mobile == mobile, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def login(self, mobile: str, password: str) -> TokenResponse:
        user = await self._get_active_user(mobile)

        if not user or not user.password_hash or not verify_password(password, user.password_hash):
            raise unauthorized("Invalid mobile or password")

        if user.status != "active":
            raise unauthorized("Account is not active")

        return self._issue_token(user)

    async def request_otp(self, mobile: str) -> None:
        user = await self._get_active_user(mobile)
        if not user or user.status != "active":
            raise unauthorized("No active account found for this mobile number")

        otp = f"{random.randint(0, 999_999):06d}"
        await self.redis.set(f"otp:{mobile}", otp, ex=_OTP_TTL_SECONDS)
        await self.redis.delete(f"otp_attempts:{mobile}")

        # No SMS gateway send integration is wired up yet (SmsGatewayConfigPage
        # only stores provider config) — log the code so it's visible to
        # developers/testers instead of silently disappearing. WARNING level
        # so it's visible under the app's default logging config.
        logger.warning("[DEV OTP] %s -> %s (expires in %ss)", mobile, otp, _OTP_TTL_SECONDS)

    async def verify_otp(self, mobile: str, otp: str) -> TokenResponse:
        attempts_key = f"otp_attempts:{mobile}"
        attempts = int(await self.redis.get(attempts_key) or 0)
        if attempts >= _OTP_MAX_ATTEMPTS:
            raise unauthorized("Too many incorrect attempts. Please request a new OTP.")

        stored = await self.redis.get(f"otp:{mobile}")
        if not stored or stored != otp:
            await self.redis.incr(attempts_key)
            await self.redis.expire(attempts_key, _OTP_TTL_SECONDS)
            raise unauthorized("Invalid or expired OTP")

        await self.redis.delete(f"otp:{mobile}")
        await self.redis.delete(attempts_key)

        user = await self._get_active_user(mobile)
        if not user or user.status != "active":
            raise unauthorized("Account is not active")

        return self._issue_token(user)

    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not user.password_hash or not verify_password(current_password, user.password_hash):
            raise unauthorized("Current password is incorrect")
        user.password_hash = hash_password(new_password)
        await self.db.commit()


# ── FastAPI dependency ────────────────────────────────────────

def get_auth_service(db: AsyncSession = Depends(get_db), redis: Redis = Depends(get_redis)) -> AuthService:
    return AuthService(db, redis)
