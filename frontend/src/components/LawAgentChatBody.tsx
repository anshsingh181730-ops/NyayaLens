import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send, Mic, Volume2, VolumeX, Copy, Check, ChevronDown, ChevronUp,
  BookOpen, Loader2
} from 'lucide-react';
import { useLawAgent } from '../context/LawAgentContext';

export const LawAgentChatBody: React.FC = () => {
  const { t } = useTranslation();
  const {
    messages,
    inputText,
    setInputText,
    isLoading,
    mode,
    setMode,
    sources,
    isSourcesOpen,
    setIsSourcesOpen,
    isRecording,
    copiedIndex,
    speakingMessageIndex,
    autoRead,
    toggleAutoRead,
    sendMessage,
    handleVoiceInput,
    handleCopyMessage,
    handleReadAloud,
  } = useLawAgent();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Mode Controls Bar */}
      <div className="px-4 py-2 bg-nyaya-ivory border-b border-nyaya-border flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-nyaya-border">
          <button
            onClick={() => setMode('simple')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              mode === 'simple'
                ? 'bg-nyaya-navy900 text-white shadow-xs'
                : 'text-nyaya-muted hover:text-nyaya-navy900'
            }`}
          >
            {t('agent.mode_simple', 'Explain Simply')}
          </button>
          <button
            onClick={() => setMode('lawyer')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              mode === 'lawyer'
                ? 'bg-nyaya-navy900 text-white shadow-xs'
                : 'text-nyaya-muted hover:text-nyaya-navy900'
            }`}
          >
            {t('agent.mode_lawyer', 'Lawyer Mode')}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAutoRead}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              autoRead
                ? 'bg-nyaya-gold/20 text-nyaya-navy900 font-semibold'
                : 'text-nyaya-muted hover:text-nyaya-navy900'
            }`}
            title={autoRead ? 'Voice auto-read ON (Click to turn off)' : 'Voice auto-read OFF (Click to turn on)'}
          >
            {autoRead ? (
              <Volume2 className="w-3.5 h-3.5 text-nyaya-gold" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            <span>{autoRead ? 'Voice: ON' : 'Voice: OFF'}</span>
          </button>
          <span className="text-[11px] font-mono text-nyaya-muted">
            Memory: 6 turns
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-nyaya-ivory/30 min-h-0">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              m.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[88%] p-3.5 rounded-card text-xs leading-relaxed space-y-2 ${
                m.role === 'user'
                  ? 'bg-nyaya-navy900 text-white rounded-br-none shadow-subtle'
                  : 'bg-white text-nyaya-text rounded-bl-none border border-nyaya-border shadow-subtle'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content.replace(/\*\*/g, '')}</div>

              {m.role === 'assistant' && (
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-nyaya-border/30 text-nyaya-muted">
                  <button
                    onClick={() => handleReadAloud(m.content, idx)}
                    className={`p-1 rounded transition-colors flex items-center gap-1 text-xs ${
                      speakingMessageIndex === idx
                        ? 'text-red-600 bg-red-50 hover:bg-red-100 font-medium'
                        : 'hover:text-nyaya-navy900'
                    }`}
                    title={speakingMessageIndex === idx ? 'Stop Reading' : 'Read Aloud'}
                  >
                    {speakingMessageIndex === idx ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                        <span className="text-[10px] text-red-600">Stop</span>
                      </>
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleCopyMessage(m.content, idx)}
                    className="hover:text-nyaya-navy900 p-0.5"
                    title="Copy response"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-nyaya-supported" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-white rounded-card border border-nyaya-border w-48 text-xs text-nyaya-muted">
            <Loader2 className="w-4 h-4 animate-spin text-nyaya-gold" />
            <span>Verifying statutory text...</span>
          </div>
        )}

        {/* Sources Used Card */}
        {sources.length > 0 && (
          <div className="bg-white rounded-card border border-nyaya-border shadow-subtle overflow-hidden text-xs">
            <button
              onClick={() => setIsSourcesOpen(!isSourcesOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-nyaya-ivory hover:bg-nyaya-border/30 transition-colors border-b border-nyaya-border/50 text-nyaya-navy900 font-semibold"
            >
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-nyaya-gold" />
                <span>Sources Used ({sources.length} verified provisions)</span>
              </div>
              {isSourcesOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {isSourcesOpen && (
              <div className="p-3 space-y-2.5 max-h-60 overflow-y-auto">
                {sources.map((s, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-2 rounded bg-nyaya-ivory/50 border border-nyaya-border/50 space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px] font-semibold text-nyaya-navy900">
                      <span>
                        {s.doc_name} — {s.unit_type} {s.unit_number}
                      </span>
                      {s.score && (
                        <span className="text-nyaya-supported font-normal">
                          Match: {(s.score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    {s.title && (
                      <p className="font-serif text-[11px] text-nyaya-navy700 font-medium">
                        {s.title}
                      </p>
                    )}
                    <p className="text-[11px] text-nyaya-muted leading-relaxed font-mono">
                      "{s.snippet}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Tray */}
      <div className="p-3 bg-white border-t border-nyaya-border space-y-2 shrink-0">
        {/* Suggested Queries */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
          {['Article 21 Rights', 'Section 420 IPC in BNS', 'Anticipatory Bail BNSS'].map(
            (chip, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(chip)}
                className="whitespace-nowrap px-2 py-0.5 bg-nyaya-ivory hover:bg-nyaya-highlight/60 border border-nyaya-border rounded-full text-nyaya-text transition-colors"
              >
                {chip}
              </button>
            )
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={t(
              'agent.input_placeholder',
              'Ask about constitutional articles, statutory sections...'
            )}
            className="flex-1 px-3 py-2 text-xs bg-nyaya-ivory/60 border border-nyaya-border rounded-lg focus:outline-none focus:border-nyaya-gold"
          />
          <button
            onClick={handleVoiceInput}
            className={`p-2 rounded-lg border transition-colors ${
              isRecording
                ? 'bg-nyaya-notSupported text-white border-nyaya-notSupported animate-pulse'
                : 'bg-nyaya-ivory text-nyaya-navy900 border-nyaya-border hover:bg-nyaya-border/50'
            }`}
            title={t('agent.voice_input', 'Voice Input')}
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            onClick={() => sendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="p-2 bg-nyaya-navy900 hover:bg-nyaya-navy700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
