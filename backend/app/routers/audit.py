"""
Citation Audit API Router for NyayaLens.
Dedicated service for auditing petitions, orders, and draft filings for citations,
quote verification, proposition support, and generating downloadable Audit Reports.
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import AuditRecord
from app.models.schemas import CitationsAuditResponse
from app.services.ingestion import ingestion_service
from app.services.citations import citation_service
from app.services.report import report_service

router = APIRouter(prefix="/audit", tags=["audit"])

# In-memory cache for quick report generation
AUDIT_CACHE = {}

@router.post("", response_model=CitationsAuditResponse)
async def audit_document(
    file: Optional[UploadFile] = File(None),
    pasted_text: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Uploads any draft, petition, or order and executes citation audit only."""
    audit_id = str(uuid.uuid4())[:12]
    orig_filename = filename or (file.filename if file else "Audited_Draft_Document.txt")

    if file:
        content_bytes = await file.read()
        pages_data, _, _ = ingestion_service.extract_from_pdf_bytes(content_bytes)
    elif pasted_text and pasted_text.strip():
        pages_data, _, _ = ingestion_service.extract_from_raw_text(pasted_text)
    else:
        raise HTTPException(status_code=400, detail="Must provide either a PDF file or pasted text to audit.")

    paragraphs = ingestion_service.segment_into_paragraphs(pages_data)
    audit_res = citation_service.extract_and_audit(paragraphs)
    audit_res.document_id = audit_id

    # Persist in DB
    rec = AuditRecord(
        id=audit_id,
        filename=orig_filename,
        total_citations=audit_res.total_citations,
        verified_count=audit_res.verified_count,
        doc_only_count=audit_res.doc_only_count,
        could_not_verify_count=audit_res.could_not_verify_count,
        citations_data=[c.model_dump() for c in audit_res.citations]
    )
    db.add(rec)
    db.commit()

    AUDIT_CACHE[audit_id] = {
        "filename": orig_filename,
        "audit_data": audit_res.model_dump()
    }

    return audit_res

@router.get("/{audit_id}/report.pdf")
def download_audit_report(audit_id: str, db: Session = Depends(get_db)):
    """Generates and serves downloadable One-Page Citation Audit Report PDF."""
    cached = AUDIT_CACHE.get(audit_id)
    if not cached:
        rec = db.query(AuditRecord).filter(AuditRecord.id == audit_id).first()
        if not rec:
            raise HTTPException(status_code=404, detail="Audit record not found.")
        cached = {
            "filename": rec.filename,
            "audit_data": {
                "total_citations": rec.total_citations,
                "verified_count": rec.verified_count,
                "doc_only_count": rec.doc_only_count,
                "could_not_verify_count": rec.could_not_verify_count,
                "citations": rec.citations_data
            }
        }

    pdf_bytes = report_service.generate_audit_report_pdf(
        document_filename=cached["filename"],
        audit_data=cached["audit_data"]
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="NyayaLens_Citation_Audit_{audit_id}.pdf"'}
    )
