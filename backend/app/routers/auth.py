from fastapi import APIRouter, Depends, status

from app.dependencies.auth import get_current_user
from app.models.auth import User
from app.schemas.auth import ChangePasswordRequest, LoginRequest, OtpVerifyRequest, TokenResponse
from app.services.auth_service import AuthService, get_auth_service

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    service: AuthService = Depends(get_auth_service),
):
    return await service.login(payload.mobile, payload.password)


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(
    payload: OtpVerifyRequest,
    service: AuthService = Depends(get_auth_service),
):
    # OTP logic will use Redis — placeholder
    from app.core.exceptions import bad_request
    raise bad_request("OTP login coming soon")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout():
    # JWT is stateless; client drops the token.
    # Redis token blacklisting can be added here.
    return


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    await service.change_password(current_user, body.current_password, body.new_password)
