import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck, FileSearch, CheckCircle, ArrowRight,
  Scale, FileText, Check, AlertCircle
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-16 py-6 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-6 sm:pt-10 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nyaya-ivory border border-nyaya-border text-xs font-semibold text-nyaya-navy900 shadow-xs">
          <Scale className="w-3.5 h-3.5 text-nyaya-gold" />
          <span>{t('tagline')}</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-nyaya-navy900 leading-tight">
          {t('landing.hero_title')}
        </h1>

        <p className="text-sm sm:text-base text-nyaya-muted leading-relaxed max-w-2xl mx-auto font-sans">
          {t('landing.hero_subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/workspace')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-nyaya-navy900 hover:bg-nyaya-navy700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
          >
            <span>{t('landing.cta_start')}</span>
            <ArrowRight className="w-4 h-4 text-nyaya-gold" />
          </button>
          <button
            onClick={() => navigate('/audit')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-nyaya-ivory text-nyaya-navy900 border border-nyaya-border text-sm font-semibold rounded-lg transition-colors"
          >
            <span>{t('landing.cta_audit')}</span>
          </button>
        </div>
      </section>

      {/* 3 Core Differentiators */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="font-serif text-2xl font-bold text-nyaya-navy900">
            {t('landing.diff_title')}
          </h2>
          <p className="text-xs text-nyaya-muted font-sans">
            Engineered specifically to solve generative hallucinations in Indian court practice
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 bg-white rounded-card border border-nyaya-border shadow-subtle hover:border-nyaya-gold/50 transition-all space-y-3">
            <div className="w-10 h-10 rounded-lg bg-nyaya-ivory flex items-center justify-center text-nyaya-gold border border-nyaya-border/60">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-base font-bold text-nyaya-navy900">
              {t('landing.diff1_title')}
            </h3>
            <p className="text-xs text-nyaya-muted leading-relaxed font-sans">
              {t('landing.diff1_desc')}
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 bg-white rounded-card border border-nyaya-border shadow-subtle hover:border-nyaya-gold/50 transition-all space-y-3">
            <div className="w-10 h-10 rounded-lg bg-nyaya-ivory flex items-center justify-center text-nyaya-gold border border-nyaya-border/60">
              <FileSearch className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-base font-bold text-nyaya-navy900">
              {t('landing.diff2_title')}
            </h3>
            <p className="text-xs text-nyaya-muted leading-relaxed font-sans">
              {t('landing.diff2_desc')}
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 bg-white rounded-card border border-nyaya-border shadow-subtle hover:border-nyaya-gold/50 transition-all space-y-3">
            <div className="w-10 h-10 rounded-lg bg-nyaya-ivory flex items-center justify-center text-nyaya-gold border border-nyaya-border/60">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-base font-bold text-nyaya-navy900">
              {t('landing.diff3_title')}
            </h3>
            <p className="text-xs text-nyaya-muted leading-relaxed font-sans">
              {t('landing.diff3_desc')}
            </p>
          </div>
        </div>
      </section>

      {/* How It Works 4-Step Strip */}
      <section className="p-8 bg-nyaya-ivory/60 rounded-card border border-nyaya-border space-y-6">
        <h2 className="font-serif text-xl font-bold text-nyaya-navy900 text-center">
          {t('landing.how_it_works')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: t('landing.step1'), desc: "Native PyMuPDF page parsing with Tesseract OCR fallback on scanned pages." },
            { step: t('landing.step2'), desc: "Preserves authentic judicial numbering (¶1, ¶2, [12]) into discrete verifiable units." },
            { step: t('landing.step3'), desc: "Map-reduce extraction enforcing paragraph-tag citations for every sentence." },
            { step: t('landing.step4'), desc: "LLM judge checks each claim against cited text, calculating factual fidelity." }
          ].map((item, idx) => (
            <div key={idx} className="p-4 bg-white rounded-lg border border-nyaya-border/80 shadow-xs space-y-1.5">
              <span className="font-mono text-xs font-bold text-nyaya-gold block">0{idx + 1}</span>
              <h4 className="font-serif text-sm font-semibold text-nyaya-navy900">{item.step.split('. ')[1]}</h4>
              <p className="text-xs text-nyaya-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Strip: Others summarize. NyayaLens verifies. */}
      <section className="p-8 bg-nyaya-navy900 text-white rounded-card shadow-subtle space-y-4">
        <div className="max-w-3xl space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-nyaya-gold font-semibold">
            Institutional Standard
          </span>
          <h2 className="font-serif text-2xl font-bold">
            {t('landing.comparison_heading')}
          </h2>
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-sans">
            {t('landing.comparison_text')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-3.5 bg-nyaya-navy700/60 rounded-lg border border-nyaya-navy700 text-xs space-y-1">
            <span className="font-semibold text-nyaya-notSupported flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Traditional GenAI Summaries
            </span>
            <p className="text-white/70">Unattributed claims, hallucinated case citations, no way to audit quote accuracy in court.</p>
          </div>
          <div className="p-3.5 bg-nyaya-navy700/60 rounded-lg border border-nyaya-gold/40 text-xs space-y-1">
            <span className="font-semibold text-nyaya-supported flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> NyayaLens Protocol
            </span>
            <p className="text-white/70">Every line linked to exact paragraph tags [¶12], support status popover, verifiable report PDF.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
