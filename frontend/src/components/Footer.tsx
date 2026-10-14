import React from 'react';
import { useTranslation } from 'react-i18next';
import { Scale, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="w-full bg-white border-t border-nyaya-border py-6 px-4 sm:px-8 mt-auto text-xs text-nyaya-muted">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-nyaya-navy900 font-semibold font-serif">
          <Scale className="w-4 h-4 text-nyaya-gold" />
          <span>NyayaLens</span>
          <span className="text-nyaya-muted font-sans font-normal text-[11px]">
            — Indian Judicial Intelligence Prototype
          </span>
        </div>

        {/* Mandatory Statutory Disclaimer */}
        <div className="flex items-center gap-1.5 text-center sm:text-right font-medium text-nyaya-navy900">
          <ShieldCheck className="w-3.5 h-3.5 text-nyaya-gold" />
          <span>{t('footer_disclaimer')}</span>
        </div>
      </div>
    </footer>
  );
};
