"""
Documents API Router for NyayaLens.
Handles document upload (PDF/Text), streaming and polling summarization progress,
source paragraph retrieval, directions, citations, timeline, and PDF report generation.
"""

import uuid
import json
import asyncio
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import DocumentRecord, SummaryRecord
from app.models.schemas import (
    DocumentUploadResponse, DocumentDetail, DocumentParagraph,
    StructuredSummary, SummaryLength, AudienceView, OutputLanguage,
    DirectionsResponse, CitationsAuditResponse, TimelineResponse
)
from app.services.ingestion import ingestion_service
from app.services.anonymiser import anonymiser_service
from app.services.summarizer import summarizer_service
from app.services.citations import citation_service
from app.services.directions import directions_service
from app.services.timeline import timeline_service
from app.services.report import report_service

router = APIRouter(prefix="/documents", tags=["documents"])

# In-memory store for session-scoped data when "Save my documents" is False
SESSION_DOCUMENTS = {}
SESSION_SUMMARIES = {}

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: Optional[UploadFile] = File(None),
    pasted_text: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Uploads a PDF file or pasted text, segments paragraphs, and extracts metadata."""
    doc_id = str(uuid.uuid4())[:12]
    orig_filename = filename or (file.filename if file else "Pasted_Judicial_Record.txt")

    if file:
        content_bytes = await file.read()
        fname_lower = (file.filename or "").lower()
        content_type = (file.content_type or "").lower()
        is_image = (
            content_type.startswith("image/")
            or any(fname_lower.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".jfif"])
        )
        is_docx = (
            fname_lower.endswith(".docx")
            or fname_lower.endswith(".doc")
            or "wordprocessingml" in content_type
            or "msword" in content_type
        )
        if is_image:
            mime = content_type if content_type.startswith("image/") else "image/jpeg"
            pages_data, ocr_used, low_quality = ingestion_service.extract_from_image_bytes(content_bytes, mime_type=mime)
        elif is_docx:
            pages_data, ocr_used, low_quality = ingestion_service.extract_from_docx_bytes(content_bytes)
        else:
            pages_data, ocr_used, low_quality = ingestion_service.extract_from_pdf_bytes(content_bytes)
    elif pasted_text and pasted_text.strip():
        pages_data, ocr_used, low_quality = ingestion_service.extract_from_raw_text(pasted_text)
    else:
        raise HTTPException(status_code=400, detail="Either a document file (PDF, Word DOCX, or photo) or pasted text must be provided.")

    paragraphs = ingestion_service.segment_into_paragraphs(pages_data)
    total_words = sum(len(p.text.split()) for p in paragraphs)

    paras_dict_list = [p.model_dump() for p in paragraphs]

    # Store in database
    doc_record = DocumentRecord(
        id=doc_id,
        filename=orig_filename,
        total_pages=len(pages_data),
        total_paragraphs=len(paragraphs),
        word_count=total_words,
        ocr_used=ocr_used,
        low_ocr_quality=low_quality,
        paragraphs=paras_dict_list
    )
    db.add(doc_record)
    db.commit()

    # Also keep in-memory for active session
    SESSION_DOCUMENTS[doc_id] = {
        "record": doc_record,
        "paragraphs": paragraphs
    }

    return DocumentUploadResponse(
        id=doc_id,
        filename=orig_filename,
        total_pages=len(pages_data),
        total_paragraphs=len(paragraphs),
        word_count=total_words,
        ocr_used=ocr_used,
        low_ocr_quality=low_quality,
        created_at=datetime.utcnow().isoformat()
    )

@router.get("/{doc_id}", response_model=DocumentDetail)
def get_document(doc_id: str, db: Session = Depends(get_db)):
    """Fetches full paragraph-by-paragraph text for Source Reader split view."""
    rec = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Document not found.")

    paragraphs = [DocumentParagraph(**p) for p in rec.paragraphs]
    return DocumentDetail(
        id=rec.id,
        filename=rec.filename,
        total_pages=rec.total_pages,
        total_paragraphs=rec.total_paragraphs,
        word_count=rec.word_count,
        ocr_used=rec.ocr_used,
        low_ocr_quality=rec.low_ocr_quality,
        paragraphs=paragraphs,
        created_at=rec.created_at.isoformat()
    )

@router.post("/{doc_id}/summarize")
async def summarize_document_endpoint(
    doc_id: str,
    length: SummaryLength = SummaryLength.DETAILED,
    audience: AudienceView = AudienceView.LAWYER,
    language: OutputLanguage = OutputLanguage.EN,
    anonymise: bool = False,
    stream: bool = False,
    db: Session = Depends(get_db)
):
    """
    Triggers the map-reduce summarization and faithfulness verification pipeline.
    Supports Server-Sent Events (SSE) streaming progress steps (Reading, Splitting, Summarizing, Verifying, Done).
    """
    rec = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Document not found.")

    paragraphs = [DocumentParagraph(**p) for p in rec.paragraphs]

    async def event_generator():
        yield f"data: {json.dumps({'step': 'Reading', 'percent': 15, 'message': 'Parsing document structure and paragraph numbering...'})}\n\n"
        await asyncio.sleep(0.1)

        # Anonymisation if toggled
        reverse_map = {}
        processed_paragraphs = paragraphs
        if anonymise:
            yield f"data: {json.dumps({'step': 'Splitting', 'percent': 30, 'message': 'Anonymising party names and PII...'})}\n\n"
            anonymised_paras = []
            for p in paragraphs:
                anon_text, r_map = anonymiser_service.anonymise(p.text)
                reverse_map.update(r_map)
                anonymised_paras.append(DocumentParagraph(
                    para_id=p.para_id,
                    page_number=p.page_number,
                    text=anon_text,
                    functional_class=p.functional_class
                ))
            processed_paragraphs = anonymised_paras

        yield f"data: {json.dumps({'step': 'Splitting', 'percent': 45, 'message': 'Grouping paragraphs into verified map chunks...'})}\n\n"
        await asyncio.sleep(0.1)

        yield f"data: {json.dumps({'step': 'Summarizing', 'percent': 65, 'message': 'Extracting judicial propositions with paragraph citations...'})}\n\n"
        summary = summarizer_service.summarize_document(
            paragraphs=processed_paragraphs,
            length=length,
            audience=audience,
            language=language,
            document_id=doc_id
        )

        yield f"data: {json.dumps({'step': 'Verifying', 'percent': 85, 'message': 'Verifying faithfulness against cited source paragraphs...'})}\n\n"
        await asyncio.sleep(0.1)

        # De-anonymise summary sentences if anonymisation was applied
        if anonymise and reverse_map:
            for sec in summary.sections:
                for s in sec.sentences:
                    s.sentence = anonymiser_service.deanonymise(s.sentence, reverse_map)

        # Concurrently compute citations, directions, and timeline
        citations_res = citation_service.extract_and_audit(paragraphs)
        directions_res = directions_service.extract_directions(paragraphs)
        timeline_res = timeline_service.extract_timeline_and_entities(paragraphs)

        # Persist summary record in DB
        summary_rec = SummaryRecord(
            id=summary.id,
            document_id=doc_id,
            length=length.value,
            audience=audience.value,
            language=language.value,
            sections=[s.model_dump() for s in summary.sections],
            stats=summary.stats.model_dump(),
            directions=[d.model_dump() for d in directions_res.directions],
            citations=[c.model_dump() for c in citations_res.citations],
            timeline=[t.model_dump() for t in timeline_res.timeline],
            entities=timeline_res.entities.model_dump()
        )
        db.add(summary_rec)
        db.commit()

        SESSION_SUMMARIES[doc_id] = {
            "summary": summary,
            "citations": citations_res,
            "directions": directions_res,
            "timeline": timeline_res,
            "privacy_mode": anonymise
        }

        yield f"data: {json.dumps({'step': 'Done', 'percent': 100, 'summary_id': summary.id, 'summary': summary.model_dump()})}\n\n"

    if stream:
        return StreamingResponse(event_generator(), media_type="text/event-stream")

    # Non-streaming fallback execution
    reverse_map = {}
    processed_paragraphs = paragraphs
    if anonymise:
        anonymised_paras = []
        for p in paragraphs:
            anon_text, r_map = anonymiser_service.anonymise(p.text)
            reverse_map.update(r_map)
            anonymised_paras.append(DocumentParagraph(
                para_id=p.para_id,
                page_number=p.page_number,
                text=anon_text,
                functional_class=p.functional_class
            ))
        processed_paragraphs = anonymised_paras

    summary = summarizer_service.summarize_document(
        paragraphs=processed_paragraphs,
        length=length,
        audience=audience,
        language=language,
        document_id=doc_id
    )

    if anonymise and reverse_map:
        for sec in summary.sections:
            for s in sec.sentences:
                s.sentence = anonymiser_service.deanonymise(s.sentence, reverse_map)

    citations_res = citation_service.extract_and_audit(paragraphs)
    directions_res = directions_service.extract_directions(paragraphs)
    timeline_res = timeline_service.extract_timeline_and_entities(paragraphs)

    summary_rec = SummaryRecord(
        id=summary.id,
        document_id=doc_id,
        length=length.value,
        audience=audience.value,
        language=language.value,
        sections=[s.model_dump() for s in summary.sections],
        stats=summary.stats.model_dump(),
        directions=[d.model_dump() for d in directions_res.directions],
        citations=[c.model_dump() for c in citations_res.citations],
        timeline=[t.model_dump() for t in timeline_res.timeline],
        entities=timeline_res.entities.model_dump()
    )
    db.add(summary_rec)
    db.commit()

    SESSION_SUMMARIES[doc_id] = {
        "summary": summary,
        "citations": citations_res,
        "directions": directions_res,
        "timeline": timeline_res,
        "privacy_mode": anonymise
    }

    return summary

@router.get("/{doc_id}/summary", response_model=StructuredSummary)
def get_summary(doc_id: str, db: Session = Depends(get_db)):
    """Retrieves generated verified summary for active document."""
    rec = db.query(SummaryRecord).filter(SummaryRecord.document_id == doc_id).order_by(SummaryRecord.created_at.desc()).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Summary has not yet been generated for this document.")

    return StructuredSummary(
        id=rec.id,
        document_id=rec.document_id,
        length=SummaryLength(rec.length),
        audience=AudienceView(rec.audience),
        language=OutputLanguage(rec.language),
        sections=rec.sections,
        stats=rec.stats,
        created_at=rec.created_at.isoformat()
    )

@router.get("/{doc_id}/directions", response_model=DirectionsResponse)
def get_directions(doc_id: str, db: Session = Depends(get_db)):
    """Retrieves operative directions checklist table."""
    rec = db.query(SummaryRecord).filter(SummaryRecord.document_id == doc_id).order_by(SummaryRecord.created_at.desc()).first()
    if not rec or not rec.directions:
        # Compute on the fly if needed
        doc = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")
        paragraphs = [DocumentParagraph(**p) for p in doc.paragraphs]
        return directions_service.extract_directions(paragraphs)

    return DirectionsResponse(
        document_id=doc_id,
        has_operative_orders=len(rec.directions) > 0,
        directions=rec.directions
    )

@router.get("/{doc_id}/citations", response_model=CitationsAuditResponse)
def get_citations(doc_id: str, db: Session = Depends(get_db)):
    """Retrieves citation audit list with verification statuses."""
    rec = db.query(SummaryRecord).filter(SummaryRecord.document_id == doc_id).order_by(SummaryRecord.created_at.desc()).first()
    if not rec or not rec.citations:
        doc = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")
        paragraphs = [DocumentParagraph(**p) for p in doc.paragraphs]
        return citation_service.extract_and_audit(paragraphs)

    cits = rec.citations
    return CitationsAuditResponse(
        document_id=doc_id,
        total_citations=len(cits),
        verified_count=sum(1 for c in cits if c.get("status") == "Verified"),
        doc_only_count=sum(1 for c in cits if c.get("status") == "Found in document only"),
        could_not_verify_count=sum(1 for c in cits if c.get("status") == "Could not verify"),
        citations=cits
    )

@router.get("/{doc_id}/timeline", response_model=TimelineResponse)
def get_timeline(doc_id: str, db: Session = Depends(get_db)):
    """Retrieves timeline of occurrences and extracted entities."""
    rec = db.query(SummaryRecord).filter(SummaryRecord.document_id == doc_id).order_by(SummaryRecord.created_at.desc()).first()
    if not rec or not rec.timeline:
        doc = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")
        paragraphs = [DocumentParagraph(**p) for p in doc.paragraphs]
        return timeline_service.extract_timeline_and_entities(paragraphs)

    return TimelineResponse(
        document_id=doc_id,
        timeline=rec.timeline,
        entities=rec.entities
    )

@router.get("/{doc_id}/report.pdf")
def download_verification_report(doc_id: str, db: Session = Depends(get_db)):
    """Generates and serves downloadable Verification Report PDF."""
    doc = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    sum_rec = db.query(SummaryRecord).filter(SummaryRecord.document_id == doc_id).order_by(SummaryRecord.created_at.desc()).first()
    if not sum_rec:
        raise HTTPException(status_code=400, detail="Please generate a summary before downloading the verification report.")

    pdf_bytes = report_service.generate_verification_report_pdf(
        document_filename=doc.filename,
        summary_data={"sections": sum_rec.sections, "stats": sum_rec.stats},
        citations_data={"citations": sum_rec.citations},
        directions_data={"directions": sum_rec.directions},
        privacy_mode=False
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="NyayaLens_Verification_Report_{doc_id}.pdf"'}
    )
