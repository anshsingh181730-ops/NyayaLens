"""
Authentication helper service for NyayaLens.
Provides password hashing via direct bcrypt, JWT token generation/decoding with PyJWT,
and email normalization and validation.
"""

import re
import uuid
from datetime import datetime, timedelta
from typing import Optional, Tuple
import bcrypt
import jwt
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import UserRecord

# Cookie and token constants
COOKIE_NAME = "nyayalens_token"
ACCESS_TOKEN_EXPIRE_HOURS = 24
GUEST_TOKEN_EXPIRE_HOURS = 4
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def normalize_email(email: str) -> str:
    """Normalize email address to lowercase and strip whitespace."""
    if not email:
        return ""
    return email.strip().lower()


def is_valid_email(email: str) -> bool:
    """Validate standard email syntax using email-validator if installed, falling back to regex."""
    if not email or len(email) > 255:
        return False
    try:
        from email_validator import validate_email, EmailNotValidError
        validate_email(email.strip(), check_deliverability=False)
        return True
    except ImportError:
        return bool(EMAIL_REGEX.match(email.strip()))
    except Exception:
        return False


def _truncate_password(password: str) -> bytes:
    """Encode password as UTF-8 and truncate to 72 bytes for safe bcrypt processing."""
    if not password:
        return b""
    return password.encode("utf-8")[:72]


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a raw password against its stored bcrypt hash."""
    if not plain_password or not hashed_password:
        return False
    try:
        pwd_bytes = _truncate_password(plain_password)
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generate bcrypt hash for a plaintext password."""
    pwd_bytes = _truncate_password(password)
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def create_access_token(user_id: str, is_guest: bool = False) -> Tuple[str, int]:
    """
    Generate an encoded JWT token with expiry.
    Returns (token_string, max_age_in_seconds).
    """
    hours = GUEST_TOKEN_EXPIRE_HOURS if is_guest else ACCESS_TOKEN_EXPIRE_HOURS
    expire = datetime.utcnow() + timedelta(hours=hours)
    payload = {
        "sub": str(user_id),
        "is_guest": bool(is_guest),
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    secret = getattr(settings, "JWT_SECRET", "nyayalens_jwt_default_secret_key_change_in_production")
    algorithm = getattr(settings, "JWT_ALGORITHM", "HS256")
    encoded_jwt = jwt.encode(payload, secret, algorithm=algorithm)
    if isinstance(encoded_jwt, bytes):
        encoded_jwt = encoded_jwt.decode("utf-8")
    max_age_seconds = hours * 3600
    return str(encoded_jwt), max_age_seconds


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT access token.
    Returns decoded claims dict or None if invalid or expired.
    """
    try:
        secret = getattr(settings, "JWT_SECRET", "nyayalens_jwt_default_secret_key_change_in_production")
        algorithm = getattr(settings, "JWT_ALGORITHM", "HS256")
        payload = jwt.decode(token, secret, algorithms=[algorithm])
        return payload
    except Exception:
        return None


def get_user_by_id(db: Session, user_id: str) -> Optional[UserRecord]:
    """Retrieve user record by unique identifier."""
    return db.query(UserRecord).filter(UserRecord.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[UserRecord]:
    """Retrieve user record by normalized email (case-insensitive)."""
    normalized = normalize_email(email)
    if not normalized:
        return None
    return db.query(UserRecord).filter(func.lower(UserRecord.email) == normalized).first()

