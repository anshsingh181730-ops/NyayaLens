"""
Timeline and Legal Entity Extraction Service.
Extracts chronological dates/events, parties, bench/judges, court name,
case numbers, and core statutory references.
"""

import re
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.models.schemas import TimelineItem, ExtractedEntities, TimelineResponse, DocumentParagraph
from app.services.llm import llm_service
from app.config import settings

logger = logging.getLogger(__name__)

class RawTimelineEntityOutput(BaseModel):
    case_number: Optional[str] = None
    court: Optional[str] = None
    judges: List[str] = Field(default_factory=list)
    petitioners: List[str] = Field(default_factory=list)
    respondents: List[str] = Field(default_factory=list)
    statutes: List[str] = Field(default_factory=list)
    timeline: List[Dict[str, str]] = Field(default_factory=list)

class TimelineService:
    @staticmethod
    def extract_timeline_and_entities(paragraphs: List[DocumentParagraph]) -> TimelineResponse:
        """
        Parses initial header paragraphs and chronological facts to assemble
        a timeline of occurrences and key institutional metadata.
        """
        # Take header and factual paragraphs (up to first 12 paragraphs)
        sample_paras = paragraphs[:15]
        header_context = "\n\n".join([f"[{p.para_id}] {p.text}" for p in sample_paras])

        system_prompt = (
            "You are a legal registrar reading an Indian court document.\n"
            "Extract structured metadata:\n"
            "1. Case Number / Citation identifier.\n"
            "2. Court name (e.g. Supreme Court of India, High Court of Delhi).\n"
            "3. Hon'ble Judges / Coram.\n"
            "4. Petitioner(s) / Appellant(s).\n"
            "5. Respondent(s).\n"
            "6. Key Statutes involved.\n"
            "7. Chronological timeline of key events and dates mentioned in the facts."
        )

        user_prompt = (
            f"Extract metadata and chronological timeline from this excerpt:\n\n{header_context}\n\n"
            "Return JSON matching:\n"
            "{\n"
            '  "case_number": "...",\n'
            '  "court": "...",\n'
            '  "judges": ["..."],\n'
            '  "petitioners": ["..."],\n'
            '  "respondents": ["..."],\n'
            '  "statutes": ["..."],\n'
            '  "timeline": [{"date_str": "...", "description": "...", "para_id": "¶..."}]\n'
            "}"
        )

        try:
            result = llm_service.call_structured(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_model=RawTimelineEntityOutput,
                temperature=0.0,
                model=settings.LLM_FAST_MODEL
            )

            timeline_items = [
                TimelineItem(
                    date_str=item.get("date_str", "Date not specified"),
                    description=item.get("description", ""),
                    para_id=item.get("para_id")
                )
                for item in result.timeline
            ]

            entities = ExtractedEntities(
                case_number=result.case_number or "Criminal / Civil Appeal",
                court=result.court or "Supreme Court of India",
                judges=result.judges,
                petitioners=result.petitioners,
                respondents=result.respondents,
                statutes=result.statutes
            )

            return TimelineResponse(
                document_id="",
                timeline=timeline_items,
                entities=entities
            )

        except Exception as e:
            logger.warning(f"Timeline extraction error: {e}")
            # Regex fallback
            dates_found = []
            date_regex = re.compile(r"\b(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b")

            for p in sample_paras:
                for match in date_regex.finditer(p.text):
                    d_str = match.group(0)
                    dates_found.append(TimelineItem(
                        date_str=d_str,
                        description=p.text[:120] + "...",
                        para_id=p.para_id
                    ))

            return TimelineResponse(
                document_id="",
                timeline=dates_found[:6],
                entities=ExtractedEntities(
                    case_number="Pending Classification",
                    court="Court of Record",
                    judges=[],
                    petitioners=[],
                    respondents=[],
                    statutes=[]
                )
            )

timeline_service = TimelineService()
