"""
Pydantic schemas and data models for NyayaLens.
Defines data structures for document ingestion, summarization, faithfulness verification,
citations, directions, timelines, reports, and AI law agent interactions.
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from enum import Enum

class SupportStatus(str, Enum):
    SUPPORTED = "Supported"
    PARTLY_SUPPORTED = "Partly supported"
    NOT_SUPPORTED = "Not supported"

class CitationStatus(str, Enum):
    VERIFIED = "Verified"
    FOUND_IN_DOC_ONLY = "Found in document only"
    COULD_NOT_VERIFY = "Could not verify"

class AudienceView(str, Enum):
    JUDGE = "judge"
    LAWYER = "lawyer"
    CITIZEN = "citizen"

class SummaryLength(str, Enum):
    ONE_LINE = "one_line"
    ONE_PAGE = "one_page"
    DETAILED = "detailed"

class OutputLanguage(str, Enum):
    EN = "en"
    HI = "hi"
    MR = "mr"

class DocumentParagraph(BaseModel):
    para_id: str
    page_number: int
    text: str
    functional_class: Optional[str] = "unclassified"  # facts, arguments, issues, reasoning, order, header

class DocumentUploadResponse(BaseModel):
    id: str
    filename: str
    total_pages: int
    total_paragraphs: int
    word_count: int
    ocr_used: bool = False
    low_ocr_quality: bool = False
    created_at: str

class DocumentDetail(BaseModel):
    id: str
    filename: str
    total_pages: int
    total_paragraphs: int
    word_count: int
    ocr_used: bool = False
    low_ocr_quality: bool = False
    paragraphs: List[DocumentParagraph]
    created_at: str

class SummarySentence(BaseModel):
    sentence: str
    para_ids: List[str] = Field(default_factory=list)
    support_status: SupportStatus = SupportStatus.NOT_SUPPORTED
    support_reason: Optional[str] = None
    detected_provisions: List[str] = Field(default_factory=list) # e.g. ["Article 21", "Section 482"]

class SummarySection(BaseModel):
    section_key: str  # case_details, facts, issues, arguments_petitioner, arguments_respondent, reasoning, decision, laws_cited
    title: str
    sentences: List[SummarySentence] = Field(default_factory=list)

class SummaryStats(BaseModel):
    total_sentences: int
    supported_count: int
    partly_supported_count: int
    not_supported_count: int
    faithfulness_score: float # Percentage 0-100

class StructuredSummary(BaseModel):
    id: str
    document_id: str
    length: SummaryLength
    audience: AudienceView
    language: OutputLanguage
    sections: List[SummarySection]
    stats: SummaryStats
    created_at: str

class DirectionItem(BaseModel):
    id: str
    direction: str
    responsible_party: Optional[str] = "Court / Authorities"
    deadline: Optional[str] = None
    para_ids: List[str] = Field(default_factory=list)
    is_completed: bool = False

class DirectionsResponse(BaseModel):
    document_id: str
    has_operative_orders: bool
    directions: List[DirectionItem] = Field(default_factory=list)

class CitationItem(BaseModel):
    id: str
    raw_text: str
    citation_type: Literal["case", "statute"]
    standard_citation: Optional[str] = None
    case_or_act_name: Optional[str] = None
    status: CitationStatus
    quote_verified: Optional[bool] = None
    quoted_text: Optional[str] = None
    proposition_supported: Optional[bool] = None
    proposition_notes: Optional[str] = None
    context_snippet: Optional[str] = None
    para_ids: List[str] = Field(default_factory=list)

class CitationsAuditResponse(BaseModel):
    document_id: str
    total_citations: int
    verified_count: int
    doc_only_count: int
    could_not_verify_count: int
    citations: List[CitationItem] = Field(default_factory=list)

class TimelineItem(BaseModel):
    date_str: str
    description: str
    para_id: Optional[str] = None

class ExtractedEntities(BaseModel):
    case_number: Optional[str] = None
    court: Optional[str] = None
    judges: List[str] = Field(default_factory=list)
    petitioners: List[str] = Field(default_factory=list)
    respondents: List[str] = Field(default_factory=list)
    statutes: List[str] = Field(default_factory=list)

class TimelineResponse(BaseModel):
    document_id: str
    timeline: List[TimelineItem] = Field(default_factory=list)
    entities: ExtractedEntities

class VerificationReportSummary(BaseModel):
    document_id: str
    filename: str
    timestamp: str
    privacy_mode_used: bool
    summary_stats: SummaryStats
    citations_summary: Dict[str, int]
    directions_count: int
    disclaimer: str = "AI-assisted judicial summary. Verify before use. Not legal advice."

class AgentChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    tool_used: Optional[str] = None

class AgentSourceItem(BaseModel):
    doc_name: str
    unit_type: str  # "article" or "section"
    unit_number: str
    title: str
    snippet: str
    score: Optional[float] = None

class AgentChatRequest(BaseModel):
    message: str
    document_id: Optional[str] = None
    mode: Literal["simple", "lawyer"] = "simple"
    language: OutputLanguage = OutputLanguage.EN
    conversation_history: List[AgentChatMessage] = Field(default_factory=list)

class AgentChatResponse(BaseModel):
    message: str
    tool_used: str
    sources: List[AgentSourceItem] = Field(default_factory=list)
    mode: str
    language: str

class LawUnitDetail(BaseModel):
    doc_name: str
    unit_type: str
    number: str
    title: str
    chapter: Optional[str] = None
    part: Optional[str] = None
    text: str
    status: str

class LawBrowseResponse(BaseModel):
    documents: List[Dict[str, Any]]

class MappingLookupRequest(BaseModel):
    code: str  # e.g., "IPC", "CrPC", "IEA", "BNS", "BNSS", "BSA"
    section: str

class MappingLookupResponse(BaseModel):
    found: bool
    old_code: Optional[str] = None
    old_section: Optional[str] = None
    new_code: Optional[str] = None
    new_section: Optional[str] = None
    subject: Optional[str] = None
    note: Optional[str] = None

class UserSettings(BaseModel):
    anonymise_mode: bool = False
    save_documents: bool = False
    preferred_language: OutputLanguage = OutputLanguage.EN
