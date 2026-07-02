from typing import Optional
from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    mobile:   str
    password: str


class OtpRequest(BaseModel):
    mobile: str


class OtpVerifyRequest(BaseModel):
    mobile: str
    otp:    str


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:               int
    name:             str
    mobile:           str
    role:             str
    initials:         Optional[str] = None
    manager_user_id:  Optional[int] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserPublic


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str
