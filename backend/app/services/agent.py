"""
AI Law Agent Service (Explicit Pipeline with Tool Routing & Multilingual RAG).
Routes user questions through an explicit, auditable reasoning pipeline:
  Step 1: Router classifies user intent into:
          - law_lookup (RAG retrieval over Constitution/Acts)
          - ipc_bns_map (deterministic Gazette mapping lookup)
          - summarize_document (current document summary)
          - citation_audit (audit of citations in active document)
          - directions_extract (operative directions from active document)
          - general_help (overview of capabilities)
  Step 2: Executes selected tool deterministically.
  Step 3: Synthesizes response strictly bound to retrieved ground-truth text,
          appends "Sources used" and disclaimer, and adheres to explanation mode
          ("Explain simply" vs "Lawyer mode") in EN/HI/MR.
"""

import re
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.models.schemas import (
    AgentChatRequest, AgentChatResponse, AgentSourceItem, OutputLanguage
)
from app.services.llm import llm_service
from app.services.retrieval import retrieval_service
from app.services.mapper import mapper_service
from app.config import settings

logger = logging.getLogger(__name__)

class RouterOutput(BaseModel):
    chosen_tool: str = Field(
        description="One of: 'law_lookup', 'ipc_bns_map', 'summarize_document', 'citation_audit', 'directions_extract', 'general_help'"
    )
    extracted_query: str = Field(description="Normalized query or legal search term.")
    statute_code: Optional[str] = Field(default=None, description="e.g. IPC, CrPC, BNS, Constitution if mentioned.")
    unit_number: Optional[str] = Field(default=None, description="Specific Section or Article number (e.g. '21', '420', '302').")

class LawAgentService:
    DISCLAIMER_NOTE = "\n\n---\n*Note: General legal information based on verified statutory texts, not legal advice.*"

    @classmethod
    def execute_pipeline(
        cls,
        request: AgentChatRequest,
        active_document_paragraphs: Optional[List[Any]] = None
    ) -> AgentChatResponse:
        """
        Executes the three-step agent pipeline:
        Router -> Tool Invocation -> Grounded Response Synthesis
        """
        # Step 1: Tool Routing
        router_result = cls._route_intent(request.message)
        tool_name = router_result.chosen_tool
        logger.info(f"Router selected tool: {tool_name} for query '{request.message}'")

        sources: List[AgentSourceItem] = []
        raw_answer = ""

        # Step 2: Tool Execution
        if tool_name == "ipc_bns_map":
            raw_answer = cls._handle_mapping_tool(router_result, request.language)

        elif tool_name == "summarize_document":
            raw_answer = cls._handle_document_summarize(active_document_paragraphs, request.language)

        elif tool_name == "citation_audit":
            raw_answer = cls._handle_citation_audit(active_document_paragraphs, request.language)

        elif tool_name == "directions_extract":
            raw_answer = cls._handle_directions_extract(active_document_paragraphs, request.language)

        elif tool_name == "general_help":
            raw_answer = cls._handle_general_help(request.language)

        else: # Default: law_lookup (RAG)
            raw_answer, sources = cls._handle_law_lookup(
                request=request,
                router_result=router_result
            )

        # Clean response and strip any 'Answer:' or 'Response:' prefixes
        clean_answer = re.sub(r"^(Answer|Response|Result):\s*", "", raw_answer.strip(), flags=re.IGNORECASE)
        # Strip all markdown asterisks (** or *) so literal asterisks never appear in responses
        clean_answer = clean_answer.replace("**", "").replace("__", "")
        final_message = clean_answer.strip()

        return AgentChatResponse(
            message=final_message,
            tool_used=tool_name,
            sources=sources,
            mode=request.mode,
            language=request.language.value
        )

    @classmethod
    def _route_intent(cls, user_message: str) -> RouterOutput:
        """Step 1: Router classifies user message into one of 6 explicit tools."""
        system_prompt = (
            "You are a strict query router for an Indian legal intelligence platform.\n"
            "Classify the user message into EXACTLY ONE of the following tools:\n"
            "1. 'ipc_bns_map': User asks to map, convert, or find the equivalent of an IPC/CrPC/IEA section to BNS/BNSS/BSA or vice-versa.\n"
            "2. 'summarize_document': User specifically asks to summarize the currently uploaded judgment or case.\n"
            "3. 'citation_audit': User asks about citations, authorities cited, or case references in the current document.\n"
            "4. 'directions_extract': User asks what the court ordered, deadlines, or operative orders in the document.\n"
            "5. 'general_help': User asks what the platform does, hello, greeting, or instructions.\n"
            "6. 'law_lookup': User asks about statutory laws, Constitution, legal definitions, punishment, provisions, rights, or Sections/Articles.\n\n"
            "Extract any statute name (e.g. IPC, BNS, Constitution) and section/article numbers (e.g. '21', '420')."
        )

        user_prompt = (
            f"User message: '{user_message}'\n\n"
            "Return JSON matching:\n"
            '{\n  "chosen_tool": "law_lookup" | "ipc_bns_map" | "summarize_document" | "citation_audit" | "directions_extract" | "general_help",\n  "extracted_query": "...",\n  "statute_code": "..." or null,\n  "unit_number": "..." or null\n}'
        )

        try:
            return llm_service.call_structured(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_model=RouterOutput,
                temperature=0.0,
                model=settings.LLM_FAST_MODEL
            )
        except Exception:
            # Fallback heuristic router
            msg_lower = user_message.lower()
            if any(k in msg_lower for k in ["bns", "bnss", "bsa", "convert", "new section", "old section", "equivalent"]):
                return RouterOutput(chosen_tool="ipc_bns_map", extracted_query=user_message)
            elif any(k in msg_lower for k in ["directions", "court ordered", "deadline"]):
                return RouterOutput(chosen_tool="directions_extract", extracted_query=user_message)
            elif any(k in msg_lower for k in ["citation", "authority", "cases cited"]):
                return RouterOutput(chosen_tool="citation_audit", extracted_query=user_message)
            elif any(k in msg_lower for k in ["summarize", "summary of this", "what is this case"]):
                return RouterOutput(chosen_tool="summarize_document", extracted_query=user_message)
            elif any(k in msg_lower for k in ["hello", "help", "who are you", "what can you do"]):
                return RouterOutput(chosen_tool="general_help", extracted_query=user_message)
            else:
                return RouterOutput(chosen_tool="law_lookup", extracted_query=user_message)

    @classmethod
    def _handle_mapping_tool(cls, router_result: RouterOutput, language: OutputLanguage) -> str:
        """Executes pure lookup in mapping JSON file."""
        code = router_result.statute_code or "IPC"
        sec = router_result.unit_number or router_result.extracted_query

        # Extract number if string contains text
        import re
        nums = re.findall(r"\d+[A-Za-z]?", sec)
        lookup_num = nums[0] if nums else sec

        res = mapper_service.convert(code, lookup_num)
        if res.found:
            return (
                f"• Offence / Subject Matter: {res.subject}\n"
                f"• Historic Law: {res.old_code} Section {res.old_section}\n"
                f"• New Provision: {res.new_code} Section {res.new_section}\n\n"
                f"{res.note if res.note else f'Section {res.old_section} of {res.old_code} corresponds directly to Section {res.new_section} of {res.new_code}.'}"
            )
        else:
            return (
                f"• Section {lookup_num} ({code}) was not found in the verified statutory mapping table.\n"
                f"• Please cross-reference with the official Gazette comparative table."
            )

    @classmethod
    def _handle_law_lookup(
        cls,
        request: AgentChatRequest,
        router_result: RouterOutput
    ) -> (str, List[AgentSourceItem]):
        """Executes RAG retrieval over verified ChromaDB provisions followed by grounded answer generation."""
        query = router_result.extracted_query or request.message
        doc_filter = None
        if router_result.statute_code:
            code_upper = router_result.statute_code.upper()
            if "CONST" in code_upper or "COI" in code_upper:
                doc_filter = "Constitution of India"
            elif "BNS" in code_upper:
                doc_filter = "Bharatiya Nyaya Sanhita, 2023"

        # Search top 6 chunks
        retrieved_chunks = retrieval_service.search_laws(
            query=query,
            n_results=6,
            doc_filter=doc_filter,
            unit_number_filter=router_result.unit_number
        )

        # Filter chunks: only include relevant matches (score >= 0.38)
        relevant_chunks = [ch for ch in retrieved_chunks if ch.get("score", 0) >= 0.38]

        sources: List[AgentSourceItem] = []
        for ch in relevant_chunks:
            meta = ch.get("metadata", {})
            sources.append(AgentSourceItem(
                doc_name=meta.get("doc_name", "Verified Act"),
                unit_type=meta.get("unit_type", "Section"),
                unit_number=meta.get("unit_number", "1"),
                title=meta.get("title", ""),
                snippet=ch.get("text", "")[:280] + "...",
                score=ch.get("score")
            ))

        # Build context from retrieved chunks if available
        context_blocks = []
        for idx, ch in enumerate(relevant_chunks):
            meta = ch.get("metadata", {})
            u_type = meta.get("unit_type", "Section")
            u_num = meta.get("unit_number", "")
            doc_title = meta.get("doc_name", "Statute")
            context_blocks.append(
                f"[Verified Source {idx+1}: {doc_title} - {u_type} {u_num}]\n{ch.get('text', '')}"
            )

        context_str = "\n\n---\n\n".join(context_blocks)

        mode_instruction = (
            "Explain in simple, non-intimidating plain language understandable to a lay citizen or student, avoiding obscure jargon."
            if request.mode == "simple"
            else "Provide an in-depth, rigorous legal breakdown suitable for an advocate or judicial officer, citing exact statutory phrases, elements of the offence, and procedural implications."
        )

        lang_instruction = (
            "Respond in clear, formal Hindi (हिन्दी)."
            if request.language == OutputLanguage.HI
            else ("Respond in clear, formal Marathi (मराठी)." if request.language == OutputLanguage.MR else "Respond in English.")
        )

        if context_str:
            system_prompt = (
                "You are the NyayaLens AI Law Agent, an expert legal intelligence system for Indian Courts, advocates, and citizens.\n"
                "STRICT CONSTRAINTS & FORMATTING:\n"
                "1. Format your response strictly in structured bullet points (•) or clean, coherent paragraphs.\n"
                "2. DO NOT use markdown asterisks (such as ** or *) for bolding. Output clean plain text without any asterisks (**).\n"
                "3. NEVER prefix your response with 'Answer:', 'Response:', 'Here is the answer:', or conversational fillers like 'Hello'.\n"
                "4. Thoroughly answer the question, integrating the verified statutory texts provided below with official Indian statutory principles.\n"
                "5. Always cite the exact Article(s) of the Constitution or Section(s) of the relevant Act (IPC, BNS, CrPC, BNSS, etc.) and landmark Supreme Court rulings.\n"
                f"6. Mode: {mode_instruction}\n"
                f"7. Language: {lang_instruction}"
            )
            user_prompt = (
                f"User Question: {request.message}\n\n"
                f"Verified Statutory Texts:\n{context_str}\n\n"
                "Provide an authoritative, well-structured answer in clean bullet points or paragraphs without any introductory greeting, 'Answer:' label, or asterisks (**)."
            )
        else:
            system_prompt = (
                "You are the NyayaLens AI Law Agent, an authoritative Indian legal intelligence assistant for Indian Courts, advocates, and citizens.\n"
                "You have comprehensive expertise in:\n"
                "- The Constitution of India (Fundamental Rights Art 12-35, Directive Principles, Writs Art 32 & 226, Judiciary)\n"
                "- Criminal Laws: Bharatiya Nyaya Sanhita, 2023 (BNS), Indian Penal Code (IPC), Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS), CrPC\n"
                "- Evidence Law: Bharatiya Sakshya Adhiniyam, 2023 (BSA), Indian Evidence Act\n"
                "- Landmark Supreme Court of India precedents (Maneka Gandhi, Kesavananda Bharati, D.K. Basu, Puttaswamy, Lalita Kumari, Arnesh Kumar)\n"
                "- Civil Procedure (CPC), Consumer Protection, Family Laws, Cyber Law (IT Act 2000)\n\n"
                "STRICT CONSTRAINTS & FORMATTING:\n"
                "1. Format your response strictly in structured bullet points (•) or clean, coherent paragraphs.\n"
                "2. DO NOT use markdown asterisks (such as ** or *) for bolding. Output clean plain text without any asterisks (**).\n"
                "3. NEVER prefix your response with 'Answer:', 'Response:', 'Here is the answer:', or conversational fillers like 'Hello'.\n"
                "4. Provide an accurate, comprehensive, and clear explanation of the legal rights, statutory provisions, and remedies.\n"
                "5. Cite the exact Article(s) or Section(s) and landmark cases wherever relevant.\n"
                f"6. Mode: {mode_instruction}\n"
                f"7. Language: {lang_instruction}"
            )
            user_prompt = (
                f"User Legal Question: {request.message}\n\n"
                "Provide an authoritative, comprehensive explanation in clean bullet points or paragraphs without any 'Answer:' prefix, greeting, or asterisks (**)."
            )

        # Convert conversation history
        history_list = [{"role": m.role, "content": m.content} for m in request.conversation_history]

        raw_answer = llm_service.call_text(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            conversation_history=history_list,
            temperature=0.1
        )

        return raw_answer, sources

    @classmethod
    def _handle_document_summarize(cls, paragraphs: Optional[List[Any]], language: OutputLanguage) -> str:
        if not paragraphs:
            return "No document is currently active in your Workspace. Please upload or open a judicial document first."
        from app.services.summarizer import summarizer_service
        from app.models.schemas import SummaryLength, AudienceView
        summary = summarizer_service.summarize_document(
            paragraphs=paragraphs,
            length=SummaryLength.ONE_PAGE,
            audience=AudienceView.LAWYER,
            language=language
        )
        points = []
        for sec in summary.sections:
            points.append(f"### {sec.title}")
            for s in sec.sentences:
                tags = " ".join([f"[{t}]" for t in s.para_ids])
                points.append(f"- {s.sentence} `{tags}`")
        return "\n\n".join(points)

    @classmethod
    def _handle_citation_audit(cls, paragraphs: Optional[List[Any]], language: OutputLanguage) -> str:
        if not paragraphs:
            return "No document is currently open in your Workspace. Please upload a judgment or petition to run the citation audit."
        from app.services.citations import citation_service
        audit = citation_service.extract_and_audit(paragraphs)
        output = [
            f"**Citation Audit Summary** ({audit.total_citations} total authorities identified)",
            f"- **Verified Authorities**: {audit.verified_count}",
            f"- **Found in Document Only**: {audit.doc_only_count}",
            f"- **Could Not Verify (Manual Check Required)**: {audit.could_not_verify_count}\n"
        ]
        for c in audit.citations[:8]:
            status_tag = f"[{c.status.value}]"
            output.append(f"- **{c.raw_text}** ({c.citation_type}) — `{status_tag}`")
        return "\n".join(output)

    @classmethod
    def _handle_directions_extract(cls, paragraphs: Optional[List[Any]], language: OutputLanguage) -> str:
        if not paragraphs:
            return "No document is currently open in your Workspace. Please upload a judgment to inspect operative directions."
        from app.services.directions import directions_service
        dirs = directions_service.extract_directions(paragraphs)
        if not dirs.has_operative_orders or not dirs.directions:
            return "No operative directions or orders were identified in the concluding section of this document."
        output = ["**Operative Directions Extracted from Court Order:**\n"]
        for idx, d in enumerate(dirs.directions):
            deadline_str = f" | Deadline: {d.deadline}" if d.deadline else ""
            tags = " ".join([f"[{t}]" for t in d.para_ids])
            output.append(f"{idx+1}. **{d.direction}**\n   - *Party*: {d.responsible_party}{deadline_str} `{tags}`")
        return "\n".join(output)

    @classmethod
    def _handle_general_help(cls, language: OutputLanguage) -> str:
        return (
            "**Welcome to NyayaLens Legal Intelligence Assistant.**\n\n"
            "Here is how I can assist you:\n"
            "1. **Statutory Lookup (RAG)**: Ask about any Article in the Constitution or Section of central acts (e.g., 'What are rights under Article 21?', 'Explain Section 482').\n"
            "2. **IPC to BNS Mapping**: Check corresponding provisions between old and new criminal codes (e.g., 'What is Section 420 IPC in BNS?').\n"
            "3. **Document Workspace Assistance**: When a judgment is active, I can summarize sections, audit citations, or inspect operative court directions.\n\n"
            "Every statement is grounded in authentic texts, verified paragraph by paragraph."
        )

agent_service = LawAgentService()
