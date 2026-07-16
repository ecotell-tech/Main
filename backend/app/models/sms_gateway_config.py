"""
sms_gateway_config.py — Single global row holding SMS gateway settings
used to send login OTPs.

Generic HTTP gateway design: rather than hardcoding one provider's API
shape, the row stores a request URL/method/headers/body template with
{mobile}, {otp}, {sender_id}, {api_key}, {api_secret} placeholders that
the OTP-sending code substitutes at send time. This works with most
Indian SMS gateways (MSG91, Fast2SMS, TextLocal, etc.) without a
provider-specific integration.

Single row by convention (id=1) — see SmsGatewayConfigService.
"""

from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, JSON, String, Text, func

from app.database import Base


class SmsGatewayConfig(Base):
    __tablename__ = "sms_gateway_configs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    provider_name = Column(String(100), nullable=False, server_default="")
    is_active     = Column(Boolean, nullable=False, server_default="0")

    http_method  = Column(String(10), nullable=False, server_default="POST")
    request_url  = Column(String(500), nullable=False, server_default="")
    headers_json = Column(JSON, nullable=True)
    body_template = Column(Text, nullable=True)
    sender_id    = Column(String(30), nullable=True)

    # Sensitive — never returned as-is by the API (see schemas.sms_gateway_config masking helpers)
    api_key    = Column(String(255), nullable=True)
    api_secret = Column(String(255), nullable=True)

    updated_by_user_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
