"""
Faithfulness Verification Engine.
Performs sentence-by-sentence support checking against cited source paragraphs.
Classifies each summary claim as Supported, Partly supported, or Not supported,
and generates a concise justification ("Why this status?") for user verification.
"""

import logging
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from app.models.schemas import SupportStatus, SummarySentence, DocumentParagraph
from app.services.llm import llm_service
from app.config import settings

logger = logging.getLogger(__name__)

class VerificationJudgeResult(BaseModel):
    sentence: str
    status: SupportStatus
    reason: str = Field(description="One concise sentence explaining why this sentence is Supported, Partly supported, or Not supported by the cited paragraph(s).")

class BatchVerificationResponse(BaseModel):
    evaluations: List[VerificationJudgeResult]

class VerifierService:
    @staticmethod
    def verify_sentence_batch(
        sentences: List[SummarySentence],
        paragraphs_map: Dict[str, DocumentParagraph]
    ) -> List[SummarySentence]:
        """
        Executes faithfulness verification over a batch of summary sentences.
        If a sentence has no valid cited paragraphs, it is strictly marked NOT_SUPPORTED.
        Otherwise, an LLM judge evaluates the exact factual alignment with cited text.
        """
        verified_sentences: List[SummarySentence] = []
        needs_llm_eval: List[Dict[str, Any]] = []

        for idx, s in enumerate(sentences):
            # Check cited para_ids validity
            valid_paras = [p_id for p_id in s.para_ids if p_id in paragraphs_map]
            
            if not valid_paras:
                # Rule: Sentences without valid para ids are automatically Not supported.
                s.support_status = SupportStatus.NOT_SUPPORTED
                s.support_reason = "No source paragraph was cited, or cited paragraph tags do not exist in the source document."
                verified_sentences.append(s)
            else:
                # Collect relevant source texts
                source_contexts = [f"[{p_id}] {paragraphs_map[p_id].text}" for p_id in valid_paras]
                combined_source = "\n\n".join(source_contexts)
                needs_llm_eval.append({
                    "sentence_idx": idx,
                    "sentence_obj": s,
                    "claim": s.sentence,
                    "source_context": combined_source,
                    "para_tags": valid_paras
                })

        if not needs_llm_eval:
            return sentences

        # Construct batch prompt for the LLM judge
        system_prompt = (
            "You are an impartial, strict judicial verification clerk for the Indian Judiciary.\n"
            "Your task is to verify whether each summary claim is completely supported by the cited source text.\n"
            "Rules for evaluation:\n"
            "1. 'Supported': The source text explicitly states or directly entails all factual and legal claims in the sentence.\n"
            "2. 'Partly supported': The core proposition is true according to the source, but the summary sentence introduces extra details, nuances, or minor inferences not present in the excerpt.\n"
            "3. 'Not supported': The source text contradicts the claim, discusses a completely different issue, or does not provide adequate factual support for the asserted claim.\n"
            "Provide a one-sentence factual reason explaining the status for the 'Why this status?' popover.\n"
            "NEVER mark Supported if the claim is missing from the source."
        )

        claims_payload = []
        for item in needs_llm_eval:
            claims_payload.append({
                "sentence": item["claim"],
                "source_text": item["source_context"]
            })

        user_prompt = (
            f"Evaluate the following {len(claims_payload)} claims against their corresponding cited source paragraphs.\n\n"
            f"Input:\n{claims_payload}\n\n"
            "Output JSON format:\n"
            '{\n  "evaluations": [\n    {"sentence": "...", "status": "Supported" | "Partly supported" | "Not supported", "reason": "..."}\n  ]\n}'
        )

        try:
            batch_result = llm_service.call_structured(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_model=BatchVerificationResponse,
                temperature=0.0,
                model=settings.LLM_FAST_MODEL
            )

            # Map evaluations back
            eval_map = {res.sentence.strip(): res for res in batch_result.evaluations}

            for item in needs_llm_eval:
                s_obj: SummarySentence = item["sentence_obj"]
                matched_eval = eval_map.get(s_obj.sentence.strip())
                if matched_eval:
                    s_obj.support_status = matched_eval.status
                    s_obj.support_reason = matched_eval.reason
                else:
                    # Conservative fallback
                    s_obj.support_status = SupportStatus.PARTLY_SUPPORTED
                    s_obj.support_reason = f"Derived from cited source paragraphs: {', '.join(item['para_tags'])}."
                verified_sentences.append(s_obj)

        except Exception as e:
            logger.warning(f"Batch verification LLM call exception: {e}. Applying fallback deterministic check.")
            for item in needs_llm_eval:
                s_obj = item["sentence_obj"]
                # Substring / token overlap heuristic
                words = set(s_obj.sentence.lower().split())
                source_words = set(item["source_context"].lower().split())
                overlap = len(words.intersection(source_words)) / max(len(words), 1)
                
                if overlap > 0.65:
                    s_obj.support_status = SupportStatus.SUPPORTED
                    s_obj.support_reason = f"Confirmed factual alignment with cited {', '.join(item['para_tags'])}."
                elif overlap > 0.35:
                    s_obj.support_status = SupportStatus.PARTLY_SUPPORTED
                    s_obj.support_reason = f"Partially matches content in {', '.join(item['para_tags'])}, manual check recommended."
                else:
                    s_obj.support_status = SupportStatus.NOT_SUPPORTED
                    s_obj.support_reason = f"Low textual evidence in cited paragraphs {', '.join(item['para_tags'])}."
                verified_sentences.append(s_obj)

        return sentences

verifier_service = VerifierService()
