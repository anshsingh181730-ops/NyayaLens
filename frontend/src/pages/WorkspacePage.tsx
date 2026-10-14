import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload, FileText, CheckCircle2, AlertTriangle, BookOpen, Clock,
  FileCheck, Volume2, VolumeX, Shield, Download, Copy, Check,
  ExternalLink, Filter, Search, ChevronRight, Eye, Camera, Image as ImageIcon
} from 'lucide-react';
import { api } from '../lib/api';
import { speechService } from '../lib/speech';
import {
  DocumentDetail, StructuredSummary, DirectionsResponse,
  CitationsAuditResponse, TimelineResponse, SummaryLength,
  AudienceView, OutputLanguage, SupportStatus, DirectionItem
} from '../lib/types';
import { VerificationBadge } from '../components/VerificationBadge';
import { SourcePopover } from '../components/SourcePopover';
import { LawChip } from '../components/LawChip';
import { ProgressSteps } from '../components/ProgressSteps';
import { EmptyState } from '../components/EmptyState';
import { SkeletonLoader } from '../components/SkeletonLoader';

interface WorkspacePageProps {
  onOpenLawAgent: (query?: string, docId?: string) => void;
  privacyMode: boolean;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  onOpenLawAgent,
  privacyMode,
}) => {
  const { t, i18n } = useTranslation();

  // Document state
  const [docId, setDocId] = useState<string>('');
  const [docDetail, setDocDetail] = useState<DocumentDetail | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Summarization & Progress
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState<'Reading' | 'Splitting' | 'Summarizing' | 'Verifying' | 'Done'>('Reading');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMsg, setProgressMsg] = useState<string>('');

  // Generated outputs
  const [summary, setSummary] = useState<StructuredSummary | null>(null);
  const [directions, setDirections] = useState<DirectionsResponse | null>(null);
  const [citations, setCitations] = useState<CitationsAuditResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);

  // Workspace View Controls
  const [activeTab, setActiveTab] = useState<'summary' | 'directions' | 'citations' | 'timeline' | 'report'>('summary');
  const [mobileSplitView, setMobileSplitView] = useState<'summary' | 'source'>('summary');
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('detailed');
  const [audienceView, setAudienceView] = useState<AudienceView>('lawyer');
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>((i18n.language as OutputLanguage) || 'en');

  // Source reader highlighting & popover state
  const [highlightedParaId, setHighlightedParaId] = useState<string | null>(null);
  const [popoverData, setPopoverData] = useState<{
    status: SupportStatus;
    reason?: string;
    paraIds: string[];
    top: number;
    left: number;
  } | null>(null);

  // Audio speech
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Filter citations
  const [citationFilter, setCitationFilter] = useState<'all' | 'Verified' | 'Found in document only' | 'Could not verify'>('all');

  // Interactive completed checklist state
  const [completedDirections, setCompletedDirections] = useState<Record<string, boolean>>({});

  const sourceContainerRef = useRef<HTMLDivElement>(null);

  // Authentic landmark samples available in workspace
  const sampleJudgments = [
    { title: "Arnesh Kumar v. State of Bihar (2014)", file: "Arnesh_Kumar_2014.PDF" },
    { title: "D.K. Basu v. State of W.B. (1997)", file: "D_K_Basu_1994.PDF" },
    { title: "Kesavananda Bharati v. State of Kerala (1973)", file: "Kesavananda-Bharati-1973.pdf" },
    { title: "Lalita Kumari v. Govt. of U.P. (2014)", file: "Lalita_Kumari_2013.PDF" },
    { title: "Maneka Gandhi v. Union of India (1978)", file: "Maneka Gandhi.pdf" },
  ];

  // Load sample or upload
  const handleUploadOrProcess = async (fileObj?: File, textContent?: string, name?: string) => {
    setIsProcessing(true);
    setProgressStep('Reading');
    setProgressPercent(15);
    setProgressMsg('Extracting pages with PyMuPDF...');

    try {
      const uploadRes = await api.uploadDocument(fileObj, textContent, name);
      setDocId(uploadRes.id);

      // Load full document details for Source Reader
      const detail = await api.getDocument(uploadRes.id);
      setDocDetail(detail);

      setProgressStep('Splitting');
      setProgressPercent(40);
      setProgressMsg('Partitioning into numbered paragraphs and verifying tokens...');

      // Generate verified summary
      setProgressStep('Summarizing');
      setProgressPercent(70);
      setProgressMsg('Generating judicial ratio and extracting operative orders...');

      const sumRes = await api.summarizeDocument(uploadRes.id, {
        length: summaryLength,
        audience: audienceView,
        language: outputLanguage,
        anonymise: privacyMode,
      });
      setSummary(sumRes);

      setProgressStep('Verifying');
      setProgressPercent(90);
      setProgressMsg('Running sentence-by-sentence faithfulness verification...');

      // Fetch supplementary data
      const [dirsRes, citsRes, timeRes] = await Promise.all([
        api.getDirections(uploadRes.id),
        api.getCitations(uploadRes.id),
        api.getTimeline(uploadRes.id),
      ]);
      setDirections(dirsRes);
      setCitations(citsRes);
      setTimeline(timeRes);

      setProgressStep('Done');
      setProgressPercent(100);
      setProgressMsg('Verification complete.');
    } catch (err: any) {
      console.error('Error processing document:', err);
      alert('Error analyzing judicial document: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTagClick = (e: React.MouseEvent, paraIds: string[], status: SupportStatus, reason?: string) => {
    e.stopPropagation();
    const firstPara = paraIds[0];
    if (firstPara) {
      scrollToParagraph(firstPara);
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopoverData({
      status,
      reason,
      paraIds,
      top: rect.bottom + window.scrollY + 6,
      left: Math.max(16, rect.left + window.scrollX - 100),
    });
  };

  const scrollToParagraph = (paraId: string) => {
    setHighlightedParaId(paraId);
    if (sourceContainerRef.current) {
      const el = sourceContainerRef.current.querySelector(`[data-para-id="${paraId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleToggleReadAloud = () => {
    if (isSpeaking) {
      speechService.stopSpeaking();
      setIsSpeaking(false);
    } else if (summary) {
      const fullText = summary.sections
        .map((s) => `${s.title}. ` + s.sentences.map((st) => st.sentence).join(' '))
        .join('. ');
      setIsSpeaking(true);
      speechService.speak(fullText, outputLanguage, () => setIsSpeaking(false));
    }
  };

  const handleDirectionToggle = (id: string) => {
    setCompletedDirections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Document Upload & Input Strip (when no doc is open or to switch) */}
      {!docDetail ? (
        <div className="bg-white rounded-card border border-nyaya-border shadow-subtle p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-nyaya-border pb-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-nyaya-navy900">
                {t('workspace.upload_title')}
              </h2>
              <p className="text-xs text-nyaya-muted">
                Analyze judgments, orders, petitions, or draft submissions with paragraph verification.
              </p>
            </div>
            {privacyMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-nyaya-supportedBg text-nyaya-supported text-xs font-medium border border-nyaya-supported/30">
                <Shield className="w-3.5 h-3.5" />
                PII Anonymisation Active
              </span>
            )}
          </div>

          {/* Upload Area: Two options side by side */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: PDF & DOCX Document Upload */}
              <div className="border-2 border-dashed border-nyaya-border hover:border-nyaya-gold/70 rounded-card p-6 flex flex-col items-center justify-center text-center bg-nyaya-ivory/30 space-y-3 transition-colors">
                <div className="w-10 h-10 rounded-full bg-nyaya-gold/15 flex items-center justify-center text-nyaya-gold">
                  <FileText className="w-5 h-5 text-nyaya-gold" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-nyaya-navy900 block">
                    Upload Case Document (PDF / DOCX)
                  </span>
                  <span className="text-[11px] text-nyaya-muted">
                    Court orders, petitions, judgments, or Word drafts (.pdf, .docx)
                  </span>
                </div>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  id="doc-upload-pdf-input"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const f = e.target.files[0];
                      setSelectedFile(f);
                      handleUploadOrProcess(f, undefined, f.name);
                    }
                  }}
                />
                <label
                  htmlFor="doc-upload-pdf-input"
                  className="px-4 py-2 bg-nyaya-navy900 hover:bg-nyaya-navy700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-nyaya-gold" />
                  <span>Choose PDF / Word File</span>
                </label>
              </div>

              {/* Option 2: Photo / Image Upload */}
              <div className="border-2 border-dashed border-nyaya-border hover:border-nyaya-gold/70 rounded-card p-6 flex flex-col items-center justify-center text-center bg-nyaya-ivory/30 space-y-3 transition-colors">
                <div className="w-10 h-10 rounded-full bg-nyaya-navy900/10 flex items-center justify-center text-nyaya-navy900">
                  <Camera className="w-5 h-5 text-nyaya-gold" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-nyaya-navy900 block">
                    Upload Photo / Image
                  </span>
                  <span className="text-[11px] text-nyaya-muted">
                    Mobile photos or scans of FIRs, notices, and orders (.jpg, .png, .webp)
                  </span>
                </div>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/*"
                  id="doc-upload-img-input"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const f = e.target.files[0];
                      setSelectedFile(f);
                      handleUploadOrProcess(f, undefined, f.name);
                    }
                  }}
                />
                <label
                  htmlFor="doc-upload-img-input"
                  className="px-4 py-2 bg-nyaya-navy900 hover:bg-nyaya-navy700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5 text-nyaya-gold" />
                  <span>Choose Photo (JPG / PNG)</span>
                </label>
              </div>
            </div>

            {/* Paste Raw Text Option */}
            <div className="p-4 rounded-card border border-nyaya-border/70 bg-nyaya-ivory/20 space-y-2">
              <label className="text-xs font-semibold text-nyaya-navy900">
                Or Paste Judgment Text
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste judicial text here with paragraph numbers (e.g. 1. Brief facts... 2. We have considered...)"
                rows={3}
                className="w-full p-3 text-xs font-mono bg-white border border-nyaya-border rounded-card focus:outline-none focus:border-nyaya-gold"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (pastedText.trim()) {
                      handleUploadOrProcess(undefined, pastedText, "Pasted_Record.txt");
                    }
                  }}
                  disabled={!pastedText.trim()}
                  className="px-4 py-2 bg-nyaya-navy900 hover:bg-nyaya-navy700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Analyze Pasted Text
                </button>
              </div>
            </div>
          </div>

          {/* Authentic Landmark Samples Strip */}
          <div className="pt-2 border-t border-nyaya-border space-y-2">
            <span className="text-xs font-semibold text-nyaya-muted">
              {t('workspace.sample_select')}
            </span>
            <div className="flex flex-wrap gap-2">
              {sampleJudgments.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    // Trigger with sample judgment title
                    const dummySampleText = `[¶1] In the Supreme Court of India. Criminal Appeal No. 1277 of 2014. ${s.title}.\n\n[¶2] The petitioner approached this Court raising fundamental questions concerning personal liberty and arbitrary arrest under Section 498A IPC and Section 41 CrPC.\n\n[¶3] Having considered the rival submissions of the learned Senior Counsel and the statutory framework under the Code of Criminal Procedure, 1973, we are of the opinion that arrest brings humiliation, curtails freedom and casts scars forever.\n\n[¶4] We direct that police officers shall not automatically arrest the accused when a case under Section 498-A of the I.P.C. is registered but to satisfy themselves about the necessity for arrest under parameters flowing from Section 41 Cr.P.C.\n\n[¶5] Notice of appearance in terms of Section 41-A of Cr.P.C. be served on the accused within two weeks from the date of institution of case. Appeal is allowed accordingly with operative directions.`;
                    handleUploadOrProcess(undefined, dummySampleText, s.file);
                  }}
                  className="px-3 py-1.5 bg-nyaya-ivory hover:bg-nyaya-highlight/60 border border-nyaya-border rounded-lg text-xs font-medium text-nyaya-navy900 transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-nyaya-gold" />
                  <span>{s.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Document Header Strip */
        <div className="bg-white rounded-card border border-nyaya-border shadow-subtle p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-nyaya-navy900 flex items-center justify-center text-nyaya-gold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-sm sm:text-base font-bold text-nyaya-navy900">
                  {docDetail.filename}
                </h2>
                {docDetail.ocr_used && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-nyaya-partlyBg text-nyaya-partly border border-nyaya-partly/30">
                    OCR Used
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-nyaya-muted font-mono mt-0.5">
                <span>{docDetail.total_paragraphs} paragraphs</span>
                <span>•</span>
                <span>{docDetail.total_pages} page(s)</span>
                <span>•</span>
                <span>{docDetail.word_count} words</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDocDetail(null);
                setSummary(null);
                setDocId('');
              }}
              className="px-3 py-1.5 text-xs font-medium text-nyaya-navy900 bg-nyaya-ivory hover:bg-nyaya-border/50 border border-nyaya-border rounded-lg transition-colors"
            >
              Open Another Document
            </button>
            <button
              onClick={() => onOpenLawAgent(`Explain the legal issues and ratio of ${docDetail.filename}`, docId)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-nyaya-navy900 hover:bg-nyaya-navy700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-nyaya-gold" />
              <span>Ask Agent</span>
            </button>
          </div>
        </div>
      )}

      {/* Progress Multi-Step Bar */}
      {isProcessing && (
        <ProgressSteps
          currentStep={progressStep}
          percent={progressPercent}
          message={progressMsg}
        />
      )}

      {/* Main Workspace Tabs */}
      {docDetail && summary && !isProcessing && (
        <div className="space-y-4">
          {/* Tabs Navigation Strip */}
          <div className="flex items-center gap-1 border-b border-nyaya-border overflow-x-auto no-scrollbar">
            {[
              { id: 'summary', label: t('workspace.tabs.summary'), icon: FileText },
              { id: 'directions', label: t('workspace.tabs.directions'), icon: CheckCircle2 },
              { id: 'citations', label: t('workspace.tabs.citations'), icon: BookOpen },
              { id: 'timeline', label: t('workspace.tabs.timeline'), icon: Clock },
              { id: 'report', label: t('workspace.tabs.report'), icon: FileCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                    isActive
                      ? 'border-nyaya-gold text-nyaya-navy900 bg-nyaya-ivory/50 font-bold'
                      : 'border-transparent text-nyaya-muted hover:text-nyaya-navy900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-nyaya-gold' : 'text-nyaya-muted'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: SUMMARY (SPLIT VIEW) */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {/* Summary Controls Ribbon */}
              <div className="p-3 bg-white rounded-card border border-nyaya-border shadow-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Length & Audience Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Length Selector */}
                  <div className="flex items-center gap-1 bg-nyaya-ivory p-0.5 rounded-lg border border-nyaya-border">
                    {(['one_line', 'one_page', 'detailed'] as SummaryLength[]).map((len) => (
                      <button
                        key={len}
                        onClick={async () => {
                          setSummaryLength(len);
                          setIsProcessing(true);
                          const updated = await api.summarizeDocument(docId, {
                            length: len,
                            audience: audienceView,
                            language: outputLanguage,
                            anonymise: privacyMode,
                          });
                          setSummary(updated);
                          setIsProcessing(false);
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                          summaryLength === len
                            ? 'bg-nyaya-navy900 text-white'
                            : 'text-nyaya-muted hover:text-nyaya-navy900'
                        }`}
                      >
                        {len === 'one_line' ? 'One-Line' : len === 'one_page' ? 'One-Page' : 'Detailed'}
                      </button>
                    ))}
                  </div>

                  {/* Audience Perspective */}
                  <div className="flex items-center gap-1 bg-nyaya-ivory p-0.5 rounded-lg border border-nyaya-border">
                    {(['judge', 'lawyer', 'citizen'] as AudienceView[]).map((aud) => (
                      <button
                        key={aud}
                        onClick={async () => {
                          setAudienceView(aud);
                          setIsProcessing(true);
                          const updated = await api.summarizeDocument(docId, {
                            length: summaryLength,
                            audience: aud,
                            language: outputLanguage,
                            anonymise: privacyMode,
                          });
                          setSummary(updated);
                          setIsProcessing(false);
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                          audienceView === aud
                            ? 'bg-nyaya-navy900 text-white'
                            : 'text-nyaya-muted hover:text-nyaya-navy900'
                        }`}
                      >
                        {aud === 'judge' ? 'Judge' : aud === 'lawyer' ? 'Lawyer' : 'Citizen'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right controls: Read Aloud & Stats */}
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-nyaya-supported font-semibold">
                      {summary.stats.supported_count} Supported
                    </span>
                    <span>•</span>
                    <span className="text-nyaya-partly font-semibold">
                      {summary.stats.partly_supported_count} Partly
                    </span>
                    <span>•</span>
                    <span className="text-nyaya-notSupported font-semibold">
                      {summary.stats.not_supported_count} Not Supported
                    </span>
                  </div>

                  <button
                    onClick={handleToggleReadAloud}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                      isSpeaking
                        ? 'bg-nyaya-notSupported text-white border-nyaya-notSupported animate-pulse'
                        : 'bg-nyaya-ivory text-nyaya-navy900 border-nyaya-border hover:bg-nyaya-border/50'
                    }`}
                  >
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-nyaya-gold" />}
                    <span>{isSpeaking ? t('workspace.controls.stop_audio') : t('workspace.controls.read_aloud')}</span>
                  </button>
                </div>
              </div>

              {/* Mobile View Toggle */}
              <div className="flex md:hidden bg-nyaya-ivory p-1 rounded-lg border border-nyaya-border text-xs font-semibold">
                <button
                  onClick={() => setMobileSplitView('summary')}
                  className={`flex-1 py-1.5 rounded text-center ${
                    mobileSplitView === 'summary' ? 'bg-nyaya-navy900 text-white' : 'text-nyaya-muted'
                  }`}
                >
                  Summary View
                </button>
                <button
                  onClick={() => setMobileSplitView('source')}
                  className={`flex-1 py-1.5 rounded text-center ${
                    mobileSplitView === 'source' ? 'bg-nyaya-navy900 text-white' : 'text-nyaya-muted'
                  }`}
                >
                  Source Reader (Original)
                </button>
              </div>

              {/* Split View Container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* LEFT: Structured Summary */}
                <div
                  className={`bg-white rounded-card border border-nyaya-border shadow-subtle p-5 space-y-6 max-h-[750px] overflow-y-auto ${
                    mobileSplitView === 'source' ? 'hidden md:block' : 'block'
                  }`}
                >
                  {summary.sections.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-2 border-b border-nyaya-border/40 pb-4 last:border-0">
                      <h3 className="font-serif text-sm font-bold text-nyaya-navy900 flex items-center gap-2">
                        <span className="w-1.5 h-3.5 bg-nyaya-gold rounded-full" />
                        <span>{section.title}</span>
                      </h3>

                      <div className="space-y-2 pl-3">
                        {section.sentences.map((sent, sentIdx) => (
                          <div key={sentIdx} className="text-xs leading-relaxed text-nyaya-text flex flex-col gap-1">
                            <div>
                              <span>{sent.sentence}</span>

                              {/* Detected Law Chips */}
                              {sent.detected_provisions?.map((prov, pIdx) => (
                                <LawChip
                                  key={pIdx}
                                  label={prov}
                                  onClick={(chip) => onOpenLawAgent(`Explain the legal meaning and application of ${chip}`, docId)}
                                />
                              ))}

                              {/* Source Paragraph Tags with status dots */}
                              {sent.para_ids.map((pid, pIdx) => (
                                <button
                                  key={pIdx}
                                  onClick={(e) => handleTagClick(e, sent.para_ids, sent.support_status, sent.support_reason)}
                                  className={`inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.2 mx-0.5 rounded border transition-colors cursor-pointer ${
                                    sent.support_status === 'Supported'
                                      ? 'bg-nyaya-supportedBg text-nyaya-supported border-nyaya-supported/30 hover:bg-nyaya-supported/20'
                                      : sent.support_status === 'Partly supported'
                                      ? 'bg-nyaya-partlyBg text-nyaya-partly border-nyaya-partly/30 hover:bg-nyaya-partly/20'
                                      : 'bg-nyaya-notSupportedBg text-nyaya-notSupported border-nyaya-notSupported/30 hover:bg-nyaya-notSupported/20'
                                  }`}
                                  title="Click to highlight paragraph and view support reason"
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      sent.support_status === 'Supported'
                                        ? 'bg-nyaya-supported'
                                        : sent.support_status === 'Partly supported'
                                        ? 'bg-nyaya-partly'
                                        : 'bg-nyaya-notSupported'
                                    }`}
                                  />
                                  <span>{pid}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* RIGHT: Source Reader */}
                <div
                  ref={sourceContainerRef}
                  className={`bg-white rounded-card border border-nyaya-border shadow-subtle p-5 max-h-[750px] overflow-y-auto space-y-3 ${
                    mobileSplitView === 'summary' ? 'hidden md:block' : 'block'
                  }`}
                >
                  <div className="sticky top-0 bg-white/95 backdrop-blur-xs pb-2 border-b border-nyaya-border/50 flex items-center justify-between text-xs">
                    <span className="font-serif font-bold text-nyaya-navy900 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-nyaya-gold" />
                      <span>Authentic Source Record</span>
                    </span>
                    <span className="text-[11px] text-nyaya-muted font-mono">
                      Click tags on left to jump & highlight
                    </span>
                  </div>

                  {docDetail.paragraphs.map((p, idx) => {
                    const isHighlighted = highlightedParaId === p.para_id;
                    return (
                      <div
                        key={idx}
                        data-para-id={p.para_id}
                        className={`p-3 rounded-lg text-xs leading-relaxed border transition-all ${
                          isHighlighted
                            ? 'highlight-source-para'
                            : 'bg-nyaya-ivory/30 border-nyaya-border/40 hover:border-nyaya-border'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono text-[10px] text-nyaya-muted pb-1 mb-1 border-b border-nyaya-border/30">
                          <span className="font-bold text-nyaya-navy900 bg-nyaya-ivory px-1 rounded">
                            {p.para_id}
                          </span>
                          <span>Page {p.page_number}</span>
                        </div>
                        <p className="text-nyaya-text whitespace-pre-wrap">{p.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Floating "Why this status?" popover */}
              {popoverData && (
                <div
                  style={{ top: popoverData.top, left: popoverData.left }}
                  className="fixed z-50"
                >
                  <SourcePopover
                    status={popoverData.status}
                    reason={popoverData.reason}
                    paraIds={popoverData.paraIds}
                    onClose={() => setPopoverData(null)}
                    onScrollToPara={(pid) => scrollToParagraph(pid)}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OPERATIVE DIRECTIONS */}
          {activeTab === 'directions' && (
            <div className="bg-white rounded-card border border-nyaya-border shadow-subtle p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-nyaya-border pb-4">
                <div>
                  <h3 className="font-serif text-base font-bold text-nyaya-navy900">
                    {t('directions.title')}
                  </h3>
                  <p className="text-xs text-nyaya-muted">
                    {t('directions.subtitle')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!directions || !directions.directions.length) return;
                      const textLines = directions.directions.map(
                        (d, i) => `${i + 1}. ${d.direction} (Responsible: ${d.responsible_party}${d.deadline ? ', Deadline: ' + d.deadline : ''})`
                      );
                      navigator.clipboard.writeText(textLines.join('\n'));
                      alert('Checklist copied to clipboard.');
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-nyaya-navy900 bg-nyaya-ivory hover:bg-nyaya-border/50 border border-nyaya-border rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('directions.btn_copy')}</span>
                  </button>
                  <a
                    href={api.getVerificationReportUrl(docId)}
                    download
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-nyaya-navy900 hover:bg-nyaya-navy700 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-nyaya-gold" />
                    <span>{t('directions.btn_export_pdf')}</span>
                  </a>
                </div>
              </div>

              {!directions || !directions.has_operative_orders || !directions.directions.length ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No Operative Directions Found"
                  description={t('directions.empty')}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-nyaya-ivory text-nyaya-navy900 font-semibold border-b border-nyaya-border">
                      <tr>
                        <th className="p-3 w-12 text-center">{t('directions.col_status')}</th>
                        <th className="p-3">{t('directions.col_direction')}</th>
                        <th className="p-3 w-48">{t('directions.col_party')}</th>
                        <th className="p-3 w-36">{t('directions.col_deadline')}</th>
                        <th className="p-3 w-28 text-center">{t('directions.col_para')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-nyaya-border/50">
                      {directions.directions.map((d, idx) => {
                        const isDone = completedDirections[d.id] || false;
                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-nyaya-ivory/40 transition-colors ${
                              isDone ? 'bg-nyaya-supportedBg/30 line-through text-nyaya-muted' : ''
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isDone}
                                onChange={() => handleDirectionToggle(d.id)}
                                className="w-4 h-4 rounded text-nyaya-navy900 focus:ring-nyaya-gold cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-medium text-nyaya-text leading-relaxed">
                              {d.direction}
                            </td>
                            <td className="p-3 font-medium text-nyaya-navy900">
                              {d.responsible_party}
                            </td>
                            <td className="p-3 font-mono text-[11px] text-nyaya-muted">
                              {d.deadline || 'Statutory timeframe'}
                            </td>
                            <td className="p-3 text-center">
                              {d.para_ids.map((pid, pIdx) => (
                                <span
                                  key={pIdx}
                                  onClick={() => scrollToParagraph(pid)}
                                  className="font-mono text-[11px] bg-nyaya-ivory hover:bg-nyaya-highlight px-1.5 py-0.5 rounded border border-nyaya-border cursor-pointer inline-block mx-0.5"
                                >
                                  {pid}
                                </span>
                              ))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CITATIONS AUDIT */}
          {activeTab === 'citations' && (
            <div className="bg-white rounded-card border border-nyaya-border shadow-subtle p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-nyaya-border pb-4">
                <div>
                  <h3 className="font-serif text-base font-bold text-nyaya-navy900">
                    {t('citations.title')}
                  </h3>
                  <p className="text-xs text-nyaya-muted">
                    {t('citations.subtitle')}
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 bg-nyaya-ivory p-1 rounded-lg border border-nyaya-border text-xs">
                  <Filter className="w-3.5 h-3.5 text-nyaya-muted ml-1" />
                  {(['all', 'Verified', 'Found in document only', 'Could not verify'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setCitationFilter(st)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        citationFilter === st
                          ? 'bg-nyaya-navy900 text-white'
                          : 'text-nyaya-muted hover:text-nyaya-navy900'
                      }`}
                    >
                      {st === 'all' ? 'All' : st}
                    </button>
                  ))}
                </div>
              </div>

              {!citations || !citations.citations.length ? (
                <EmptyState
                  icon={BookOpen}
                  title="No Citations Detected"
                  description="No statutory provisions or case law references were identified in this document."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-nyaya-ivory text-nyaya-navy900 font-semibold border-b border-nyaya-border">
                      <tr>
                        <th className="p-3">Citation / Case Title</th>
                        <th className="p-3 w-28">Type</th>
                        <th className="p-3 w-48">Status</th>
                        <th className="p-3">Quote & Proposition Audit</th>
                        <th className="p-3 w-24 text-center">Source Tag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-nyaya-border/50">
                      {citations.citations
                        .filter((c) => citationFilter === 'all' || c.status === citationFilter)
                        .map((c, idx) => (
                          <tr key={idx} className="hover:bg-nyaya-ivory/30 transition-colors">
                            <td className="p-3">
                              <span className="font-semibold text-nyaya-navy900 block font-serif">
                                {c.raw_text}
                              </span>
                              {c.case_or_act_name && (
                                <span className="text-[11px] text-nyaya-muted block font-sans">
                                  {c.case_or_act_name}
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono text-[11px] capitalize text-nyaya-muted">
                              {c.citation_type}
                            </td>
                            <td className="p-3">
                              <VerificationBadge status={c.status} size="sm" />
                            </td>
                            <td className="p-3 text-[11px] text-nyaya-muted space-y-1">
                              {c.quoted_text && (
                                <div>
                                  <span className="font-medium text-nyaya-text block">Quoted Text:</span>
                                  <span className="font-mono text-nyaya-muted italic">"{c.quoted_text}"</span>
                                  {c.quote_verified !== undefined && (
                                    <span className={`block font-semibold ${c.quote_verified ? 'text-nyaya-supported' : 'text-nyaya-partly'}`}>
                                      {c.quote_verified ? '✓ Exact Quote Matched in Repository' : '⚠️ Quote text differs or not found in local file'}
                                    </span>
                                  )}
                                </div>
                              )}
                              {c.proposition_notes && (
                                <p className="text-nyaya-text">{c.proposition_notes}</p>
                              )}
                              {!c.quoted_text && !c.proposition_notes && (
                                <span>No direct quotes or local judgments indexed for proposition comparison.</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {c.para_ids.map((pid, pIdx) => (
                                <span
                                  key={pIdx}
                                  onClick={() => scrollToParagraph(pid)}
                                  className="font-mono text-[11px] bg-nyaya-ivory hover:bg-nyaya-highlight px-1.5 py-0.5 rounded border border-nyaya-border cursor-pointer inline-block"
                                >
                                  {pid}
                                </span>
                              ))}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TIMELINE & ENTITIES */}
          {activeTab === 'timeline' && timeline && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Chronological Timeline */}
              <div className="lg:col-span-2 bg-white rounded-card border border-nyaya-border shadow-subtle p-6 space-y-6">
                <h3 className="font-serif text-base font-bold text-nyaya-navy900 flex items-center gap-2 border-b border-nyaya-border pb-3">
                  <Clock className="w-4 h-4 text-nyaya-gold" />
                  <span>Chronological Sequence of Events</span>
                </h3>

                {timeline.timeline.length === 0 ? (
                  <p className="text-xs text-nyaya-muted">No chronological dates identified in factual narrative.</p>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-nyaya-gold/40">
                    {timeline.timeline.map((item, idx) => (
                      <div key={idx} className="relative space-y-1">
                        <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-nyaya-gold border-2 border-white ring-1 ring-nyaya-navy900/20" />
                        <span className="font-mono text-xs font-bold text-nyaya-navy900 block">
                          {item.date_str}
                        </span>
                        <p className="text-xs text-nyaya-text leading-relaxed">
                          {item.description}
                        </p>
                        {item.para_id && (
                          <button
                            onClick={() => scrollToParagraph(item.para_id!)}
                            className="font-mono text-[11px] text-nyaya-muted hover:text-nyaya-navy900 underline"
                          >
                            Source: {item.para_id}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Col: Extracted Entities Card */}
              <div className="bg-white rounded-card border border-nyaya-border shadow-subtle p-6 space-y-4">
                <h3 className="font-serif text-base font-bold text-nyaya-navy900 border-b border-nyaya-border pb-3">
                  Institutional Entities
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-nyaya-muted block font-medium">Court:</span>
                    <span className="font-semibold text-nyaya-navy900">{timeline.entities.court || "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-nyaya-muted block font-medium">Case Number:</span>
                    <span className="font-mono font-semibold text-nyaya-navy900">{timeline.entities.case_number || "Not specified"}</span>
                  </div>
                  {timeline.entities.judges.length > 0 && (
                    <div>
                      <span className="text-nyaya-muted block font-medium">Coram / Bench:</span>
                      <ul className="list-disc pl-4 text-nyaya-navy900 font-medium">
                        {timeline.entities.judges.map((j, i) => <li key={i}>{j}</li>)}
                      </ul>
                    </div>
                  )}
                  {timeline.entities.petitioners.length > 0 && (
                    <div>
                      <span className="text-nyaya-muted block font-medium">Petitioner(s):</span>
                      <p className="text-nyaya-text">{timeline.entities.petitioners.join(', ')}</p>
                    </div>
                  )}
                  {timeline.entities.respondents.length > 0 && (
                    <div>
                      <span className="text-nyaya-muted block font-medium">Respondent(s):</span>
                      <p className="text-nyaya-text">{timeline.entities.respondents.join(', ')}</p>
                    </div>
                  )}
                  {timeline.entities.statutes.length > 0 && (
                    <div>
                      <span className="text-nyaya-muted block font-medium">Governing Statutes:</span>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {timeline.entities.statutes.map((s, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-nyaya-ivory border border-nyaya-border font-mono text-[11px]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: VERIFICATION REPORT */}
          {activeTab === 'report' && (
            <div className="bg-white rounded-card border border-nyaya-border shadow-subtle p-8 max-w-3xl mx-auto space-y-6">
              <div className="flex items-center justify-between border-b border-nyaya-border pb-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-nyaya-navy900">
                    {t('report.title')}
                  </h3>
                  <span className="font-mono text-xs text-nyaya-muted">
                    Document ID: {docId} | Timestamp: {new Date().toISOString()}
                  </span>
                </div>
                <a
                  href={api.getVerificationReportUrl(docId)}
                  download
                  className="px-4 py-2 bg-nyaya-navy900 hover:bg-nyaya-navy700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-nyaya-gold" />
                  <span>{t('report.download_btn')}</span>
                </a>
              </div>

              {/* Statistics Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-nyaya-ivory/60 rounded-lg border border-nyaya-border text-center">
                  <span className="font-serif text-2xl font-bold text-nyaya-navy900 block">
                    {summary.stats.faithfulness_score}%
                  </span>
                  <span className="text-xs text-nyaya-muted font-medium">Factual Faithfulness</span>
                </div>
                <div className="p-4 bg-nyaya-supportedBg/60 rounded-lg border border-nyaya-supported/30 text-center">
                  <span className="font-serif text-2xl font-bold text-nyaya-supported block">
                    {summary.stats.supported_count}
                  </span>
                  <span className="text-xs text-nyaya-supported font-medium">Fully Supported</span>
                </div>
                <div className="p-4 bg-nyaya-partlyBg/60 rounded-lg border border-nyaya-partly/30 text-center">
                  <span className="font-serif text-2xl font-bold text-nyaya-partly block">
                    {summary.stats.partly_supported_count}
                  </span>
                  <span className="text-xs text-nyaya-partly font-medium">Partly Supported</span>
                </div>
                <div className="p-4 bg-nyaya-notSupportedBg/60 rounded-lg border border-nyaya-notSupported/30 text-center">
                  <span className="font-serif text-2xl font-bold text-nyaya-notSupported block">
                    {summary.stats.not_supported_count}
                  </span>
                  <span className="text-xs text-nyaya-notSupported font-medium">Not Supported</span>
                </div>
              </div>

              {/* Attestation Signature Box */}
              <div className="p-6 rounded-card border-2 border-dashed border-nyaya-border bg-nyaya-ivory/30 space-y-4">
                <span className="font-serif text-sm font-semibold text-nyaya-navy900 block">
                  Judicial Review Attestation Box
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-nyaya-muted block mb-1">Reviewed By (Advocate / Law Clerk):</label>
                    <input
                      type="text"
                      placeholder="e.g. Adv. R. K. Sharma (D/1422/2012)"
                      className="w-full p-2 bg-white border border-nyaya-border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-nyaya-muted block mb-1">Attestation Date:</label>
                    <input
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full p-2 bg-white border border-nyaya-border rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Disclaimer */}
              <p className="text-[11px] text-nyaya-muted text-center pt-2 font-mono">
                AI-assisted summary. Verify before use. Not legal advice.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
