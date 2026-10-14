import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare, Send, Mic, Volume2, VolumeX, Copy, Check,
  BookOpen, Sparkles, Loader2, ChevronDown, ChevronUp, Scale
} from 'lucide-react';
import { useLawAgent } from '../context/LawAgentContext';

export const LawAgentPage: React.FC = () => {
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

  const handleSendMessage = (textToSend?: string) => {
    sendMessage(textToSend);
  };


  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-nyaya-border pb-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-nyaya-navy900 flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-nyaya-gold" />
            <span>AI Law Agent</span>
          </h1>
          <p className="text-xs sm:text-sm text-nyaya-muted mt-1">
            Grounded Multilingual Legal Intelligence (RAG over Constitution & Central Acts with Tool Routing).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound / Voice Toggle */}
          <button
            onClick={toggleAutoRead}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              autoRead
                ? 'bg-nyaya-gold/15 text-nyaya-navy900 border-nyaya-gold shadow-xs font-semibold'
                : 'bg-white text-nyaya-muted border-nyaya-border hover:text-nyaya-navy900'
            }`}
            title={autoRead ? 'Voice auto-read enabled (Click to turn off)' : 'Voice auto-read disabled (Click to turn on)'}
          >
            {autoRead ? (
              <Volume2 className="w-3.5 h-3.5 text-nyaya-gold" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            <span>{autoRead ? 'Voice: ON' : 'Voice: OFF'}</span>
          </button>

          {/* Mode Selector */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-nyaya-border text-xs">
            <button
              onClick={() => setMode('simple')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                mode === 'simple'
                  ? 'bg-nyaya-navy900 text-white font-semibold'
                  : 'text-nyaya-muted hover:text-nyaya-navy900'
              }`}
            >
              {t('agent.mode_simple')}
            </button>
            <button
              onClick={() => setMode('lawyer')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                mode === 'lawyer'
                  ? 'bg-nyaya-navy900 text-white font-semibold'
                  : 'text-nyaya-muted hover:text-nyaya-navy900'
              }`}
            >
              {t('agent.mode_lawyer')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Box */}
      <div className="bg-white rounded-card border border-nyaya-border shadow-subtle flex flex-col h-[650px] overflow-hidden">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-nyaya-ivory/20">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-card text-xs sm:text-sm leading-relaxed space-y-2.5 ${
                  m.role === 'user'
                    ? 'bg-nyaya-navy900 text-white rounded-br-none shadow-subtle'
                    : 'bg-white text-nyaya-text rounded-bl-none border border-nyaya-border shadow-subtle'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content.replace(/\*\*/g, '')}</div>

                {m.role === 'assistant' && (
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-nyaya-border/30 text-nyaya-muted">
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
                          <VolumeX className="w-4 h-4 text-red-600 animate-pulse" />
                          <span className="text-[11px] text-red-600">Stop</span>
                        </>
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleCopyMessage(m.content, idx)}
                      className="hover:text-nyaya-navy900 p-1 rounded"
                      title="Copy text"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-4 h-4 text-nyaya-supported" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 bg-white rounded-card border border-nyaya-border w-52 text-xs text-nyaya-muted">
              <Loader2 className="w-4 h-4 animate-spin text-nyaya-gold" />
              <span>Verifying legal texts...</span>
            </div>
          )}

          {/* Sources Used Expandable Box */}
          {sources.length > 0 && (
            <div className="bg-white rounded-card border border-nyaya-border shadow-subtle overflow-hidden text-xs max-w-2xl">
              <button
                onClick={() => setIsSourcesOpen(!isSourcesOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-nyaya-ivory hover:bg-nyaya-border/40 transition-colors border-b border-nyaya-border/50 text-nyaya-navy900 font-semibold"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-nyaya-gold" />
                  <span>Sources Used ({sources.length} statutory chunks)</span>
                </div>
                {isSourcesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {isSourcesOpen && (
                <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                  {sources.map((s, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3 rounded-lg bg-nyaya-ivory/50 border border-nyaya-border/50 space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono text-xs font-semibold text-nyaya-navy900">
                        <span>{s.doc_name} — {s.unit_type} {s.unit_number}</span>
                        {s.score && (
                          <span className="text-nyaya-supported font-normal">
                            Fidelity Match: {(s.score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      {s.title && (
                        <p className="font-serif text-xs text-nyaya-navy700 font-medium">{s.title}</p>
                      )}
                      <p className="text-xs text-nyaya-muted leading-relaxed font-mono">
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

        {/* Input & Suggested Chips */}
        <div className="p-4 bg-white border-t border-nyaya-border space-y-3">
          {/* Quick Query Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              "What rights are guaranteed under Article 21?",
              "Map Section 420 IPC to BNS",
              "Arrest guidelines under Section 41 CrPC vs 35 BNSS",
              "Inherent powers of High Court under Section 482",
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                className="whitespace-nowrap px-3 py-1 bg-nyaya-ivory hover:bg-nyaya-highlight/60 border border-nyaya-border rounded-full text-nyaya-text transition-colors font-medium"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={t('agent.input_placeholder')}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-nyaya-ivory/60 border border-nyaya-border rounded-lg focus:outline-none focus:border-nyaya-gold"
            />
            <button
              onClick={handleVoiceInput}
              className={`p-2.5 rounded-lg border transition-colors ${
                isRecording
                  ? 'bg-nyaya-notSupported text-white border-nyaya-notSupported animate-pulse'
                  : 'bg-nyaya-ivory text-nyaya-navy900 border-nyaya-border hover:bg-nyaya-border/50'
              }`}
              title={t('agent.voice_input')}
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              className="px-4 py-2.5 bg-nyaya-navy900 hover:bg-nyaya-navy700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
