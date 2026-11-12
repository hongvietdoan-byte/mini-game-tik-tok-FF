import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { GameStateSchema, type AdminSnapshot, type CommandBody, type GameState } from '@quiz/contracts';
import WebSocket from 'ws';
import { analyzeMockRound, type MockRoundSample } from './mock_round_check_analysis';

type CheckRow = { id: string; status: string; reason: string };
type SessionCreated = { sessionId: string; snapshot: AdminSnapshot };
type Options = { base: string; dataDir: string; questions: number; timeoutMs: number };
type SnapshotEnvelope = { type?: string; payload?: unknown; serverTimeMs?: number };

const DEFAULT_BASE = 'http://127.0.0.1:8787';
const DEFAULT_QUESTIONS = 10;
const DEFAULT_TIMEOUT_MS = 600_000;
const ADMIN_SNAPSHOT_TIMEOUT_MS = 10_000;

function usage() {
  return [
    'Chạy một vòng MOCK trên server đang chạy:',
    '  corepack pnpm exec tsx tools/mock_round_check.ts [--base http://127.0.0.1:8787] [--data-dir data] [--questions 10]',
    'Server phải dùng cùng QUIZ_DATA_DIR với --data-dir; token chỉ được gửi trong header Authorization.',
  ].join('\n');
}

export function parseMockRoundArgs(args: readonly string[], cwd = process.cwd()): Options | { help: true } {
  const options: Options = {
    base: DEFAULT_BASE,
    dataDir: resolve(cwd, 'data'),
    questions: DEFAULT_QUESTIONS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === '--help' || arg === '-h') return { help: true };
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Thiếu giá trị cho ${arg}.`);
    if (arg === '--base') options.base = value;
    else if (arg === '--data-dir') options.dataDir = resolve(cwd, value);
    else if (arg === '--questions') options.questions = Number(value);
    else if (arg === '--timeout-ms') options.timeoutMs = Number(value);
    else throw new Error(`Tham số không được hỗ trợ: ${arg}.`);
    index += 1;
  }

  const base = new URL(options.base);
  if (base.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) {
    throw new Error('--base chỉ được trỏ tới server HTTP trên localhost để không gửi token ra mạng.');
  }
  if (![10, 15, 20].includes(options.questions)) throw new Error('--questions chỉ nhận 10, 15 hoặc 20 theo contract hiện tại.');
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 30_000 || options.timeoutMs > 1_200_000) {
    throw new Error('--timeout-ms phải nằm trong khoảng 30000–1200000.');
  }
  options.base = base.origin;
  return options;
}

function isAdminSnapshot(value: unknown): value is AdminSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<AdminSnapshot>;
  return Boolean(
    snapshot.public
      && GameStateSchema.safeParse(snapshot.public.state).success
      && typeof snapshot.public.stateVersion === 'number'
      && snapshot.metrics
      && typeof snapshot.metrics.accepted === 'number',
  );
}

function sampleFromSnapshot(snapshot: AdminSnapshot, atMs: number): MockRoundSample {
  return {
    atMs,
    state: snapshot.public.state,
    questionCount: snapshot.public.round?.questionCount ?? null,
    acceptedAnswers: snapshot.metrics.accepted,
    podium: snapshot.public.podium,
  };
}

class AdminSnapshotMonitor {
  readonly samples: MockRoundSample[] = [];
  latest: AdminSnapshot | null = null;
  private readonly socket: WebSocket;
  private readonly onStateChange?: (state: GameState) => void;
  private priorState: GameState | null = null;
  private closedError: Error | null = null;
  private waiters = new Set<() => void>();

  private constructor(socket: WebSocket, onStateChange?: (state: GameState) => void) {
    this.socket = socket;
    this.onStateChange = onStateChange;
    socket.on('message', (data) => this.onMessage(data));
    socket.on('error', (error) => {
      this.closedError = error instanceof Error ? error : new Error('WebSocket lỗi.');
      this.notify();
    });
    socket.on('close', (code) => {
      this.closedError ??= new Error(`WebSocket đóng trước khi vòng hoàn tất (mã ${code}).`);
      this.notify();
    });
  }

  static async connect(base: string, token: string, onStateChange?: (state: GameState) => void) {
    const url = new URL('/ws', base);
    url.protocol = 'ws:';
    const socket = new WebSocket(url, { handshakeTimeout: ADMIN_SNAPSHOT_TIMEOUT_MS });
    const monitor = new AdminSnapshotMonitor(socket, onStateChange);
    await new Promise<void>((resolveOpen, rejectOpen) => {
      const timer = setTimeout(() => rejectOpen(new Error('Hết giờ chờ WebSocket mở.')), ADMIN_SNAPSHOT_TIMEOUT_MS);
      socket.once('open', () => {
        clearTimeout(timer);
        socket.send(JSON.stringify({ type: 'HELLO', role: 'admin', token }));
        resolveOpen();
      });
      socket.once('error', (error) => {
        clearTimeout(timer);
        rejectOpen(error);
      });
    });
    await monitor.waitForSnapshot(() => true, ADMIN_SNAPSHOT_TIMEOUT_MS);
    return monitor;
  }

  private onMessage(data: WebSocket.RawData) {
    let envelope: SnapshotEnvelope;
    try {
      envelope = JSON.parse(data.toString()) as SnapshotEnvelope;
    } catch {
      return;
    }
    if (envelope.type !== 'ADMIN_SNAPSHOT' || !isAdminSnapshot(envelope.payload)) return;
    const snapshot = envelope.payload;
    const state = snapshot.public.state;
    if (state !== this.priorState) this.onStateChange?.(state);
    this.priorState = state;
    this.latest = snapshot;
    this.samples.push(sampleFromSnapshot(snapshot, typeof envelope.serverTimeMs === 'number' ? envelope.serverTimeMs : Date.now()));
    this.notify();
  }

  private notify() {
    for (const wake of this.waiters) wake();
    this.waiters.clear();
  }

  async waitForSnapshot(predicate: (snapshot: AdminSnapshot) => boolean, timeoutMs: number) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.latest && predicate(this.latest)) return this.latest;
      if (this.closedError) throw this.closedError;
      await new Promise<void>((resolveWake) => {
        const timer = setTimeout(() => {
          this.waiters.delete(wake);
          resolveWake();
        }, Math.min(100, Math.max(1, deadline - Date.now())));
        const wake = () => {
          clearTimeout(timer);
          resolveWake();
        };
        this.waiters.add(wake);
      });
    }
    throw new Error(`Hết giờ chờ snapshot${this.latest ? ` ở pha ${this.latest.public.state}` : ''}.`);
  }

  async waitForState(state: GameState, timeoutMs: number) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const reached = this.samples.some((sample) => sample.state === state);
      if (reached) return;
      if (this.closedError) throw this.closedError;
      await new Promise<void>((resolveWake) => {
        const timer = setTimeout(() => {
          this.waiters.delete(wake);
          resolveWake();
        }, Math.min(100, Math.max(1, deadline - Date.now())));
        const wake = () => {
          clearTimeout(timer);
          resolveWake();
        };
        this.waiters.add(wake);
      });
    }
    throw new Error(`Hết giờ chờ pha ${state}; trạng thái gần nhất là ${this.latest?.public.state ?? 'chưa có snapshot'}.`);
  }

  async close() {
    if (this.socket.readyState === WebSocket.CLOSED) return;
    await new Promise<void>((resolveClose) => {
      const timer = setTimeout(() => {
        this.socket.terminate();
        resolveClose();
      }, 1_000);
      this.socket.once('close', () => {
        clearTimeout(timer);
        resolveClose();
      });
      if (this.socket.readyState === WebSocket.OPEN) this.socket.close();
      else this.socket.terminate();
    });
  }
}

function errorDetails(value: unknown) {
  if (!value || typeof value !== 'object') return '';
  const body = value as { code?: unknown; message?: unknown };
  const code = typeof body.code === 'string' ? body.code : '';
  const message = typeof body.message === 'string' ? body.message : '';
  return [code, message].filter(Boolean).join(': ');
}

async function apiRequest<T>(base: string, token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(new URL(path, `${base}/`), {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = errorDetails(body);
    throw new Error(`${init.method ?? 'GET'} ${path} → HTTP ${response.status}${detail ? ` — ${detail}` : ''}`);
  }
  return body as T;
}

function printPreflight(checks: readonly CheckRow[]) {
  console.log('Preflight:');
  for (const check of checks) console.log(`  ${check.status.padEnd(10)} ${check.id}: ${check.reason}`);
}

function formatDuration(durationMs: number) {
  return `${(durationMs / 1_000).toFixed(2)}s`;
}

export async function runMockRoundCheck(args: readonly string[] = process.argv.slice(2)) {
  const options = parseMockRoundArgs(args);
  if ('help' in options) {
    console.log(usage());
    return;
  }

  const tokenPath = join(options.dataDir, 'admin-token.txt');
  const token = (await readFile(tokenPath, 'utf8')).trim();
  if (!token) throw new Error(`Không có admin token trong ${tokenPath}.`);

  let monitor: AdminSnapshotMonitor | null = null;
  let sessionId: string | null = null;
  let simulatorStarted = false;
  let roundComplete = false;
  let cleanupError: string | null = null;
  const request = <T>(path: string, init?: RequestInit) => apiRequest<T>(options.base, token, path, init);
  const command = async <T = unknown>(body: CommandBody, fallbackSnapshot?: AdminSnapshot): Promise<T> => {
    if (!sessionId) throw new Error('Chưa có phiên để gửi lệnh.');
    const snapshot = fallbackSnapshot ?? monitor?.latest ?? await request<AdminSnapshot>(
      `/api/sessions/${encodeURIComponent(sessionId)}/state`,
    );
    return request<T>(`/api/sessions/${encodeURIComponent(sessionId)}/commands`, {
      method: 'POST',
      body: JSON.stringify({
        commandId: randomUUID(),
        expectedStateVersion: snapshot.public.stateVersion,
        operatorId: 'mock-round-check',
        requestedAtMs: Date.now(),
        command: body,
      }),
    });
  };

  try {
    const preflight = await request<{ checks?: CheckRow[] }>('/api/preflight');
    printPreflight(Array.isArray(preflight.checks) ? preflight.checks : []);

    const created = await request<SessionCreated>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        name: `Kiểm tra MOCK ${new Date().toISOString()}`,
        config: {
          mode: 'MOCK',
          packId: 'demo',
          allowDemoQuestions: true,
          questionsPerRound: options.questions,
          mcVoiceEnabled: true,
          leaderboardInterval: 1,
          speedMultiplier: 2,
          timings: {
            lobbyMs: 0,
            prepareMs: 500,
            answerMs: 3_000,
            revealMs: 500,
            leaderboardMs: 500,
            bigLeaderboardMs: 500,
            roundEndMs: 500,
            victoryMs: 1_000,
            intermissionMs: 1_000,
          },
        },
      }),
    });
    sessionId = created.sessionId;
    console.log(`Phiên MOCK: ${sessionId} · ${options.questions} câu`);

    monitor = await AdminSnapshotMonitor.connect(options.base, token, (state) => console.log(`  Pha: ${state}`));
    await monitor.waitForSnapshot((snapshot) => snapshot.public.sessionId === sessionId, ADMIN_SNAPSHOT_TIMEOUT_MS);

    const simulator = await request<{ ok: boolean; running: boolean; players: number }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/simulator`,
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'START',
          players: 30,
          accuracy: 0.72,
          participation: 0.9,
          spamRate: 0,
          noiseRate: 0.02,
          seed: 20261112,
        }),
      },
    );
    if (!simulator.ok || !simulator.running) throw new Error('Server không khởi động được MOCK simulator.');
    simulatorStarted = true;

    await command({ type: 'OPEN_LOBBY' });
    await monitor.waitForState('LOBBY', 5_000);
    await command({ type: 'START_ROUND', questionCount: options.questions });
    await monitor.waitForState('VICTORY', options.timeoutMs);

    const endedAtMs = Date.now();
    const analysis = analyzeMockRound(monitor.samples, options.questions, endedAtMs);
    console.log(`\nSố đáp án nhận: ${analysis.acceptedAnswers}`);
    console.log('Thời gian từng pha:');
    for (const visit of analysis.phaseVisits) console.log(`  ${visit.state.padEnd(12)} ${formatDuration(visit.durationMs)}`);
    console.log('Top 3 cuối:');
    if (analysis.top3.length === 0) console.log('  (không có người chơi trên bục)');
    for (const player of analysis.top3) console.log(`  #${player.rank} ${player.displayName} — ${player.score} điểm${player.tied ? ' (đồng hạng)' : ''}`);

    const failures = [
      ...(analysis.missingPhases.length ? [`thiếu pha ${analysis.missingPhases.join(', ')}`] : []),
      ...(!analysis.phaseOrderValid ? ['thứ tự pha không hợp lệ'] : []),
      ...(analysis.questionCount !== options.questions ? [`server chạy ${analysis.questionCount ?? 'không rõ'} câu thay vì ${options.questions}`] : []),
      ...(analysis.top3.length === 0 ? ['không có Top 3 cuối'] : []),
    ];
    if (!analysis.complete) throw new Error(failures.join('; ') || 'kết quả vòng chưa hoàn tất');
    roundComplete = true;
  } finally {
    if (sessionId) {
      if (simulatorStarted) {
        try {
          const stopped = await request<{ ok: boolean; running: boolean }>(`/api/sessions/${encodeURIComponent(sessionId)}/simulator`, {
            method: 'POST',
            body: JSON.stringify({ action: 'STOP' }),
          });
          if (!stopped.ok || stopped.running) cleanupError = 'Simulator MOCK chưa dừng sạch.';
        } catch (error) {
          cleanupError = error instanceof Error ? error.message : 'Không dừng được simulator MOCK.';
        }
      }
      try {
        const state = await request<AdminSnapshot>(`/api/sessions/${encodeURIComponent(sessionId)}/state`);
        if (state.sessionStatus === 'OPEN') {
          const stopped = await command<{ ok: boolean; message?: string }>({ type: 'STOP', reason: 'Kết thúc kiểm tra MOCK' }, state);
          if (!stopped.ok) cleanupError ??= stopped.message ?? 'Server từ chối dừng phiên MOCK.';
        }
        const finalState = await request<AdminSnapshot>(`/api/sessions/${encodeURIComponent(sessionId)}/state`);
        if (finalState.sessionStatus === 'OPEN') cleanupError ??= 'Phiên MOCK vẫn mở sau lệnh STOP.';
      } catch (error) {
        cleanupError ??= error instanceof Error ? error.message : 'Không dừng được phiên MOCK.';
      }
    }
    await monitor?.close();
    if (cleanupError) throw new Error(`Không dọn phiên MOCK sạch: ${cleanupError}`);
  }
  if (roundComplete) console.log('\nMOCK_ROUND_CHECK_PASSED');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runMockRoundCheck().catch((error: unknown) => {
    console.error(`MOCK_ROUND_CHECK_FAILED — ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
