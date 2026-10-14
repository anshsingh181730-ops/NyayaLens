import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Search, MessageSquare, ChevronRight, FileText, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

interface LawLibraryPageProps {
  onOpenLawAgent: (query?: string) => void;
}

export const LawLibraryPage: React.FC<LawLibraryPageProps> = ({ onOpenLawAgent }) => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadLaws();
  }, []);

  const loadLaws = async (q?: string) => {
    setIsLoading(true);
    try {
      const res = await api.browseLaws(q);
      setDocuments(res.documents || []);
      if (res.documents && res.documents.length > 0) {
        setSelectedDoc(res.documents[0]);
        if (res.documents[0].units && res.documents[0].units.length > 0) {
          setSelectedUnit(res.documents[0].units[0]);
        }
      }
    } catch (err) {
      console.error('Error loading law documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLaws(searchQuery);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-nyaya-border pb-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-nyaya-navy900 flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-nyaya-gold" />
            <span>Verified Law Library</span>
          </h1>
          <p className="text-xs sm:text-sm text-nyaya-muted mt-1">
            Browse authentic statutory provisions from the Constitution of India and Central Acts.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-nyaya-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Article 21, 14, 19..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-nyaya-border rounded-lg focus:outline-none focus:border-nyaya-gold"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-nyaya-navy900 hover:bg-nyaya-navy700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Main Browse Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Documents & Units List (5 cols) */}
        <div className="md:col-span-5 bg-white rounded-card border border-nyaya-border shadow-subtle p-4 space-y-4 max-h-[700px] overflow-y-auto">
          {documents.map((doc, dIdx) => (
            <div key={dIdx} className="space-y-2">
              <div
                onClick={() => {
                  setSelectedDoc(doc);
                  if (doc.units && doc.units.length > 0) setSelectedUnit(doc.units[0]);
                }}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedDoc?.document_name === doc.document_name
                    ? 'bg-nyaya-ivory border-nyaya-gold/60 font-semibold'
                    : 'hover:bg-nyaya-ivory/50 border-nyaya-border/50'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-nyaya-navy900">
                  <span className="font-serif font-bold">{doc.document_name}</span>
                  <span className="font-mono text-[10px] text-nyaya-muted bg-white px-1.5 py-0.5 rounded border border-nyaya-border/60">
                    {doc.total_units} units
                  </span>
                </div>
                <span className="text-[11px] text-nyaya-muted block mt-0.5 font-normal">
                  Source: {doc.source}
                </span>
              </div>

              {/* Units within document */}
              {selectedDoc?.document_name === doc.document_name && (
                <div className="pl-3 space-y-1.5 border-l-2 border-nyaya-gold/40">
                  {doc.units?.map((unit: any, uIdx: number) => {
                    const isSelected = selectedUnit?.number === unit.number;
                    return (
                      <div
                        key={uIdx}
                        onClick={() => setSelectedUnit(unit)}
                        className={`p-2 rounded text-xs cursor-pointer transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-nyaya-navy900 text-white font-semibold'
                            : 'hover:bg-nyaya-ivory text-nyaya-text'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-mono text-[11px]">{unit.unit_type.toUpperCase()} {unit.number}:</span>
                          <span className="truncate">{unit.title}</span>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-nyaya-gold' : 'text-nyaya-muted'}`} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right Column: Provision Text & Metadata (7 cols) */}
        <div className="md:col-span-7 bg-white rounded-card border border-nyaya-border shadow-subtle p-6 space-y-6">
          {selectedUnit ? (
            <>
              {/* Unit Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-nyaya-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-nyaya-ivory text-nyaya-navy900 font-bold border border-nyaya-border">
                      {selectedUnit.unit_type.toUpperCase()} {selectedUnit.number}
                    </span>
                    <span className="text-xs text-nyaya-supported font-medium">
                      Status: {selectedUnit.status || 'In Force'}
                    </span>
                  </div>
                  <h2 className="font-serif text-lg font-bold text-nyaya-navy900 mt-2">
                    {selectedUnit.title}
                  </h2>
                  {selectedUnit.part && (
                    <span className="text-xs text-nyaya-muted block font-medium">
                      {selectedUnit.part}
                    </span>
                  )}
                </div>

                <button
                  onClick={() =>
                    onOpenLawAgent(`Explain ${selectedUnit.unit_type} ${selectedUnit.number} of ${selectedDoc?.document_name || 'statute'}`)
                  }
                  className="px-3.5 py-2 bg-nyaya-navy900 hover:bg-nyaya-navy700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2 whitespace-nowrap self-start"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-nyaya-gold" />
                  <span>{t('library.ask_agent')}</span>
                </button>
              </div>

              {/* Official Text Box */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-nyaya-muted uppercase tracking-wider block font-mono">
                  Official Gazette Text:
                </span>
                <div className="p-4 rounded-lg bg-nyaya-ivory/50 border border-nyaya-border/70 text-xs sm:text-sm leading-relaxed text-nyaya-text font-serif">
                  {selectedUnit.text}
                </div>
              </div>

              {/* Verified Attribution Note */}
              <div className="p-3 bg-nyaya-supportedBg/40 border border-nyaya-supported/20 rounded-lg text-xs text-nyaya-navy900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-nyaya-supported flex-shrink-0" />
                <span>Verified text loaded from authentic central statutory repository.</span>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-xs text-nyaya-muted">
              Select an Article or Section on the left to read official text.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
