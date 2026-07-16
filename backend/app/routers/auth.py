from fastapi import APIRouter, Depends, status

from app.dependencies.auth import get_current_user
from app.models.auth import User
from app.schemas.auth import (
    ChangePasswordRequest, LoginRequest, OtpRequest, OtpSentResponse,
    OtpVerifyRequest, TokenResponse,
)
from app.services.auth_service import AuthService, get_auth_service

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    service: AuthService = Depends(get_auth_service),
):
    return await service.login(payload.mobile, payload.password)


@router.post("/send-otp", response_model=OtpSentResponse)
async def send_otp(
    payload: OtpRequest,
    service: AuthService = Depends(get_auth_service),
):
    """Generate and store a one-time OTP for this mobile number. No SMS
    gateway send integration exists yet — the code is logged server-side
    for developer/tester visibility (see AuthService.request_otp).
    Returns the real TTL so the frontend countdown never drifts from what
    the server actually enforces."""
    expires_in = await service.request_otp(payload.mobile)
    return OtpSentResponse(expires_in=expires_in)


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(
    payload: OtpVerifyRequest,
    service: AuthService = Depends(get_auth_service),
):
    return await service.verify_otp(payload.mobile, payload.otp)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout():
    # JWT is stateless; client drops the token.
    # Redis token blacklisting can be added here.
    return


@router.get("/permissions")
async def get_my_permissions(current_user: User = Depends(get_current_user)):
    """The signed-in user's own effective permission keys — used for nav/route
    gating. Available to any authenticated user (unlike the full role matrix
    at GET /admin/permissions, which requires manage_roles)."""
    return {"permissions": sorted(p.key for p in current_user.role.permissions)}


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    await service.change_password(current_user, body.current_password, body.new_password)
