from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


def mask_secret(value: Optional[str]) -> str:
    """Show only the last 4 characters, e.g. '••••••ab12'. Never expose the full secret."""
    if not value:
        return ""
    if len(value) <= 4:
        return "•" * len(value)
    return "•" * (len(value) - 4) + value[-4:]


class SmsGatewayConfigOut(BaseModel):
    """Config returned to the client — secrets are masked, never sent in full."""
    model_config = ConfigDict(from_attributes=True)

    provider_name: str = ""
    is_active:     bool = False
    http_method:   str = "POST"
    request_url:   str = ""
    headers_json:  Optional[dict] = None
    body_template: Optional[str] = None
    sender_id:     Optional[str] = None
    api_key_masked:    str = ""
    api_secret_masked: str = ""
    has_api_key:       bool = False
    has_api_secret:    bool = False
    updated_at: Optional[datetime] = None

    @classmethod
    def from_model(cls, config) -> "SmsGatewayConfigOut":
        return cls(
            provider_name=config.provider_name or "",
            is_active=bool(config.is_active),
            http_method=config.http_method or "POST",
            request_url=config.request_url or "",
            headers_json=config.headers_json,
            body_template=config.body_template,
            sender_id=config.sender_id,
            api_key_masked=mask_secret(config.api_key),
            api_secret_masked=mask_secret(config.api_secret),
            has_api_key=bool(config.api_key),
            has_api_secret=bool(config.api_secret),
            updated_at=config.updated_at,
        )


class SmsGatewayConfigUpdate(BaseModel):
    """Body for PUT /settings/sms-gateway.

    api_key / api_secret: omit the field entirely to leave the stored secret
    unchanged; pass an empty string to clear it, or a new value to replace it.
    """
    provider_name: str = ""
    is_active:     bool = False
    http_method:   str = "POST"
    request_url:   str = ""
    headers_json:  Optional[dict] = None
    body_template: Optional[str] = None
    sender_id:     Optional[str] = None
    api_key:    Optional[str] = None
    api_secret: Optional[str] = None
