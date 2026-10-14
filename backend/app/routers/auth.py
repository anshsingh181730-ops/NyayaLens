"""
Authentication Router for NyayaLens.
Handles signup, login, guest access, session verification (/me), and logout
with httpOnly SameSite=Lax JWT cookies.
"""

import uuid
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import UserRecord
from app.services.auth import (
    COOKIE_NAME,
    normalize_email,
    is_valid_email,
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
    get_user_by_id,
    get_user_by_email,
)

logger = logging.getLogger("NyayaLens.Auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])



class SignupRequest(BaseModel):
    name: str = Field(..., max_length=255)
    email: str = Field(..., max_length=255)
    password: str = Field(..., max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., max_length=128)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    is_guest: bool


def _set_auth_cookie(response: Response, token: str, max_age: int):
    """Attach httpOnly, SameSite=Lax authentication cookie."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/"
    )


@router.post("/signup", response_model=UserResponse)
def signup(req: SignupRequest, response: Response, db: Session = Depends(get_db)):
    """Register a new user account and set the JWT session cookie."""
    try:
        clean_name = req.name.strip() if req.name else ""
        if not clean_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Name cannot be empty."
            )

        clean_email = normalize_email(req.email)
        if not clean_email or not is_valid_email(clean_email):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Please provide a valid email address."
            )

        if not req.password or len(req.password) < 8:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Password must be at least 8 characters in length."
            )

        existing = get_user_by_email(db, clean_email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email is already registered"
            )

        user_id = str(uuid.uuid4())
        pw_hash = get_password_hash(req.password)
        user = UserRecord(
            id=user_id,
            name=clean_name,
            email=clean_email,
            password_hash=pw_hash,
            is_guest=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token, max_age = create_access_token(user.id, is_guest=False)
        _set_auth_cookie(response, token, max_age)

        return UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            is_guest=False
        )
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Unexpected error during user signup: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during signup."
        )


@router.post("/login", response_model=UserResponse)
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """Authenticate existing credentials and issue JWT session cookie."""
    try:
        clean_email = normalize_email(req.email)
        user = get_user_by_email(db, clean_email)

        if not user or user.is_guest or not user.password_hash or not verify_password(req.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )

        token, max_age = create_access_token(user.id, is_guest=False)
        _set_auth_cookie(response, token, max_age)

        return UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            is_guest=False
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error during user login: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during login."
        )


@router.post("/guest", response_model=UserResponse)
def guest_login(response: Response, db: Session = Depends(get_db)):
    """Create a transient guest account with a short-lived session token."""
    try:
        guest_id = str(uuid.uuid4())
        guest_email = f"guest-{guest_id}@guest.local"
        user = UserRecord(
            id=guest_id,
            name="Guest User",
            email=guest_email,
            password_hash="!guest_placeholder_hash",
            is_guest=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token, max_age = create_access_token(user.id, is_guest=True)
        _set_auth_cookie(response, token, max_age)

        return UserResponse(
            id=user.id,
            name="Guest User",
            email="Guest",
            is_guest=True
        )
    except Exception as exc:
        db.rollback()
        logger.exception("Error during guest session creation: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to start guest session: {str(exc)}"
        )



@router.get("/me", response_model=UserResponse)
def get_current_user(request: Request, db: Session = Depends(get_db)):
    """Retrieve currently authenticated user from session cookie or Authorization header."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated."
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid."
        )

    user = get_user_by_id(db, payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists."
        )

    return UserResponse(
        id=user.id,
        name=user.name,
        email="Guest" if user.is_guest else user.email,
        is_guest=user.is_guest
    )


@router.post("/logout")
def logout(response: Response):
    """Clear session cookie and invalidate active browser session."""
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax"
    )
    return {"message": "Logged out successfully."}
