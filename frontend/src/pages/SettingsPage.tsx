import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, HardDrive, Globe, CheckCircle2, Lock } from 'lucide-react';
import { api } from '../lib/api';
import { OutputLanguage } from '../lib/types';

interface SettingsPageProps {
  privacyMode: boolean;
  onTogglePrivacy: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  privacyMode,
  onTogglePrivacy,
}) => {
  const { t, i18n } = useTranslation();
  const [saveDocuments, setSaveDocuments] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then((s) => {
      setSaveDocuments(s.save_documents);
    });
  }, []);

  const handleSaveSettings = async () => {
    await api.updateSettings({
      anonymise_mode: privacyMode,
      save_documents: saveDocuments,
      preferred_language: (i18n.language as OutputLanguage) || 'en',
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Header */}
      <div className="border-b border-nyaya-border pb-4">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-nyaya-navy900 flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-nyaya-gold" />
          <span>{t('settings.title')}</span>
        </h1>
        <p className="text-xs sm:text-sm text-nyaya-muted mt-1">
          Configure client-side anonymisation, local storage policies, and review transparent data handling disclosures.
        </p>
      </div>

      <div className="space-y-6">
        {/* Toggle 1: Anonymise names before AI */}
        <div className="p-6 bg-white rounded-card border border-nyaya-border shadow-subtle flex items-start justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <h3 className="font-serif text-sm font-bold text-nyaya-navy900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-nyaya-gold" />
              <span>{t('settings.anonymise_title')}</span>
            </h3>
            <p className="text-xs text-nyaya-muted leading-relaxed">
              {t('settings.anonymise_desc')}
            </p>
          </div>
          <button
            onClick={onTogglePrivacy}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors focus:outline-none ${
              privacyMode ? 'bg-nyaya-supported' : 'bg-nyaya-border'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                privacyMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Toggle 2: Save my documents */}
        <div className="p-6 bg-white rounded-card border border-nyaya-border shadow-subtle flex items-start justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <h3 className="font-serif text-sm font-bold text-nyaya-navy900 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-nyaya-gold" />
              <span>{t('settings.save_title')}</span>
            </h3>
            <p className="text-xs text-nyaya-muted leading-relaxed">
              {t('settings.save_desc')}
            </p>
          </div>
          <button
            onClick={() => setSaveDocuments(!saveDocuments)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors focus:outline-none ${
              saveDocuments ? 'bg-nyaya-navy900' : 'bg-nyaya-border'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                saveDocuments ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Localization Preference */}
        <div className="p-6 bg-white rounded-card border border-nyaya-border shadow-subtle space-y-3">
          <h3 className="font-serif text-sm font-bold text-nyaya-navy900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-nyaya-gold" />
            <span>Default Interface Language</span>
          </h3>
          <div className="flex gap-2 text-xs">
            {[
              { code: 'en', label: 'English' },
              { code: 'hi', label: 'हिन्दी (Hindi)' },
              { code: 'mr', label: 'मराठी (Marathi)' },
            ].map((l) => (
              <button
                key={l.code}
                onClick={() => i18n.changeLanguage(l.code)}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  i18n.language === l.code
                    ? 'bg-nyaya-navy900 text-white font-bold border-nyaya-navy900'
                    : 'bg-nyaya-ivory text-nyaya-muted border-nyaya-border hover:text-nyaya-navy900'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plain Language Data Storage Disclosure */}
        <div className="p-6 bg-nyaya-ivory/60 rounded-card border border-nyaya-border space-y-3">
          <h3 className="font-serif text-sm font-bold text-nyaya-navy900">
            {t('settings.plain_title')}
          </h3>
          <p className="text-xs text-nyaya-muted leading-relaxed font-sans">
            {t('settings.plain_desc')}
          </p>
          <ul className="text-xs text-nyaya-muted space-y-1.5 list-disc pl-5">
            <li><strong>Transient Processing:</strong> Document text is parsed and held in-memory during your active browser session.</li>
            <li><strong>Zero Model Training:</strong> All LLM invocations occur via secure Anthropic enterprise API endpoints where inputs are not used to train models.</li>
            <li><strong>Audit Logs:</strong> No raw case text or client PII is written to system console logs.</li>
          </ul>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveSettings}
            className="px-5 py-2.5 bg-nyaya-navy900 hover:bg-nyaya-navy700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2"
          >
            {isSaved && <CheckCircle2 className="w-3.5 h-3.5 text-nyaya-supported" />}
            <span>{isSaved ? 'Settings Saved' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
