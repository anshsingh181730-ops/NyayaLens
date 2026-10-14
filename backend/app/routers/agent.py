"""
AI Law Agent API Router for NyayaLens.
Handles conversation turns, tool routing, grounded RAG over verified statutes,
statutory cross-references, and document contextual querying.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import DocumentRecord
from app.models.schemas import AgentChatRequest, AgentChatResponse, DocumentParagraph
from app.services.agent import agent_service

router = APIRouter(prefix="/agent", tags=["agent"])

@router.post("/chat", response_model=AgentChatResponse)
def chat_with_law_agent(request: AgentChatRequest, db: Session = Depends(get_db)):
    """
    Submits user query to the AI Law Agent.
    Routes to appropriate tool (law_lookup RAG, ipc_bns_map, document summarizer/audit),
    and strictly enforces grounded statutory reasoning.
    """
    active_paragraphs = None
    if request.document_id:
        doc = db.query(DocumentRecord).filter(DocumentRecord.id == request.document_id).first()
        if doc and doc.paragraphs:
            active_paragraphs = [DocumentParagraph(**p) for p in doc.paragraphs]

    response = agent_service.execute_pipeline(
        request=request,
        active_document_paragraphs=active_paragraphs
    )

    return response
