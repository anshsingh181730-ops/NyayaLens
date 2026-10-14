export type SupportStatus = "Supported" | "Partly supported" | "Not supported";
export type CitationStatus = "Verified" | "Found in document only" | "Could not verify";
export type SummaryLength = "one_line" | "one_page" | "detailed";
export type AudienceView = "judge" | "lawyer" | "citizen";
export type OutputLanguage = "en" | "hi" | "mr";

export interface DocumentParagraph {
  para_id: string;
  page_number: number;
  text: string;
  functional_class?: string;
}

export interface DocumentUploadResponse {
  id: string;
  filename: string;
  total_pages: number;
  total_paragraphs: number;
  word_count: number;
  ocr_used: boolean;
  low_ocr_quality: boolean;
  created_at: string;
}

export interface DocumentDetail {
  id: string;
  filename: string;
  total_pages: number;
  total_paragraphs: number;
  word_count: number;
  ocr_used: boolean;
  low_ocr_quality: boolean;
  paragraphs: DocumentParagraph[];
  created_at: string;
}

export interface SummarySentence {
  sentence: string;
  para_ids: string[];
  support_status: SupportStatus;
  support_reason?: string;
  detected_provisions?: string[];
}

export interface SummarySection {
  section_key: string;
  title: string;
  sentences: SummarySentence[];
}

export interface SummaryStats {
  total_sentences: number;
  supported_count: number;
  partly_supported_count: number;
  not_supported_count: number;
  faithfulness_score: number;
}

export interface StructuredSummary {
  id: string;
  document_id: string;
  length: SummaryLength;
  audience: AudienceView;
  language: OutputLanguage;
  sections: SummarySection[];
  stats: SummaryStats;
  created_at: string;
}

export interface DirectionItem {
  id: string;
  direction: string;
  responsible_party: string;
  deadline?: string | null;
  para_ids: string[];
  is_completed?: boolean;
}

export interface DirectionsResponse {
  document_id: string;
  has_operative_orders: boolean;
  directions: DirectionItem[];
}

export interface CitationItem {
  id: string;
  raw_text: string;
  citation_type: "case" | "statute";
  standard_citation?: string;
  case_or_act_name?: string;
  status: CitationStatus;
  quote_verified?: boolean;
  quoted_text?: string;
  proposition_supported?: boolean;
  proposition_notes?: string;
  context_snippet?: string;
  para_ids: string[];
}

export interface CitationsAuditResponse {
  document_id: string;
  total_citations: number;
  verified_count: number;
  doc_only_count: number;
  could_not_verify_count: number;
  citations: CitationItem[];
}

export interface TimelineItem {
  date_str: string;
  description: string;
  para_id?: string;
}

export interface ExtractedEntities {
  case_number?: string;
  court?: string;
  judges: string[];
  petitioners: string[];
  respondents: string[];
  statutes: string[];
}

export interface TimelineResponse {
  document_id: string;
  timeline: TimelineItem[];
  entities: ExtractedEntities;
}

export interface AgentSourceItem {
  doc_name: string;
  unit_type: string;
  unit_number: string;
  title: string;
  snippet: string;
  score?: number;
}

export interface AgentChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  tool_used?: string;
}

export interface AgentChatResponse {
  message: string;
  tool_used: string;
  sources: AgentSourceItem[];
  mode: string;
  language: string;
}

export interface MappingLookupResponse {
  found: boolean;
  old_code?: string;
  old_section?: string;
  new_code?: string;
  new_section?: string;
  subject?: string;
  note?: string;
}

export interface LawUnitDetail {
  doc_name: string;
  unit_type: string;
  number: string;
  title: string;
  chapter?: string;
  part?: string;
  text: string;
  status: string;
}

export interface UserSettings {
  anonymise_mode: boolean;
  save_documents: boolean;
  preferred_language: OutputLanguage;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  is_guest: boolean;
}

