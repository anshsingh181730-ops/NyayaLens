"""
Database session and connection management for NyayaLens.
Uses SQLite via SQLAlchemy.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Normalize connection URL (Supabase uses postgres:// or postgresql://)
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# SQLite-specific connection arguments (not supported by PostgreSQL)
connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for obtaining database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _ensure_users_table_schema():
    """Safe startup check that adds missing columns to the users table without deleting data."""
    try:
        with engine.connect() as conn:
            if engine.dialect.name == "sqlite":
                result = conn.execute(text("PRAGMA table_info(users)"))
                existing_cols = {row[1] for row in result.fetchall()}
                if not existing_cols:
                    return

                columns_to_add = {
                    "id": "VARCHAR(64)",
                    "name": "VARCHAR(255) NOT NULL DEFAULT ''",
                    "email": "VARCHAR(255) NOT NULL DEFAULT ''",
                    "password_hash": "VARCHAR(255)",
                    "created_at": "DATETIME",
                    "is_guest": "BOOLEAN DEFAULT 0",
                }

                for col_name, col_sql in columns_to_add.items():
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_sql}"))

                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)"))
                conn.commit()
    except Exception as exc:
        import logging
        logging.getLogger("NyayaLens.Database").warning("Users table schema check warning: %s", exc)

def init_db():
    """Initialize database tables safely, creating missing tables without altering existing data."""
    import app.models.db_models  # noqa: F401
    import app.models.user  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _ensure_users_table_schema()
