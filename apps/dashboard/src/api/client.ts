import type {
  AdminSnapshot,
  CommandEnvelope,
  CommandResult,
  CreateSessionRequest,
  LiveSourceHealth,
  SimulatorRequest,
  SystemCheck,
} from '@quiz/contracts';
import { shouldAcceptSnapshotSeq } from '../logic';

export type CommandResponse = { status: number; result: CommandResult };
export type SocketStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
export type SourceControlAction = 'CONNECT' | 'DISCONNECT' | 'RECONNECT';
export type SystemChecksResponse = {
  checks: SystemCheck[];
  live: LiveSourceHealth | null;
  overlay: { clients: number; lastAck: { stateVersion: number; atMs: number } | null };
};
export type SelfTestResponse = { ok: boolean; mockComment: boolean; engineRecorded: boolean; detail: string; durationMs: number };
export type HealthResponse = { ok: boolean; contractVersion: number; sessionId: string | null };

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
  getSystemChecks(token: string): Promise<SystemChecksResponse>;
  runSystemSelfTest(token: string): Promise<SelfTestResponse>;
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

  getSystemChecks(token) {
    return jsonRequest('/api/system/checks', token);
  },

  runSystemSelfTest(token) {
    return jsonRequest('/api/system/selftest', token, { method: 'POST', body: '{}' });
  },

  subscribe(token, onSnapshot, onStatus) {
    let socket: WebSocket | null = null;
    let timer = 0;
    let delay = 500;
    let closed = false;
    let latestVersion = -1;
    let latestSeq: number | null = null;
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
          if (!shouldAcceptSnapshotSeq(latestSeq, message.seq, awaitingFreshSnapshot)) return;
          const version = message.payload.public.stateVersion;
          if (!awaitingFreshSnapshot && version < latestVersion) return;
          latestSeq = message.seq;
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
