"""
User Settings & Privacy API Router for NyayaLens.
Manages ephemeral privacy controls, client preferences, and data retention policies.
"""

from fastapi import APIRouter
from app.models.schemas import UserSettings, OutputLanguage

router = APIRouter(prefix="/settings", tags=["settings"])

# Ephemeral in-memory settings store per server instance
CURRENT_SETTINGS = UserSettings(
    anonymise_mode=False,
    save_documents=False,
    preferred_language=OutputLanguage.EN
)

@router.get("", response_model=UserSettings)
def get_user_settings():
    """Fetches active user privacy and localization settings."""
    return CURRENT_SETTINGS

@router.post("", response_model=UserSettings)
def update_user_settings(new_settings: UserSettings):
    """Updates privacy preferences and storage flags."""
    global CURRENT_SETTINGS
    CURRENT_SETTINGS = new_settings
    return CURRENT_SETTINGS
