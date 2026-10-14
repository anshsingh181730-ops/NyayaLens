import React, { createContext, useContext, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { speechService } from '../lib/speech';
import { AgentChatMessage, AgentSourceItem, OutputLanguage } from '../lib/types';

interface LawAgentContextType {
  messages: AgentChatMessage[];
  inputText: string;
  setInputText: (text: string) => void;
  isLoading: boolean;
  mode: 'simple' | 'lawyer';
  setMode: (mode: 'simple' | 'lawyer') => void;
  sources: AgentSourceItem[];
  isSourcesOpen: boolean;
  setIsSourcesOpen: (open: boolean) => void;
  isRecording: boolean;
  copiedIndex: number | null;
  speakingMessageIndex: number | null;
  isSpeaking: boolean;
  autoRead: boolean;
  toggleAutoRead: () => void;
  stopSpeaking: () => void;
  documentId: string | undefined;
  setDocumentId: (id?: string) => void;
  sendMessage: (textToSend?: string, docId?: string) => Promise<void>;
  handleVoiceInput: () => void;
  handleCopyMessage: (content: string, idx: number) => void;
  handleReadAloud: (content: string, idx?: number) => void;
  isFloatingOpen: boolean;
  setIsFloatingOpen: (open: boolean) => void;
  openFloatingAgent: (query?: string, docId?: string) => void;
  closeFloatingAgent: () => void;
  toggleFloatingAgent: () => void;
}

const LawAgentContext = createContext<LawAgentContextType | undefined>(undefined);

export const LawAgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();

  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Greetings. I am the NyayaLens AI Law Agent. You can query statutory provisions, the Constitution, criminal code mappings (IPC to BNS), or analysis of the active judgment. Every answer is grounded in verified legal texts.',
      tool_used: 'general_help',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'simple' | 'lawyer'>('simple');
  const [sources, setSources] = useState<AgentSourceItem[]>([]);
  const [isSourcesOpen, setIsSourcesOpen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [documentId, setDocumentId] = useState<string | undefined>();
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);

  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [autoRead, setAutoRead] = useState<boolean>(false);

  const stopSpeaking = () => {
    speechService.stopSpeaking();
    setSpeakingMessageIndex(null);
    setIsSpeaking(false);
  };

  const toggleAutoRead = () => {
    setAutoRead((prev) => {
      const next = !prev;
      if (!next) {
        stopSpeaking();
      }
      return next;
    });
  };

  const handleReadAloud = (content: string, idx?: number) => {
    // If currently speaking this exact message (or if no idx provided and already speaking), STOP / CANCEL speech immediately
    if (isSpeaking && (idx === undefined || speakingMessageIndex === idx)) {
      stopSpeaking();
      return;
    }

    // Stop any ongoing speech and begin reading this message
    stopSpeaking();
    const targetIdx = idx !== undefined ? idx : null;
    setSpeakingMessageIndex(targetIdx);
    setIsSpeaking(true);

    speechService.speak(content, i18n.language, () => {
      setSpeakingMessageIndex(null);
      setIsSpeaking(false);
    });
  };

  const sendMessage = async (textToSend?: string, docId?: string) => {
    const q = textToSend || inputText;
    if (!q.trim() || isLoading) return;

    // Stop speaking if previous answer was being read
    stopSpeaking();

    const targetDocId = docId !== undefined ? docId : documentId;
    if (docId !== undefined) {
      setDocumentId(docId);
    }

    const userMsg: AgentChatMessage = { role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await api.chatAgent({
        message: q,
        document_id: targetDocId,
        mode: mode,
        language: (i18n.language as OutputLanguage) || 'en',
        conversation_history: messages.slice(-6),
      });

      const assistantMsg = {
        role: 'assistant' as const,
        content: res.message,
        tool_used: res.tool_used,
      };

      setMessages((prev) => {
        const nextMsgs = [...prev, assistantMsg];
        if (autoRead) {
          setTimeout(() => {
            handleReadAloud(res.message, nextMsgs.length - 1);
          }, 150);
        }
        return nextMsgs;
      });

      setSources(res.sources || []);
      setIsSourcesOpen(res.sources && res.sources.length > 0);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Unable to complete statutory retrieval. Please check connection and try again.',
          tool_used: 'error',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const recognition = speechService.createRecognition(
      (transcript) => {
        setInputText(transcript);
        setIsRecording(false);
      },
      (error) => {
        console.error('Speech recognition error:', error);
        setIsRecording(false);
      },
      i18n.language
    );

    if (recognition) {
      setIsRecording(true);
      recognition.start();
    } else {
      alert('Speech recognition is not supported in this browser.');
    }
  };

  const handleCopyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const openFloatingAgent = (query?: string, docId?: string) => {
    if (docId !== undefined) {
      setDocumentId(docId);
    }
    setIsFloatingOpen(true);
    if (query && query.trim()) {
      sendMessage(query, docId);
    }
  };

  const closeFloatingAgent = () => {
    setIsFloatingOpen(false);
  };

  const toggleFloatingAgent = () => {
    setIsFloatingOpen((prev) => !prev);
  };

  return (
    <LawAgentContext.Provider
      value={{
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
        isSpeaking,
        autoRead,
        toggleAutoRead,
        stopSpeaking,
        documentId,
        setDocumentId,
        sendMessage,
        handleVoiceInput,
        handleCopyMessage,
        handleReadAloud,
        isFloatingOpen,
        setIsFloatingOpen,
        openFloatingAgent,
        closeFloatingAgent,
        toggleFloatingAgent,
      }}
    >
      {children}
    </LawAgentContext.Provider>
  );
};

export const useLawAgent = (): LawAgentContextType => {
  const context = useContext(LawAgentContext);
  if (!context) {
    throw new Error('useLawAgent must be used within a LawAgentProvider');
  }
  return context;
};
