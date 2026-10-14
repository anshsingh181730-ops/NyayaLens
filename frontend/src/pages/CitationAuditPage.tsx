import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload, FileSearch, Download, Filter, CheckCircle,
  AlertTriangle, BookOpen, Loader2
} from 'lucide-react';
import { api } from '../lib/api';
import { CitationsAuditResponse } from '../lib/types';
import { VerificationBadge } from '../components/VerificationBadge';
import { EmptyState } from '../components/EmptyState';

export const CitationAuditPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<CitationsAuditResponse | null>(null);
  const [filter, setFilter] = useState<'all' | 'Verified' | 'Found in document only' | 'Could not verify'>('all');

  const handleAudit = async (fileObj?: File, text?: string) => {
    setIsLoading(true);
    try {
      const res = await api.auditDocument(fileObj, text, fileObj?.name || 'Uploaded_Draft.txt');
      setAuditResult(res);
    } catch (err: any) {
      alert('Error auditing document: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="border-b border-nyaya-border pb-4">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-nyaya-navy900">
          Independent Statutory & Citation Audit
        </h1>
        <p className="text-xs sm:text-sm text-nyaya-muted mt-1">
          Upload any petition, counter affidavit, judicial order, or draft pleading to audit every citation against verified legal authorities.
        </p>
      </div>

      {/* Upload & Input Card */}
      <div className="bg-white rounded-card border border-nyaya-border shadow-subtle p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border-2 border-dashed border-nyaya-border hover:border-nyaya-gold/70 rounded-card p-6 flex flex-col items-center justify-center text-center bg-nyaya-ivory/30 space-y-3 transition-colors">
          <Upload className="w-8 h-8 text-nyaya-gold" />
          <div>
            <span className="text-xs font-semibold text-nyaya-navy900 block">
              Upload Petition, Order, or Draft Filing (PDF)
            </span>
            <span className="text-[11px] text-nyaya-muted">
              Detects SCC, AIR, SCR, Neutral Citations, and Central Act sections
            </span>
          </div>
          <input
            type="file"
            accept=".pdf"
            id="audit-file-input"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                const f = e.target.files[0];
                setSelectedFile(f);
                handleAudit(f);
              }
            }}
          />
          <label
            htmlFor="audit-file-input"
            className="px-4 py-2 bg-nyaya-navy900 hover:bg-nyaya-navy700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
          >
            Select PDF Document
          </label>
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-xs font-semibold text-nyaya-navy900">
            Or Paste Document Excerpt
          </label>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste draft text containing citations (e.g. As held in (2014) 8 SCC 273 and under Section 482 of CrPC...)"
            rows={5}
            className="w-full p-3 text-xs font-mono bg-nyaya-ivory/40 border border-nyaya-border rounded-card focus:outline-none focus:border-nyaya-gold"
          />
          <button
            onClick={() => handleAudit(undefined, pastedText)}
            disabled={!pastedText.trim() || isLoading}
            className="self-end px-4 py-2 bg-nyaya-navy900 hover:bg-nyaya-navy700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSearch className="w-3.5 h-3.5 text-nyaya-gold" />}
            <span>Run Citation Audit</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-8 bg-white rounded-card border border-nyaya-border text-center space-y-3">
          <Loader2 className="w-8 h-8 text-nyaya-gold animate-spin mx-auto" />
          <p className="text-xs font-semibold text-nyaya-navy900 font-mono">
            Scanning document for case law citations and statutory provisions...
          </p>
        </div>
      )}

      {/* Results Section */}
      {auditResult && !isLoading && (
        <div className="space-y-6">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-card border border-nyaya-border text-center shadow-xs">
              <span className="font-serif text-2xl font-bold text-nyaya-navy900 block">
                {auditResult.total_citations}
              </span>
              <span className="text-xs text-nyaya-muted">Total Authorities Found</span>
            </div>
            <div className="p-4 bg-nyaya-supportedBg/60 rounded-card border border-nyaya-supported/30 text-center">
              <span className="font-serif text-2xl font-bold text-nyaya-supported block">
                {auditResult.verified_count}
              </span>
              <span className="text-xs text-nyaya-supported">Verified in Repository</span>
            </div>
            <div className="p-4 bg-nyaya-partlyBg/60 rounded-card border border-nyaya-partly/30 text-center">
              <span className="font-serif text-2xl font-bold text-nyaya-partly block">
                {auditResult.doc_only_count}
              </span>
              <span className="text-xs text-nyaya-partly">In Document Only</span>
            </div>
            <div className="p-4 bg-nyaya-notSupportedBg/60 rounded-card border border-nyaya-notSupported/30 text-center">
              <span className="font-serif text-2xl font-bold text-nyaya-notSupported block">
                {auditResult.could_not_verify_count}
              </span>
              <span className="text-xs text-nyaya-notSupported">Manual Check Required</span>
            </div>
          </div>

          {/* Audit Results Table Card */}
          <div className="bg-white rounded-card border border-nyaya-border shadow-subtle p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-nyaya-border pb-4">
              <div>
                <h3 className="font-serif text-base font-bold text-nyaya-navy900">
                  Authority Audit Results
                </h3>
                <span className="text-xs text-nyaya-muted">
                  Never labeled fake; unverified entries require manual verification.
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-nyaya-ivory p-1 rounded-lg border border-nyaya-border text-xs">
                  <Filter className="w-3.5 h-3.5 text-nyaya-muted ml-1" />
                  {(['all', 'Verified', 'Found in document only', 'Could not verify'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilter(st)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        filter === st
                          ? 'bg-nyaya-navy900 text-white'
                          : 'text-nyaya-muted hover:text-nyaya-navy900'
                      }`}
                    >
                      {st === 'all' ? 'All' : st}
                    </button>
                  ))}
                </div>

                <a
                  href={api.getAuditReportUrl(auditResult.document_id)}
                  download
                  className="px-3 py-1.5 bg-nyaya-navy900 hover:bg-nyaya-navy700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-nyaya-gold" />
                  <span>Download Report (PDF)</span>
                </a>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-nyaya-ivory text-nyaya-navy900 font-semibold border-b border-nyaya-border">
                  <tr>
                    <th className="p-3">Citation / Authority</th>
                    <th className="p-3 w-28">Type</th>
                    <th className="p-3 w-48">Status</th>
                    <th className="p-3">Factual Context / Quote Check</th>
                    <th className="p-3 w-24 text-center">Source Tag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nyaya-border/50">
                  {auditResult.citations
                    .filter((c) => filter === 'all' || c.status === filter)
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
                          {c.context_snippet && (
                            <p className="font-mono text-nyaya-text italic">
                              "...{c.context_snippet}..."
                            </p>
                          )}
                          {c.quoted_text && (
                            <p className="text-nyaya-text">
                              Quote: <span className="font-semibold">"{c.quoted_text}"</span> ({c.quote_verified ? 'Verified in text' : 'Unmatched'})
                            </p>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {c.para_ids.map((pid, pIdx) => (
                            <span
                              key={pIdx}
                              className="font-mono text-[11px] bg-nyaya-ivory px-1.5 py-0.5 rounded border border-nyaya-border inline-block"
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
          </div>
        </div>
      )}
    </div>
  );
};
