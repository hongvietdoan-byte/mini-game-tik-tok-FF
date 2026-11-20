import type {
  AdminSnapshot,
  CommandEnvelope,
  CommandResult,
  CreateSessionRequest,
  HudConfig,
  HudConfigUpdate,
  HudImageSlot,
  LiveSourceHealth,
  McChatPreset,
  McChatQueueItem,
  OverlayAudioState,
  Question,
  QuestionReview,
  PriorityTopicSettings,
  PriorityTopicSettingsResponse,
  ResolvedTheme,
  SimulatorRequest,
  SystemCheck,
  ThemeManifest,
  ThemeAchievements,
} from '@quiz/contracts';
import { shouldAcceptSnapshotSeq } from '../logic';

export type CommandResponse = { status: number; result: CommandResult };
export type SocketStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
export type SourceControlAction = 'CONNECT' | 'DISCONNECT' | 'RECONNECT';
export type SystemChecksResponse = {
  checks: SystemCheck[];
  live: LiveSourceHealth | null;
  overlay: { clients: number; lastAck: { stateVersion: number; atMs: number } | null; audioState?: OverlayAudioState | null };
};
export type PreflightResponse = {
  checks: Array<{ id: string; label: string; status: 'PASS' | 'FAIL' | 'WARN'; reason: string }>;
};
export type SelfTestResponse = { ok: boolean; mockComment: boolean; engineRecorded: boolean; detail: string; durationMs: number };
export type HealthResponse = { ok: boolean; contractVersion: number; sessionId: string | null };
export type HudImageUploadResponse = {
  image: { id: string; width: number; height: number; mimeType: string };
  config: HudConfig;
};
export type AdminThemeItem = { id: string; name: string; valid: boolean; error?: string; active: boolean };
export type AdminThemesResponse = { themes: AdminThemeItem[]; activeThemeId: string | null; themeVersion: number };
export type SetActiveThemeResponse = { theme: ResolvedTheme; activeThemeId: string | null; themeVersion: number };
export type StreamDelayMode = 'AUTO' | 'MANUAL';
export type StreamDelaySnapshot = {
  mode: StreamDelayMode;
  nextQuestionDelayMs: number;
  activeQuestionDelayMs: number | null;
  manualDelayMs: number;
};
export type UpdateStreamDelaySettings = { mode: StreamDelayMode; manualDelayMs?: number };
export type UpdateStreamDelayResponse = { ok: true; streamDelay: StreamDelaySnapshot };
export type ThemeAchievementsResponse = { themeId: string; achievements: ThemeAchievements; themeVersion: number };
export type SaveThemeAchievementsResponse = ThemeAchievementsResponse & { theme: ResolvedTheme; backup: string };

export interface DashboardClient {
  getHealth(): Promise<HealthResponse>;
  currentSession(): Promise<string | null>;
  createSession(token: string, request: CreateSessionRequest): Promise<{ sessionId: string; snapshot: AdminSnapshot }>;
  getState(token: string, sessionId: string): Promise<AdminSnapshot>;
  sendCommand(token: string, sessionId: string, envelope: CommandEnvelope): Promise<CommandResponse>;
  controlSimulator(token: string, sessionId: string, request: SimulatorRequest): Promise<{ ok: boolean; running: boolean; players: number }>;
  controlConnection(token: string, sessionId: string, action: 'LOSE' | 'RESTORE'): Promise<{ ok: boolean; status: string }>;
  controlSource(token: string, sessionId: string, action: SourceControlAction): Promise<{ ok: boolean; health: LiveSourceHealth }>;
  sendComment(token: string, sessionId: string, comment: { userId: string; displayName: string; text: string }): Promise<{ ok: boolean }>;
  sendMcChat(token: string, sessionId: string, request: { text: string; speak: boolean }): Promise<{ ok: boolean; item: McChatQueueItem }>;
  cancelMcChat(token: string, sessionId: string, chatId: string): Promise<{ ok: boolean; item: McChatQueueItem }>;
  useMcChatTextFallback(token: string, sessionId: string, chatId: string): Promise<{ ok: boolean; item: McChatQueueItem }>;
  getMcChatPresets(token: string): Promise<{ presets: McChatPreset[] }>;
  addMcChatPreset(token: string, text: string): Promise<{ ok: boolean; presets: McChatPreset[] }>;
  deleteMcChatPreset(token: string, presetId: string): Promise<{ ok: boolean; presets: McChatPreset[] }>;
  getQuestions(token: string): Promise<Question[]>;
  getPriorityTopicSettings(token: string): Promise<PriorityTopicSettingsResponse>;
  savePriorityTopicSettings(token: string, settings: PriorityTopicSettings): Promise<PriorityTopicSettingsResponse>;
  reviewQuestion(token: string, questionId: string, decision: QuestionReview['decision'], reason?: string): Promise<{ ok: boolean; question: Question }>;
  getSystemChecks(token: string): Promise<SystemChecksResponse>;
  getPreflight(token: string): Promise<PreflightResponse>;
  runSystemSelfTest(token: string): Promise<SelfTestResponse>;
  getHud(): Promise<HudConfig>;
  saveHud(token: string, update: HudConfigUpdate): Promise<HudConfig>;
  uploadHudImage(token: string, slot: HudImageSlot, file: File): Promise<HudImageUploadResponse>;
  resetHud(token: string): Promise<HudConfig>;
  getThemes(token: string): Promise<AdminThemesResponse>;
  getResolvedTheme(token: string, themeId: string): Promise<ResolvedTheme>;
  getActiveTheme(): Promise<ResolvedTheme>;
  reloadThemes(token: string): Promise<AdminThemesResponse>;
  setActiveTheme(token: string, themeId: string): Promise<SetActiveThemeResponse>;
  getThemeManifest(token: string, themeId: string): Promise<ThemeManifest>;
  updateStreamDelaySettings(token: string, sessionId: string, update: UpdateStreamDelaySettings): Promise<UpdateStreamDelayResponse>;
  getThemeAchievements(token: string, themeId: string): Promise<ThemeAchievementsResponse>;
  saveThemeAchievements(token: string, themeId: string, achievements: ThemeAchievements): Promise<SaveThemeAchievementsResponse>;
  subscribe(token: string, onSnapshot: (snapshot: AdminSnapshot, serverTimeMs: number) => void, onStatus: (status: SocketStatus) => void): () => void;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function jsonRequest<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...init, headers });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError(
      typeof body.message === 'string' ? body.message : `Yêu cầu thất bại (${response.status}).`,
      response.status,
      typeof body.code === 'string' ? body.code : undefined,
      body,
    );
  }
  return body as T;
}

export const apiClient: DashboardClient = {
  getHealth() {
    return jsonRequest('/health', null);
  },

  async currentSession() {
    const result = await jsonRequest<{ sessionId: string | null }>('/api/sessions/current', null);
    return result.sessionId;
  },

  createSession(token, request) {
    return jsonRequest('/api/sessions', token, { method: 'POST', body: JSON.stringify(request) });
  },

  getState(token, sessionId) {
    return jsonRequest(`/api/sessions/${encodeURIComponent(sessionId)}/state`, token);
  },

  async sendCommand(token, sessionId, envelope) {
    const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/commands`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });
    const result = await response.json().catch(() => null) as CommandResult | null;
    if (!result || typeof result !== 'object' || !('ok' in result)) {
      throw new ApiError('Không đọc được phản hồi từ máy chủ.', response.status);
    }
    return { status: response.status, result };
  },

  controlSimulator(token, sessionId, request) {
    return jsonRequest(`/api/sessions/${encodeURIComponent(sessionId)}/simulator`, token, {
      method: 'POST', body: JSON.stringify(request),
    });
  },

  controlConnection(token, sessionId, action) {
    return jsonRequest(`/api/sessions/${encodeURIComponent(sessionId)}/connection`, token, {
      method: 'POST', body: JSON.stringify({ action }),
    });
  },

  controlSource(token, sessionId, action) {
    return jsonRequest(`/api/sessions/${encodeURIComponent(sessionId)}/source`, token, {
      method: 'POST', body: JSON.stringify({ action }),
    });
  },

  sendComment(token, sessionId, comment) {
    return jsonRequest(`/api/sessions/${encodeURIComponent(sessionId)}/comments`, token, {
      method: 'POST', body: JSON.stringify(comment),
    });
  },

  sendMcChat(token, sessionId, request) {
    return jsonRequest(`/api/sessions/${encodeURIComponent(sessionId)}/mc-chat`, token, {
      method: 'POST', body: JSON.stringify(request),
    });
  },

  cancelMcChat(token, sessionId, chatId) {
    return jsonRequest(`/api/sessions/${encodeURIComponent(sessionId)}/mc-chat/${encodeURIComponent(chatId)}/cancel`, token, {
      method: 'POST', body: '{}',
    });
  },

  useMcChatTextFallback(token, sessionId, chatId) {
    return jsonRequest(`/api/sessions/${encodeURIComponent(sessionId)}/mc-chat/${encodeURIComponent(chatId)}/fallback`, token, {
      method: 'POST', body: '{}',
    });
  },

  getMcChatPresets(token) {
    return jsonRequest('/api/mc-chat-presets', token);
  },

  addMcChatPreset(token, text) {
    return jsonRequest('/api/mc-chat-presets', token, { method: 'POST', body: JSON.stringify({ text }) });
  },

  deleteMcChatPreset(token, presetId) {
    return jsonRequest(`/api/mc-chat-presets/${encodeURIComponent(presetId)}`, token, { method: 'DELETE' });
  },

  getQuestions(token) {
    return jsonRequest('/api/questions', token);
  },

  getPriorityTopicSettings(token) {
    return jsonRequest('/api/admin/priority-topic-settings', token);
  },

  savePriorityTopicSettings(token, settings) {
    return jsonRequest('/api/admin/priority-topic-settings', token, { method: 'PUT', body: JSON.stringify(settings) });
  },

  reviewQuestion(token, questionId, decision, reason) {
    return jsonRequest(`/api/questions/${encodeURIComponent(questionId)}/approve`, token, {
      method: 'POST', body: JSON.stringify({ decision, ...(reason ? { reason } : {}) }),
    });
  },

  getSystemChecks(token) {
    return jsonRequest('/api/system/checks', token);
  },

  getPreflight(token) {
    return jsonRequest('/api/preflight', token);
  },

  runSystemSelfTest(token) {
    return jsonRequest('/api/system/selftest', token, { method: 'POST', body: '{}' });
  },

  getHud() {
    return jsonRequest('/api/hud', null);
  },

  saveHud(token, update) {
    return jsonRequest('/api/hud', token, { method: 'PUT', body: JSON.stringify(update) });
  },

  async uploadHudImage(token, slot, file) {
    const headers = new Headers({ 'Content-Type': file.type || 'application/octet-stream' });
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`/api/hud/images?slot=${encodeURIComponent(slot)}`, {
      method: 'POST',
      headers,
      body: file,
    });
    const body = await response.json().catch(() => null) as HudImageUploadResponse | { code?: string; message?: string } | null;
    if (!response.ok || !body || !('config' in body)) {
      const error = body && 'message' in body && typeof body.message === 'string' ? body.message : `Tải ảnh thất bại (${response.status}).`;
      throw new ApiError(error, response.status, body && 'code' in body ? body.code : undefined, body);
    }
    return body;
  },

  resetHud(token) {
    return jsonRequest('/api/hud/reset', token, { method: 'POST', body: '{}' });
  },

  getThemes(token) {
    return jsonRequest('/api/admin/themes', token);
  },

  getResolvedTheme(token, themeId) {
    return jsonRequest(`/api/admin/themes/${encodeURIComponent(themeId)}/resolved`, token);
  },

  getActiveTheme() {
    return jsonRequest('/api/theme', null);
  },

  reloadThemes(token) {
    return jsonRequest('/api/admin/themes/reload', token, { method: 'POST', body: '{}' });
  },

  setActiveTheme(token, themeId) {
    return jsonRequest('/api/admin/themes/active', token, { method: 'PUT', body: JSON.stringify({ themeId }) });
  },

  getThemeManifest(token, themeId) {
    return jsonRequest(`/api/admin/themes/${encodeURIComponent(themeId)}/manifest`, token);
  },

  updateStreamDelaySettings(token, sessionId, update) {
    return jsonRequest(`/api/sessions/${encodeURIComponent(sessionId)}/stream-delay`, token, {
      method: 'PATCH', body: JSON.stringify(update),
    });
  },

  getThemeAchievements(token, themeId) {
    return jsonRequest(`/api/admin/themes/${encodeURIComponent(themeId)}/achievements`, token);
  },

  saveThemeAchievements(token, themeId, achievements) {
    return jsonRequest(`/api/admin/themes/${encodeURIComponent(themeId)}/achievements`, token, {
      method: 'PUT', body: JSON.stringify({ achievements }),
    });
  },

  subscribe(token, onSnapshot, onStatus) {
    let socket: WebSocket | null = null;
    let timer = 0;
    let delay = 500;
    let closed = false;
    let latestVersion = -1;
    let latestSeq: number | null = null;
    let latestSessionId: string | null = null;
    let awaitingFreshSnapshot = true;

    const connect = () => {
      if (closed) return;
      onStatus(delay > 500 ? 'reconnecting' : 'connecting');
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const currentSocket = new WebSocket(`${protocol}//${location.host}/ws`);
      socket = currentSocket;
      currentSocket.onopen = () => {
        if (socket !== currentSocket) return;
        awaitingFreshSnapshot = true;
        onStatus('connected');
        currentSocket.send(JSON.stringify({ type: 'HELLO', role: 'admin', token, lastStateVersion: latestVersion >= 0 ? latestVersion : undefined }));
      };
      currentSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as { type?: string; seq?: number; payload?: AdminSnapshot; serverTimeMs?: number };
          if (socket !== currentSocket || message.type !== 'ADMIN_SNAPSHOT' || !message.payload || typeof message.seq !== 'number') return;
          const sessionId = message.payload.public.sessionId;
          const sessionChanged = latestSessionId !== null && sessionId !== latestSessionId;
          if (!shouldAcceptSnapshotSeq(latestSeq, message.seq, awaitingFreshSnapshot, sessionChanged)) return;
          const version = message.payload.public.stateVersion;
          if (!awaitingFreshSnapshot && !sessionChanged && version < latestVersion) return;
          latestSeq = message.seq;
          latestSessionId = sessionId;
          awaitingFreshSnapshot = false;
          latestVersion = version;
          delay = 500;
          onSnapshot(message.payload, typeof message.serverTimeMs === 'number' ? message.serverTimeMs : Date.now());
        } catch {
          // Ignore malformed or unrelated server messages.
        }
      };
      currentSocket.onerror = () => currentSocket.close();
      currentSocket.onclose = () => {
        if (closed) return;
        if (socket !== currentSocket) return;
        onStatus('reconnecting');
        timer = window.setTimeout(connect, delay);
        delay = Math.min(5_000, delay * 2);
      };
    };
    connect();
    return () => {
      closed = true;
      window.clearTimeout(timer);
      socket?.close();
      onStatus('disconnected');
    };
  },
};
