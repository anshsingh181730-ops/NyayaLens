"""
API Routers export module for NyayaLens.
"""

from app.routers.documents import router as documents_router
from app.routers.audit import router as audit_router
from app.routers.agent import router as agent_router
from app.routers.laws import router as laws_router
from app.routers.mapping import router as mapping_router
from app.routers.settings import router as settings_router
from app.routers.auth import router as auth_router

__all__ = [
    "documents_router",
    "audit_router",
    "agent_router",
    "laws_router",
    "mapping_router",
    "settings_router",
    "auth_router"
]

