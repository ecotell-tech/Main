from __future__ import annotations

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.crud import BaseRepository
from app.database import get_db
from app.models.auth import User
from app.models.sms_gateway_config import SmsGatewayConfig
from app.schemas.sms_gateway_config import SmsGatewayConfigUpdate

# Single-row table by convention — see sms_gateway_config.py module docstring.
CONFIG_ROW_ID = 1


class SmsGatewayConfigRepository(BaseRepository[SmsGatewayConfig]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(SmsGatewayConfig, db)

    async def get_singleton(self) -> SmsGatewayConfig | None:
        result = await self.db.execute(
            select(SmsGatewayConfig).where(SmsGatewayConfig.id == CONFIG_ROW_ID)
        )
        return result.scalar_one_or_none()


class SmsGatewayConfigService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = SmsGatewayConfigRepository(db)

    async def get_config(self) -> SmsGatewayConfig | None:
        return await self.repo.get_singleton()

    async def upsert_config(self, data: SmsGatewayConfigUpdate, user: User) -> SmsGatewayConfig:
        provided = data.model_fields_set
        fields = {
            "provider_name": data.provider_name,
            "is_active":     data.is_active,
            "http_method":   data.http_method,
            "request_url":   data.request_url,
            "headers_json":  data.headers_json,
            "body_template": data.body_template,
            "sender_id":     data.sender_id,
        }
        # api_key / api_secret: only touch them if the client actually sent the field,
        # so leaving them out of the request preserves the existing stored secret.
        if "api_key" in provided:
            fields["api_key"] = data.api_key
        if "api_secret" in provided:
            fields["api_secret"] = data.api_secret

        existing = await self.repo.get_singleton()
        if existing:
            return await self.repo.update(existing, updated_by_user_id=user.id, **fields)

        obj = await self.repo.create(id=CONFIG_ROW_ID, updated_by_user_id=user.id, **fields)
        return await self.repo.save(obj)


def get_sms_gateway_config_service(db: AsyncSession = Depends(get_db)) -> SmsGatewayConfigService:
    return SmsGatewayConfigService(db)
