"""
Configuration module for NyayaLens.
Loads environment variables from .env and establishes core paths and constants.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = BASE_DIR / "backend"
DATA_DIR = BASE_DIR / "data"

# Load root .env, backend .env, or working directory .env
load_dotenv(BASE_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env")
load_dotenv()

class Settings:
    PROJECT_NAME: str = "NyayaLens"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"

    # LLM Settings
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-2.5-flash")
    LLM_FAST_MODEL: str = os.getenv("LLM_FAST_MODEL", "gemini-2.5-flash")

    # Vector DB & Embeddings
    CHROMA_PERSIST_DIRECTORY: Path = BASE_DIR / "chroma_db"
    EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "paraphrase-multilingual-MiniLM-L12-v2")

    # Storage paths
    DATA_PATH: Path = DATA_DIR
    LAWS_DIR: Path = DATA_DIR / "laws"
    MAPPING_FILE: Path = DATA_DIR / "mapping" / "ipc_bns_mapping.json"
    VERIFIED_INDEX_FILE: Path = DATA_DIR / "verified_cases" / "index.json"
    SAMPLE_JUDGMENTS_DIR: Path = BASE_DIR / "sample_judgements"
    UPLOAD_TMP_DIR: Path = BASE_DIR / "uploads"

    # SQLite Storage
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'nyayalens.db'}")

    # Authentication & Security
    _jwt_secret_raw = os.getenv("JWT_SECRET")
    if not _jwt_secret_raw or not _jwt_secret_raw.strip():
        JWT_SECRET: str = "nyayalens_secret_key_fixed_stable_token_signature_2026"
        print("WARNING [NyayaLens]: JWT_SECRET is not set in .env. Falling back to default development secret.")
    else:
        JWT_SECRET: str = _jwt_secret_raw.strip()

    JWT_ALGORITHM: str = "HS256"

    # Privacy and defaults
    DEFAULT_SAVE_DOCUMENTS: bool = False
    DEFAULT_ANONYMISE: bool = False

    # OCR Fallback settings
    OCR_DENSITY_THRESHOLD_CHARS: int = 60
    OCR_TESSERACT_CMD: str = os.getenv("OCR_TESSERACT_CMD", "tesseract")

settings = Settings()

# Ensure critical directories exist
settings.UPLOAD_TMP_DIR.mkdir(parents=True, exist_ok=True)
settings.CHROMA_PERSIST_DIRECTORY.mkdir(parents=True, exist_ok=True)
