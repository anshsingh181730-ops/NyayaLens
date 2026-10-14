import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, X, Maximize2 } from 'lucide-react';
import { useLawAgent } from '../context/LawAgentContext';
import { useAuth } from '../context/AuthContext';
import { LawAgentChatBody } from './LawAgentChatBody';

export const FloatingLawAgentWidget: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFloatingOpen, toggleFloatingAgent, closeFloatingAgent } = useLawAgent();

  const [hasPulsed, setHasPulsed] = useState(false);

  // Subtle one-time pulse on first page load only
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasPulsed(true);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  // Esc key closes the panel; clicking outside does NOT close it
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFloatingOpen) {
        closeFloatingAgent();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFloatingOpen, closeFloatingAgent]);

  // Do NOT show the button on the sign-in page, if not signed in, or on the full-page /agent route
  if (!user || location.pathname === '/signin' || location.pathname === '/agent') {
    return null;
  }

  const handleExpand = () => {
    closeFloatingAgent();
    navigate('/agent');
  };

  return (
    <>
      {/* Floating Chat Panel */}
      <AnimatePresence>
        {isFloatingOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 sm:inset-auto sm:bottom-[92px] sm:right-6 sm:w-[400px] sm:h-[600px] sm:max-h-[80vh] sm:rounded-[16px] bg-white border border-[#E4DED0] shadow-elevated flex flex-col overflow-hidden"
          >
            {/* Navy Panel Header */}
            <div className="bg-nyaya-navy900 text-white px-4 py-3 flex items-center justify-between border-b border-nyaya-navy700 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-nyaya-navy700 flex items-center justify-center text-nyaya-gold border border-nyaya-gold/30 shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-serif text-sm font-bold text-white tracking-tight leading-tight truncate">
                    {t('agent.title', 'AI Law Agent')}
                  </h2>
                  <p className="text-[11px] text-white/70 font-sans leading-none truncate">
                    {t('agent.panel_subtitle', 'Verified answers from Indian law texts')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={handleExpand}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-nyaya-navy700 rounded-md transition-colors focus:outline-none"
                  title={t('agent.expand', 'Expand to full page')}
                  aria-label={t('agent.expand', 'Expand to full page')}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={closeFloatingAgent}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-nyaya-navy700 rounded-md transition-colors focus:outline-none"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Panel Body: Reused Law Agent Chat Body */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <LawAgentChatBody />
            </div>

            {/* Panel Footer Note */}
            <div className="px-3 py-1.5 bg-nyaya-ivory border-t border-[#E4DED0] text-[11px] text-nyaya-muted text-center font-sans shrink-0">
              {t('agent.disclaimer', 'General legal information, not legal advice.')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating AI Chatbot Circular Button */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 group">
        {/* Tooltip on Hover */}
        {!isFloatingOpen && (
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-nyaya-navy900 text-white text-xs rounded-md shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-nyaya-navy700 font-medium">
            {t('agent.tooltip', 'Ask the AI Law Agent')}
          </div>
        )}

        <button
          onClick={toggleFloatingAgent}
          aria-label={
            isFloatingOpen
              ? 'Close AI Law Agent'
              : t('agent.tooltip', 'Ask the AI Law Agent')
          }
          className={`w-14 h-14 sm:w-[60px] sm:h-[60px] rounded-full bg-[#0B1F3A] flex items-center justify-center text-[#C9A227] shadow-elevated border border-[#C9A227]/30 hover:ring-2 hover:ring-[#C9A227] hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2 ${
            !hasPulsed ? 'animate-pulse' : ''
          }`}
        >
          {isFloatingOpen ? (
            <X className="w-6 h-6 text-[#C9A227]" />
          ) : (
            <Scale className="w-6 h-6 text-[#C9A227]" />
          )}
        </button>
      </div>
    </>
  );
};
