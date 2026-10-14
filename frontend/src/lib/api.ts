import {
  DocumentUploadResponse, DocumentDetail, StructuredSummary,
  DirectionsResponse, CitationsAuditResponse, TimelineResponse,
  AgentChatResponse, AgentChatMessage, MappingLookupResponse,
  LawUnitDetail, UserSettings, SummaryLength, AudienceView, OutputLanguage,
  AuthUser
} from './types';

const API_BASE = '/api';

export const api = {
  // Document Operations
  async uploadDocument(file?: File, pastedText?: string, filename?: string): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (pastedText) formData.append('pasted_text', pastedText);
    if (filename) formData.append('filename', filename);

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getDocument(docId: string): Promise<DocumentDetail> {
    const res = await fetch(`${API_BASE}/documents/${docId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async summarizeDocument(
    docId: string,
    options: {
      length?: SummaryLength;
      audience?: AudienceView;
      language?: OutputLanguage;
      anonymise?: boolean;
    }
  ): Promise<StructuredSummary> {
    const params = new URLSearchParams({
      length: options.length || 'detailed',
      audience: options.audience || 'lawyer',
      language: options.language || 'en',
      anonymise: String(options.anonymise || false),
    });

    const res = await fetch(`${API_BASE}/documents/${docId}/summarize?${params.toString()}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getSummary(docId: string): Promise<StructuredSummary> {
    const res = await fetch(`${API_BASE}/documents/${docId}/summary`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getDirections(docId: string): Promise<DirectionsResponse> {
    const res = await fetch(`${API_BASE}/documents/${docId}/directions`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getCitations(docId: string): Promise<CitationsAuditResponse> {
    const res = await fetch(`${API_BASE}/documents/${docId}/citations`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getTimeline(docId: string): Promise<TimelineResponse> {
    const res = await fetch(`${API_BASE}/documents/${docId}/timeline`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getVerificationReportUrl(docId: string): string {
    return `${API_BASE}/documents/${docId}/report.pdf`;
  },

  // Citation Audit Only
  async auditDocument(file?: File, pastedText?: string, filename?: string): Promise<CitationsAuditResponse> {
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (pastedText) formData.append('pasted_text', pastedText);
    if (filename) formData.append('filename', filename);

    const res = await fetch(`${API_BASE}/audit`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getAuditReportUrl(auditId: string): string {
    return `${API_BASE}/audit/${auditId}/report.pdf`;
  },

  // AI Law Agent Chat
  async chatAgent(params: {
    message: string;
    document_id?: string;
    mode?: "simple" | "lawyer";
    language?: OutputLanguage;
    conversation_history?: AgentChatMessage[];
  }): Promise<AgentChatResponse> {
    const res = await fetch(`${API_BASE}/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: params.message,
        document_id: params.document_id,
        mode: params.mode || 'simple',
        language: params.language || 'en',
        conversation_history: params.conversation_history || [],
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Law Library Browse
  async browseLaws(query?: string): Promise<{ documents: any[] }> {
    const qStr = query ? `?q=${encodeURIComponent(query)}` : '';
    const res = await fetch(`${API_BASE}/laws/browse${qStr}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getLawUnit(docName: string, unitNumber: string): Promise<LawUnitDetail> {
    const res = await fetch(`${API_BASE}/laws/${encodeURIComponent(docName)}/${encodeURIComponent(unitNumber)}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Statutory Mapping (IPC to BNS)
  async convertMapping(code: string, section: string): Promise<MappingLookupResponse> {
    const params = new URLSearchParams({ code, section });
    const res = await fetch(`${API_BASE}/map/convert?${params.toString()}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Settings
  async getSettings(): Promise<UserSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateSettings(settings: UserSettings): Promise<UserSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Authentication
  async signup(name: string, email: string, password: string): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: res.statusText }));
      const detail = errData?.detail ?? errData?.message;
      const message = typeof detail === 'string'
        ? detail
        : (Array.isArray(detail)
            ? detail.map((e: any) => (typeof e === 'string' ? e : e?.msg || JSON.stringify(e))).join(', ')
            : (detail ? JSON.stringify(detail) : 'Failed to sign up'));
      throw new Error(message || 'Failed to sign up');
    }
    return res.json();
  },

  async login(email: string, password: string): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: res.statusText }));
      const detail = errData?.detail ?? errData?.message;
      const message = typeof detail === 'string'
        ? detail
        : (Array.isArray(detail)
            ? detail.map((e: any) => (typeof e === 'string' ? e : e?.msg || JSON.stringify(e))).join(', ')
            : (detail ? JSON.stringify(detail) : 'Incorrect email or password'));
      throw new Error(message || 'Incorrect email or password');
    }
    return res.json();
  },

  async guestLogin(): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/auth/guest`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: res.statusText }));
      const detail = errData?.detail ?? errData?.message;
      const message = typeof detail === 'string'
        ? detail
        : (Array.isArray(detail)
            ? detail.map((e: any) => (typeof e === 'string' ? e : e?.msg || JSON.stringify(e))).join(', ')
            : (detail ? JSON.stringify(detail) : 'Failed to continue as guest'));
      throw new Error(message || 'Failed to continue as guest');
    }
    return res.json();
  },

  async getMe(): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Not authenticated');
    }
    return res.json();
  },

  async logout(): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },
};

