import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightLeft, Search, Scale, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { api } from '../lib/api';
import { MappingLookupResponse } from '../lib/types';

export const IpcBnsConverterPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedCode, setSelectedCode] = useState<string>('IPC');
  const [sectionNumber, setSectionNumber] = useState<string>('');
  const [result, setResult] = useState<MappingLookupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sectionNumber.trim()) return;

    setIsLoading(true);
    try {
      const res = await api.convertMapping(selectedCode, sectionNumber.trim());
      setResult(res);
    } catch (err: any) {
      alert('Error querying statutory mapping table: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (code: string, sec: string) => {
    setSelectedCode(code);
    setSectionNumber(sec);
    api.convertMapping(code, sec).then((res) => setResult(res));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Header */}
      <div className="border-b border-nyaya-border pb-4">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-nyaya-navy900 flex items-center gap-2.5">
          <ArrowRightLeft className="w-6 h-6 text-nyaya-gold" />
          <span>Statutory Correspondence Converter</span>
        </h1>
        <p className="text-xs sm:text-sm text-nyaya-muted mt-1">
          {t('converter.subtitle')}
        </p>
      </div>

      {/* Main Converter Tool Card */}
      <div className="bg-white rounded-card border border-nyaya-border shadow-subtle p-6 space-y-6">
        <form onSubmit={handleLookup} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Code Selector */}
            <div>
              <label className="text-xs font-semibold text-nyaya-navy900 block mb-1">
                Select Code
              </label>
              <select
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                className="w-full p-2.5 text-xs bg-nyaya-ivory/60 border border-nyaya-border rounded-lg focus:outline-none focus:border-nyaya-gold font-mono font-medium"
              >
                <optgroup label="Historic Codes">
                  <option value="IPC">IPC (Indian Penal Code, 1860)</option>
                  <option value="CrPC">CrPC (Code of Criminal Procedure, 1973)</option>
                  <option value="IEA">IEA (Indian Evidence Act, 1872)</option>
                </optgroup>
                <optgroup label="New 2023 Codes">
                  <option value="BNS">BNS (Bharatiya Nyaya Sanhita, 2023)</option>
                  <option value="BNSS">BNSS (Bharatiya Nagarik Suraksha Sanhita, 2023)</option>
                  <option value="BSA">BSA (Bharatiya Sakshya Adhiniyam, 2023)</option>
                </optgroup>
              </select>
            </div>

            {/* Section Input */}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-nyaya-navy900 block mb-1">
                Section Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sectionNumber}
                  onChange={(e) => setSectionNumber(e.target.value)}
                  placeholder={t('converter.input_placeholder')}
                  className="flex-1 p-2.5 text-xs font-mono bg-nyaya-ivory/60 border border-nyaya-border rounded-lg focus:outline-none focus:border-nyaya-gold"
                />
                <button
                  type="submit"
                  disabled={!sectionNumber.trim() || isLoading}
                  className="px-5 py-2.5 bg-nyaya-navy900 hover:bg-nyaya-navy700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5 text-nyaya-gold" />
                  <span>{t('converter.btn_convert')}</span>
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Quick Benchmarks */}
        <div className="pt-2 border-t border-nyaya-border/50">
          <span className="text-xs text-nyaya-muted font-medium block mb-2">
            Frequently Referenced Landmark Sections:
          </span>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { code: 'IPC', sec: '420', label: 'IPC 420 (Cheating)' },
              { code: 'IPC', sec: '302', label: 'IPC 302 (Murder)' },
              { code: 'CrPC', sec: '154', label: 'CrPC 154 (FIR)' },
              { code: 'CrPC', sec: '438', label: 'CrPC 438 (Anticipatory Bail)' },
              { code: 'CrPC', sec: '482', label: 'CrPC 482 (High Court Inherent Powers)' },
              { code: 'IEA', sec: '65B', label: 'IEA 65B (Electronic Evidence)' },
            ].map((b, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickSelect(b.code, b.sec)}
                className="px-2.5 py-1 bg-nyaya-ivory hover:bg-nyaya-highlight/60 border border-nyaya-border rounded-lg font-mono text-[11px] text-nyaya-navy900 transition-colors"
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Result Display Box */}
        {result && (
          <div className="pt-4 border-t border-nyaya-border space-y-4">
            {result.found ? (
              <div className="p-5 bg-nyaya-ivory/50 rounded-card border border-nyaya-gold/40 space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-sm font-bold text-nyaya-navy900">
                    Official Statutory Concordance
                  </span>
                  <span className="font-mono text-xs px-2.5 py-1 rounded bg-nyaya-supportedBg text-nyaya-supported font-bold border border-nyaya-supported/30">
                    Official Gazette Match
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-lg border border-nyaya-border space-y-1">
                    <span className="text-[11px] text-nyaya-muted font-medium">Historic Provision:</span>
                    <span className="font-mono text-sm font-bold text-nyaya-navy900 block">
                      {result.old_code} Section {result.old_section}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-nyaya-gold/60 space-y-1 shadow-xs">
                    <span className="text-[11px] text-nyaya-gold font-medium">Enacted Provision (2023):</span>
                    <span className="font-mono text-sm font-bold text-nyaya-navy900 block">
                      {result.new_code} Section {result.new_section}
                    </span>
                  </div>
                </div>

                {result.subject && (
                  <div className="p-3 bg-white rounded-lg border border-nyaya-border text-xs space-y-1">
                    <span className="text-nyaya-muted font-medium block">Subject Matter:</span>
                    <p className="font-medium text-nyaya-text">{result.subject}</p>
                  </div>
                )}

                {/* Mandatory Gazette Note */}
                <div className="flex items-center gap-2 p-3 bg-nyaya-partlyBg/50 border border-nyaya-partly/30 rounded-lg text-xs text-nyaya-navy900">
                  <AlertCircle className="w-4 h-4 text-nyaya-partly flex-shrink-0" />
                  <span className="font-mono">{t('converter.official_note')}: {result.note}</span>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-nyaya-ivory rounded-card border border-nyaya-border text-center space-y-2">
                <p className="text-xs font-semibold text-nyaya-navy900">
                  Section not found in current comparative mapping table.
                </p>
                <p className="text-xs text-nyaya-muted">
                  Please consult the Gazette comparative table PDF at <code className="font-mono">data/IPC_BNS_Mapping.pdf</code>.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
