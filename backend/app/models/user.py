"""
SQLAlchemy database model for user accounts and guest sessions in NyayaLens.
"""

from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from app.database import Base


class UserRecord(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_guest = Column(Boolean, default=False)
