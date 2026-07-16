from fastapi import APIRouter, Depends

from app.dependencies.auth import require_permission
from app.models.auth import User
from app.models.sms_gateway_config import SmsGatewayConfig
from app.schemas.sms_gateway_config import SmsGatewayConfigOut, SmsGatewayConfigUpdate
from app.services.sms_gateway_config_service import SmsGatewayConfigService, get_sms_gateway_config_service

router = APIRouter()


@router.get("", response_model=SmsGatewayConfigOut)
async def get_sms_gateway_config(
    service: SmsGatewayConfigService = Depends(get_sms_gateway_config_service),
    current_user: User = Depends(require_permission("manage_sms_gateway")),
):
    """Return the current SMS gateway config. Secrets are masked, never sent in full."""
    config = await service.get_config()
    return SmsGatewayConfigOut.from_model(config or SmsGatewayConfig())


@router.put("", response_model=SmsGatewayConfigOut)
async def update_sms_gateway_config(
    body: SmsGatewayConfigUpdate,
    service: SmsGatewayConfigService = Depends(get_sms_gateway_config_service),
    current_user: User = Depends(require_permission("manage_sms_gateway")),
):
    """Save the SMS gateway config (Leadership only).

    Omit api_key / api_secret from the request body to leave the currently
    stored secret unchanged; send an empty string to clear it.
    """
    config = await service.upsert_config(body, current_user)
    return SmsGatewayConfigOut.from_model(config)
