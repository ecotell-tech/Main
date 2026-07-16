"""App-level encryption for sensitive farmer PII (Aadhaar, bank account).

Values are encrypted at rest with Fernet (symmetric, authenticated) using
PII_ENCRYPTION_KEY from settings. Only Leadership (role 'manager') sees the
decrypted value on read; everyone else gets a masked string — see
mask_aadhaar / mask_bank_account below and their use in FarmerService.get_or_404.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


@lru_cache
def _fernet() -> Optional[Fernet]:
    if not settings.pii_encryption_key:
        return None
    return Fernet(settings.pii_encryption_key.encode())


def encrypt_value(value: str) -> str:
    cipher = _fernet()
    if cipher is None:
        raise RuntimeError("PII_ENCRYPTION_KEY is not configured")
    return cipher.encrypt(value.encode()).decode()


def decrypt_value(token: Optional[str]) -> Optional[str]:
    cipher = _fernet()
    if cipher is None or not token:
        return None
    try:
        return cipher.decrypt(token.encode()).decode()
    except InvalidToken:
        return None


def mask_aadhaar(value: str) -> str:
    tail = value[-4:] if len(value) >= 4 else value
    return f"XXXX XXXX {tail}"


def mask_bank_account(value: str) -> str:
    tail = value[-4:] if len(value) >= 4 else value
    return f"xxxx{tail}"
