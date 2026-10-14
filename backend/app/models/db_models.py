"""
SQLAlchemy database models for NyayaLens.
Defines persistent entities for documents, summaries, audits, and chat history.
"""

from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, JSON
from datetime import datetime
from app.database import Base

class DocumentRecord(Base):
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=True)
    total_pages = Column(Integer, default=0)
    total_paragraphs = Column(Integer, default=0)
    word_count = Column(Integer, default=0)
    ocr_used = Column(Boolean, default=False)
    low_ocr_quality = Column(Boolean, default=False)
    paragraphs = Column(JSON, default=list) # List of dicts {para_id, page_number, text, functional_class}
    created_at = Column(DateTime, default=datetime.utcnow)

class SummaryRecord(Base):
    __tablename__ = "summaries"

    id = Column(String(64), primary_key=True, index=True)
    document_id = Column(String(64), index=True, nullable=False)
    length = Column(String(32), default="detailed")
    audience = Column(String(32), default="lawyer")
    language = Column(String(10), default="en")
    sections = Column(JSON, default=list)
    stats = Column(JSON, default=dict)
    directions = Column(JSON, default=list)
    citations = Column(JSON, default=list)
    timeline = Column(JSON, default=list)
    entities = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditRecord(Base):
    __tablename__ = "audit_reports"

    id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    total_citations = Column(Integer, default=0)
    verified_count = Column(Integer, default=0)
    doc_only_count = Column(Integer, default=0)
    could_not_verify_count = Column(Integer, default=0)
    citations_data = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

class ChatSessionRecord(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(64), primary_key=True, index=True)
    document_id = Column(String(64), nullable=True)
    messages = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
