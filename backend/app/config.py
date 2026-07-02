from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    database_url: str

    # Redis
    redis_url: str = "redis://redis:6379"

    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 1440  # 24 hours

    # OTP
    otp_expiry_seconds: int = 300   # 5 minutes
    otp_max_attempts: int = 3

    # Auth lockout
    max_login_attempts: int = 5
    lockout_minutes: int = 15

    # CORS — comma-separated origins in .env
    cors_origins: List[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"


settings = Settings()
