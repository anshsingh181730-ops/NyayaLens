"""
Operative Directions Extractor.
Scans final judicial orders and operative paragraphs to extract enforceable directions:
what the court ordered, responsible party, and statutory or calendar deadline.
"""

import uuid
import logging
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.schemas import DirectionItem, DirectionsResponse, DocumentParagraph
from app.services.llm import llm_service
from app.config import settings

logger = logging.getLogger(__name__)

class RawDirectionItem(BaseModel):
    direction: str = Field(description="Enforceable command or direction issued by the court.")
    responsible_party: Optional[str] = Field(default="Concerned Authorities / Parties", description="Who must comply or perform the direction.")
    deadline: Optional[str] = Field(default=None, description="Explicit deadline or timeframe (e.g. 'within 4 weeks'). Leave empty/null if no deadline is specified.")
    para_ids: List[str] = Field(default_factory=list, description="Paragraph tags where this direction is ordered.")

class ExtractedDirectionsList(BaseModel):
    has_operative_orders: bool
    directions: List[RawDirectionItem] = Field(default_factory=list)

class DirectionsExtractorService:
    @staticmethod
    def extract_directions(paragraphs: List[DocumentParagraph]) -> DirectionsResponse:
        """
        Identifies operative order paragraphs (typically in the final section of a judgment),
        and extracts structured actionable commands.
        """
        # Filter candidate operative paragraphs
        operative_paras = [p for p in paragraphs if p.functional_class == "order"]

        # If none explicitly classified, take the last 20% or last 8 paragraphs
        if not operative_paras:
            start_idx = max(0, len(paragraphs) - 8)
            operative_paras = paragraphs[start_idx:]

        if not operative_paras:
            return DirectionsResponse(document_id="", has_operative_orders=False, directions=[])

        context_text = "\n\n".join([f"[{p.para_id}] {p.text}" for p in operative_paras])

        system_prompt = (
            "You are an expert judicial registrar extracting operative directions from Indian court judgments.\n"
            "Task: Extract ONLY the explicit operative commands, orders, or directions issued by the Court.\n"
            "Rules:\n"
            "1. ONLY extract directions explicitly stated in the provided text.\n"
            "2. Identify the responsible party (who must do what).\n"
            "3. If a strict deadline is mentioned (e.g., 'within 2 weeks', 'by 15th May'), extract it; otherwise leave deadline null.\n"
            "4. Include the exact cited para_ids (e.g. ['¶18']).\n"
            "5. If the judgment contains no operative commands (e.g. pure advisory or dismissal without directions), set has_operative_orders to false and directions to []."
        )

        user_prompt = (
            f"Extract operative directions from these concluding paragraphs:\n\n"
            f"{context_text}\n\n"
            "Output JSON with schema:\n"
            '{\n  "has_operative_orders": true,\n  "directions": [\n    {"direction": "...", "responsible_party": "...", "deadline": "..." or null, "para_ids": ["¶..."]}\n  ]\n}'
        )

        try:
            result = llm_service.call_structured(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_model=ExtractedDirectionsList,
                temperature=0.0,
                model=settings.LLM_FAST_MODEL
            )

            final_directions: List[DirectionItem] = []
            for d in result.directions:
                final_directions.append(DirectionItem(
                    id=str(uuid.uuid4())[:8],
                    direction=d.direction,
                    responsible_party=d.responsible_party or "Concerned Authority",
                    deadline=d.deadline,
                    para_ids=d.para_ids,
                    is_completed=False
                ))

            return DirectionsResponse(
                document_id="",
                has_operative_orders=result.has_operative_orders and len(final_directions) > 0,
                directions=final_directions
            )

        except Exception as e:
            logger.warning(f"Error in directions extraction LLM call: {e}")
            # Fallback heuristic: look for paragraphs containing 'directed to', 'stand disposed', 'allowed'
            fallback_items: List[DirectionItem] = []
            for p in operative_paras:
                if any(k in p.text.lower() for k in ["directed to", "shall comply", "liberty is granted", "deposit within"]):
                    fallback_items.append(DirectionItem(
                        id=str(uuid.uuid4())[:8],
                        direction=p.text[:200] + ("..." if len(p.text) > 200 else ""),
                        responsible_party="Parties to the Petition",
                        deadline=None,
                        para_ids=[p.para_id],
                        is_completed=False
                    ))
            return DirectionsResponse(
                document_id="",
                has_operative_orders=len(fallback_items) > 0,
                directions=fallback_items
            )

directions_service = DirectionsExtractorService()
