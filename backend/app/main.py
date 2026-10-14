"""
Main FastAPI Application for NyayaLens.
Initializes database tables, mounts API routers, configures CORS,
and registers global middleware and health check endpoints.
"""

import sys
import logging
from pathlib import Path

# Ensure backend directory is in sys.path
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import (
    documents_router, audit_router, agent_router,
    laws_router, mapping_router, settings_router, auth_router
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("NyayaLens")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-assisted judicial case summarizer with verification and AI law agent for Indian courts.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration (Local development + Vercel deployments)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.vercel\.app)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def on_startup():
    logger.info("Initializing NyayaLens database...")
    init_db()
    logger.info("NyayaLens backend initialization complete.")

# Mount API Routers
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(documents_router, prefix=settings.API_PREFIX)
app.include_router(audit_router, prefix=settings.API_PREFIX)
app.include_router(agent_router, prefix=settings.API_PREFIX)
app.include_router(laws_router, prefix=settings.API_PREFIX)
app.include_router(mapping_router, prefix=settings.API_PREFIX)
app.include_router(settings_router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "app": "NyayaLens",
        "tagline": "Summaries you can verify, not just trust.",
        "status": "online",
        "docs": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "llm_provider": "Anthropic Messages API",
        "model": settings.LLM_MODEL,
        "chroma_storage": str(settings.CHROMA_PERSIST_DIRECTORY)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
