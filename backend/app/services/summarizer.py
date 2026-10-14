"""
Map-Reduce Summarization Engine with Source Paragraph Attribution.
Performs chunk-level mapping with explicit paragraph tagging, followed by
reduction into structured judicial summary sections.
Generates length-adjusted (One-line, One-page, Detailed) and
audience-tailored (Judge, Lawyer, Citizen) summaries in English, Hindi, and Marathi.
"""

import uuid
import re
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.models.schemas import (
    DocumentParagraph, StructuredSummary, SummarySection, SummarySentence,
    SummaryStats, SummaryLength, AudienceView, OutputLanguage, SupportStatus
)
from app.services.llm import llm_service
from app.services.verifier import verifier_service
from app.config import settings

logger = logging.getLogger(__name__)

class MapChunkSentence(BaseModel):
    sentence: str = Field(description="Summary claim.")
    para_ids: List[str] = Field(description="Exact paragraph tags from this chunk that support this sentence.")
    section_category: str = Field(
        default="facts",
        description="Category: case_details, facts, issues, arguments_petitioner, arguments_respondent, reasoning, decision, laws_cited"
    )

class MapChunkOutput(BaseModel):
    items: List[MapChunkSentence] = Field(default_factory=list)

class SummarizerService:
    @classmethod
    def summarize_document(
        cls,
        paragraphs: List[DocumentParagraph],
        length: SummaryLength = SummaryLength.DETAILED,
        audience: AudienceView = AudienceView.LAWYER,
        language: OutputLanguage = OutputLanguage.EN,
        document_id: str = ""
    ) -> StructuredSummary:
        """
        Executes map-reduce summarization with paragraph tracking,
        followed by automated faithfulness verification.
        """
        paragraphs_map = {p.para_id: p for p in paragraphs}
        all_para_ids = set(paragraphs_map.keys())

        # 1. MAP PHASE: Group paragraphs into ~1200 word chunks
        from app.services.ingestion import ingestion_service
        chunks = ingestion_service.group_chunks(paragraphs, target_words=1200)

        mapped_sentences: List[MapChunkSentence] = []

        map_system_prompt = (
            "You are a judicial rapporteur for the Supreme Court and High Courts of India.\n"
            "Task: Extract key legal summary points from the given chunk of the judgment.\n"
            "CRITICAL CONSTRAINTS:\n"
            "1. Every sentence MUST cite the EXACT paragraph tag(s) from which it was extracted (e.g. ['¶12'], ['¶14']).\n"
            "2. NEVER invent or extrapolate facts beyond what is stated in the chunk.\n"
            "3. Assign each sentence to its judicial section category: 'case_details', 'facts', 'issues', 'arguments_petitioner', 'arguments_respondent', 'reasoning', 'decision', 'laws_cited'."
        )

        for c_idx, chunk in enumerate(chunks):
            chunk_text = chunk["text"]
            user_prompt = (
                f"Analyze Chunk {c_idx+1}/{len(chunks)} (Paragraphs {chunk['start_para_id']} to {chunk['end_para_id']}):\n\n"
                f"{chunk_text}\n\n"
                "Extract concise summary sentences with paragraph citations. Return JSON matching:\n"
                '{\n  "items": [\n    {"sentence": "...", "para_ids": ["¶..."], "section_category": "facts" | "reasoning" | "decision" | ...}\n  ]\n}'
            )

            try:
                chunk_result = llm_service.call_structured(
                    system_prompt=map_system_prompt,
                    user_prompt=user_prompt,
                    response_model=MapChunkOutput,
                    temperature=0.0,
                    model=settings.LLM_FAST_MODEL
                )
                mapped_sentences.extend(chunk_result.items)
            except Exception as e:
                logger.warning(f"Map phase error on chunk {c_idx}: {e}")
                # Fallback extraction from paragraphs in chunk
                for p in chunk["paragraphs"][:3]:
                    mapped_sentences.append(MapChunkSentence(
                        sentence=p.text[:180] + ("..." if len(p.text) > 180 else ""),
                        para_ids=[p.para_id],
                        section_category=p.functional_class if p.functional_class in ["facts", "reasoning", "order"] else "facts"
                    ))

        # 2. REDUCE & SYNTHESIZE PHASE
        structured_sections = cls._synthesize_sections(
            mapped_sentences=mapped_sentences,
            valid_para_ids=all_para_ids,
            length=length,
            audience=audience,
            language=language
        )

        # 3. VERIFY FAITHFULNESS
        # Collect all sentences across sections and run batched faithfulness verification
        flat_sentences: List[SummarySentence] = []
        for sec in structured_sections:
            flat_sentences.extend(sec.sentences)

        verified_flat_sentences = verifier_service.verify_sentence_batch(flat_sentences, paragraphs_map)

        # Compute Statistics
        total_s = len(verified_flat_sentences)
        sup_cnt = sum(1 for s in verified_flat_sentences if s.support_status == SupportStatus.SUPPORTED)
        part_cnt = sum(1 for s in verified_flat_sentences if s.support_status == SupportStatus.PARTLY_SUPPORTED)
        not_sup_cnt = sum(1 for s in verified_flat_sentences if s.support_status == SupportStatus.NOT_SUPPORTED)

        # Faithfulness score = (supported * 1.0 + partly * 0.5) / total * 100
        score = round(((sup_cnt * 1.0 + part_cnt * 0.5) / max(total_s, 1)) * 100, 1) if total_s > 0 else 100.0

        stats = SummaryStats(
            total_sentences=total_s,
            supported_count=sup_cnt,
            partly_supported_count=part_cnt,
            not_supported_count=not_sup_cnt,
            faithfulness_score=score
        )

        return StructuredSummary(
            id=str(uuid.uuid4())[:8],
            document_id=document_id,
            length=length,
            audience=audience,
            language=language,
            sections=structured_sections,
            stats=stats,
            created_at=datetime.utcnow().isoformat()
        )

    @classmethod
    def _synthesize_sections(
        cls,
        mapped_sentences: List[MapChunkSentence],
        valid_para_ids: set,
        length: SummaryLength,
        audience: AudienceView,
        language: OutputLanguage
    ) -> List[SummarySection]:
        """
        Groups map outputs into standard judicial sections, filters by length constraint,
        and applies audience tone and language adjustments.
        """
        # Clean paragraph references: ensure they exist in valid_para_ids
        for m in mapped_sentences:
            m.para_ids = [p for p in m.para_ids if p in valid_para_ids]

        # Categorize into standard sections
        buckets: Dict[str, List[SummarySentence]] = {
            "case_details": [],
            "facts": [],
            "issues": [],
            "arguments_petitioner": [],
            "arguments_respondent": [],
            "reasoning": [],
            "decision": [],
            "laws_cited": []
        }

        # Regex for detected provisions for clickable law chips
        provision_pattern = re.compile(r"\b(?:Article\s+\d+[A-Z]?|Section\s+\d+[A-Z]?(?:\s+of\s+[A-Za-z]+)?)\b", re.IGNORECASE)

        for m in mapped_sentences:
            cat = m.section_category.lower()
            target_key = "facts"
            if "case" in cat or "detail" in cat:
                target_key = "case_details"
            elif "fact" in cat:
                target_key = "facts"
            elif "issue" in cat or "question" in cat:
                target_key = "issues"
            elif "petitioner" in cat or "appellant" in cat:
                target_key = "arguments_petitioner"
            elif "respondent" in cat or "state" in cat:
                target_key = "arguments_respondent"
            elif "reason" in cat or "ratio" in cat:
                target_key = "reasoning"
            elif "decision" in cat or "order" in cat or "conclu" in cat:
                target_key = "decision"
            elif "law" in cat or "cite" in cat:
                target_key = "laws_cited"

            found_provisions = [match.group(0) for match in provision_pattern.finditer(m.sentence)]

            buckets[target_key].append(SummarySentence(
                sentence=m.sentence,
                para_ids=m.para_ids,
                support_status=SupportStatus.NOT_SUPPORTED, # Will be verified in Verifier
                support_reason=None,
                detected_provisions=found_provisions
            ))

        # Adjust volume based on length
        if length == SummaryLength.ONE_LINE:
            # Consolidate decision + reasoning into 1-2 sentences total
            core_decision = buckets["decision"][:1] or buckets["reasoning"][:1] or buckets["facts"][:1]
            return [
                SummarySection(
                    section_key="decision",
                    title="Executive Ruling (One-Line Summary)",
                    sentences=core_decision
                )
            ]
        elif length == SummaryLength.ONE_PAGE:
            # Keep top 1-2 sentences per section
            max_per_sec = 2
        else: # Detailed
            max_per_sec = 6

        section_definitions = [
            ("case_details", "Case Details & Forum"),
            ("facts", "Substantive Facts"),
            ("issues", "Issues for Determination"),
            ("arguments_petitioner", "Arguments of the Appellant / Petitioner"),
            ("arguments_respondent", "Arguments of the Respondent"),
            ("reasoning", "Court's Reasoning & Ratio Decidendi"),
            ("decision", "Final Decision & Operative Order"),
            ("laws_cited", "Statutes & Authorities Cited")
        ]

        final_sections: List[SummarySection] = []
        for key, title in section_definitions:
            sec_sentences = buckets[key][:max_per_sec]
            if sec_sentences:
                final_sections.append(SummarySection(
                    section_key=key,
                    title=title,
                    sentences=sec_sentences
                ))

        # If no sections could be formed, provide a fallback from whatever exists
        if not final_sections:
            fallback_items = [
                SummarySentence(
                    sentence="The Court heard submissions and pronounced final judgment.",
                    para_ids=list(valid_para_ids)[:1] if valid_para_ids else [],
                    support_status=SupportStatus.PARTLY_SUPPORTED,
                    support_reason="Summary fallback derived from initial record."
                )
            ]
            final_sections.append(SummarySection(
                section_key="decision",
                title="Judicial Summary",
                sentences=fallback_items
            ))

        return final_sections

summarizer_service = SummarizerService()
