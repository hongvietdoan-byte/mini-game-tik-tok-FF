import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import WebSocket from 'ws';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { DEFAULT_NAME_FILTER_CONFIG } from '../apps/server/src/name-filter-store';
import { buildApp, type QuizApp } from '../apps/server/src/app';
import { McVoiceCache } from '../apps/server/src/voice/cache';
import { McVoiceService } from '../apps/server/src/voice/service';
import type { McVoiceAudio, McVoiceSynthesisRequest } from '../apps/server/src/voice/types';
import { DEFAULT_NAME_FILTER_RULES, DEFAULT_PROTECTED_ENTITIES, filterPlayerName } from '../packages/name-filter/src/index';
import { removeTestTempRoot, testTempRoot } from '../tests/support/repoTemp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ADMIN_TOKEN = 'phase-d-local-test-token';
const SEED = 20_261_113;
const PLAYER_COUNT = 500;
const ROUND_QUESTIONS = 10;
const EPOCH = 1_800_000_000_000;
const SENSITIVE_NAMES = ['d1t Runner', 'Đồ ngu', 'Garena', 'Garena Official', 'nigger Support'];
const SYNTHETIC_IDS = [
  'phase-d-user-clean', 'phase-d-user-partial', 'phase-d-user-high',
  'phase-d-user-review', 'phase-d-user-protected', 'phase-d-user-rename',
];

type Risk = 'NONE' | 'REVIEW' | 'PARTIAL' | 'HIGH' | 'MANUAL_HIDE';
type PlayerRow = { playerId: string; rawDisplayName: string; safeDisplayName: string; risk: Risk; score: number; rank: number | null; displayAction: string };
type Roster = { players: PlayerRow[]; policyVersion: number; playerNameSpeech: 'UNSUPPORTED' };
type AdminState = {
  public: { state: string; stateVersion: number; round: { questionIndex: number; questionCount: number } | null };
  sessionStatus: 'OPEN' | 'CLOSED';
  current: { questionInstanceId: string; correctOptionId: string } | null;
};
type ApiRun = {
  dataDir: string;
  store: Store;
  quiz: QuizApp;
  scheduler: ManualScheduler;
  base: string;
  sessionId: string;
  ttsRequests: McVoiceSynthesisRequest[];
};
type PublicSocket = { socket: WebSocket; messages: string[] };
type SpecialPlayer = { key: string; userId: string; safeName: string; initialName: string; renamedName?: string };

const SPECIAL_PLAYERS: SpecialPlayer[] = [
  { key: 'clean', userId: SYNTHETIC_IDS[0]!, safeName: 'Ngọc An', initialName: 'Ngọc An' },
  { key: 'partial', userId: SYNTHETIC_IDS[1]!, safeName: 'Đồ ngu', initialName: 'Đồ ngu' },
  { key: 'high', userId: SYNTHETIC_IDS[2]!, safeName: 'd1t Runner', initialName: 'd1t Runner' },
  { key: 'review', userId: SYNTHETIC_IDS[3]!, safeName: 'Garena', initialName: 'Garena' },
  { key: 'protected', userId: SYNTHETIC_IDS[4]!, safeName: 'Garena Official', initialName: 'Garena Official' },
  { key: 'rename', userId: SYNTHETIC_IDS[5]!, safeName: 'Bảo An', initialName: 'Bảo An', renamedName: 'nigger Support' },
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function delay(ms = 0) {
  return new Promise<void>((resolveDelay) => setTimeout(resolveDelay, ms));
}

function questions() {
  const difficulty = ['EASY', 'MEDIUM', 'HARD'] as const;
  return Array.from({ length: 24 }, (_, index) => ({
    id: 'phase-d-' + String(index + 1).padStart(3, '0'),
    packId: 'demo',
    subtopicId: 'phase-d-topic',
    prompt: 'Phase D synthetic question ' + (index + 1) + '?',
    options: ['A', 'B', 'C', 'D'].map((id) => ({ id, text: 'Option ' + id + ' for question ' + (index + 1) })),
    correctOptionId: ['A', 'B', 'C', 'D'][index % 4]!,
    explanation: 'Synthetic test question.',
    difficulty: difficulty[index % difficulty.length]!,
    verificationStatus: 'DEMO' as const,
    approvalStatus: 'APPROVED' as const,
  }));
}

function makeVoiceSpy(cache: McVoiceCache, requests: McVoiceSynthesisRequest[]) {
  const provider = {
    async synthesize(input: McVoiceSynthesisRequest): Promise<McVoiceAudio> {
      requests.push(structuredClone(input));
      return { bytes: Uint8Array.from([73, 68, 51]), durationMs: 250, format: 'mp3' };
    },
  };
  const normalizer = { async normalize(audio: McVoiceAudio) { return audio; } };
  const credentials = {
    async get() { return 'test-only-in-memory-token'; },
    async set(_value: string) {},
    async clear() {},
  };
  return new McVoiceService(provider, cache, credentials, normalizer);
}

async function request<T>(base: string, path: string, init: RequestInit = {}, admin = true): Promise<T> {
  const response = await fetch(new URL(path, base), {
    ...init,
    headers: {
      ...(admin ? { authorization: 'Bearer ' + ADMIN_TOKEN } : {}),
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error('Phase D API lỗi HTTP ' + response.status + ' tại ' + path);
  return body as T;
}

function createVoiceCache(dataDir: string) {
  return new McVoiceCache(join(dataDir, 'voice-cache'));
}

async function createBootstrap(dataDir: string) {
  mkdirSync(dataDir, { recursive: true });
  const scheduler = new ManualScheduler(EPOCH);
  const store = new Store(join(dataDir, 'quiz.db'));
  store.seedQuestions({ id: 'demo', name: 'Phase D synthetic pack' }, questions(), scheduler.now());
  const cache = createVoiceCache(dataDir);
  const quiz = await buildApp({
    store, scheduler, adminToken: ADMIN_TOKEN, repositoryRoot: ROOT,
    adapterFactory: () => new MockAdapter(), mcVoice: {
      credentials: { async get() { return 'test-only-in-memory-token'; }, async set() {}, async clear() {} },
      service: makeVoiceSpy(cache, []),
      profile: { model: 'test-model', voiceKey: 'test-voice', rate: 1, voiceSettings: {} },
      cache,
    },
  });
  await quiz.app.listen({ host: '127.0.0.1', port: 0 });
  const address = quiz.app.server.address();
  assert(address && typeof address !== 'string', 'Không mở được cổng loopback cho API thật.');
  const base = 'http://127.0.0.1:' + address.port;
  try {
    const created = await request<{ sessionId: string }>(base, '/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Phase D synthetic integration',
        config: {
          mode: 'MOCK', packId: 'demo', questionsPerRound: ROUND_QUESTIONS, seed: SEED,
          speedMultiplier: 1, allowDemoQuestions: true, scoringMode: 'KAHOOT',
          leaderboardInterval: 1,
          timings: {
            lobbyMs: 0, prepareMs: 500, answerMs: 3_000, revealMs: 500,
            leaderboardMs: 500, bigLeaderboardMs: 500, roundEndMs: 0,
            victoryMs: 1_000, intermissionMs: 1_000,
          },
        },
      }),
    });
    return created.sessionId;
  } finally {
    await quiz.close();
    store.close();
  }
}

function controlWhitelist() {
  const whitelist = SPECIAL_PLAYERS.flatMap((player) => [player.initialName, ...(player.renamedName ? [player.renamedName] : [])])
    .flatMap((name) => {
      const result = filterPlayerName(name, null, DEFAULT_NAME_FILTER_CONFIG, DEFAULT_NAME_FILTER_RULES, {
        protectedEntities: DEFAULT_PROTECTED_ENTITIES,
      });
      return result.matchedRuleIds.length ? [{ value: name, ruleIds: result.matchedRuleIds }] : [];
    });
  return { ...DEFAULT_NAME_FILTER_CONFIG, whitelist, version: 1 };
}

async function bootRun(dataDir: string): Promise<ApiRun> {
  const scheduler = new ManualScheduler(EPOCH);
  const store = new Store(join(dataDir, 'quiz.db'));
  const ttsRequests: McVoiceSynthesisRequest[] = [];
  const cache = createVoiceCache(dataDir);
  const service = makeVoiceSpy(cache, ttsRequests);
  const quiz = await buildApp({
    store, scheduler, adminToken: ADMIN_TOKEN, repositoryRoot: ROOT,
    adapterFactory: () => new MockAdapter(),
    mcVoice: {
      credentials: { async get() { return 'test-only-in-memory-token'; }, async set() {}, async clear() {} },
      service,
      profile: { model: 'test-model', voiceKey: 'test-voice', rate: 1, voiceSettings: {} },
      cache,
    },
  });
  const recovered = await quiz.recover();
  assert(recovered, 'Không khôi phục được phiên IDLE đã seed qua API.');
  await quiz.app.listen({ host: '127.0.0.1', port: 0 });
  const address = quiz.app.server.address();
  assert(address && typeof address !== 'string', 'Không mở được cổng loopback cho phiên mô phỏng.');
  return {
    dataDir, store, quiz, scheduler,
    base: 'http://127.0.0.1:' + address.port,
    sessionId: recovered.id,
    ttsRequests,
  };
}

async function closeRun(run: ApiRun | null) {
  if (!run) return;
  await run.quiz.close().catch(() => {});
  run.store.close();
}

async function openPublicSocket(base: string, messages: string[]): Promise<PublicSocket> {
  const previousCount = messages.length;
  const url = new URL('/ws', base);
  url.protocol = 'ws:';
  const socket = new WebSocket(url);
  socket.on('message', (data) => messages.push(data.toString()));
  await new Promise<void>((resolveOpen, rejectOpen) => {
    const timer = setTimeout(() => rejectOpen(new Error('Overlay WS không mở trong thời gian cho phép.')), 5_000);
    socket.once('open', () => {
      clearTimeout(timer);
      socket.send(JSON.stringify({ type: 'HELLO', role: 'overlay' }));
      resolveOpen();
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      rejectOpen(error);
    });
  });
  await waitForPublicSnapshot(messages, 5_000, previousCount);
  return { socket, messages };
}

async function waitForPublicSnapshot(messages: string[], timeoutMs: number, afterCount = 0) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (messages.slice(afterCount).some((entry) => {
      try { return (JSON.parse(entry) as { type?: string }).type === 'STATE_SNAPSHOT'; } catch { return false; }
    })) return;
    await delay(10);
  }
  throw new Error('Overlay reconnect không nhận STATE_SNAPSHOT.');
}

async function closeSocket(socket: WebSocket) {
  if (socket.readyState === WebSocket.CLOSED) return;
  await new Promise<void>((resolveClose) => {
    const timer = setTimeout(() => { socket.terminate(); resolveClose(); }, 1_000);
    socket.once('close', () => { clearTimeout(timer); resolveClose(); });
    if (socket.readyState === WebSocket.OPEN) socket.close();
    else socket.terminate();
  });
}

async function adminState(run: ApiRun) {
  return request<AdminState>(run.base, '/api/sessions/' + encodeURIComponent(run.sessionId) + '/state');
}

async function sendCommand(run: ApiRun, command: Record<string, unknown>) {
  const state = await adminState(run);
  const result = await request<{ ok: boolean; code?: string; message?: string }>(
    run.base, '/api/sessions/' + encodeURIComponent(run.sessionId) + '/commands', {
      method: 'POST',
      body: JSON.stringify({
        commandId: randomUUID(),
        expectedStateVersion: state.public.stateVersion,
        operatorId: 'phase-d-script',
        requestedAtMs: run.scheduler.now(),
        command,
      }),
    },
  );
  assert(result.ok, 'Lệnh phiên bị từ chối tại trạng thái ' + state.public.state + '.');
}

async function waitForState(run: ApiRun, predicate: (state: AdminState) => boolean, maxVirtualMs = 120_000) {
  const deadline = run.scheduler.now() + maxVirtualMs;
  while (run.scheduler.now() <= deadline) {
    const state = await adminState(run);
    if (predicate(state)) return state;
    run.scheduler.advance(100);
    await delay();
  }
  throw new Error('Hết giờ mô phỏng; trạng thái hiện tại là ' + (await adminState(run)).public.state + '.');
}

async function apiComment(run: ApiRun, player: SpecialPlayer, displayName: string, correctOptionId: string, eventKey: string) {
  const result = await request<{ ok: boolean }>(
    run.base, '/api/sessions/' + encodeURIComponent(run.sessionId) + '/comments', {
      method: 'POST',
      body: JSON.stringify({
        userId: player.userId,
        displayName,
        text: correctOptionId,
        eventId: 'phase-d-' + eventKey,
      }),
    },
  );
  assert(result.ok, 'API comment MOCK không nhận được sự kiện synthetic.');
}

async function apiRoster(run: ApiRun) {
  return request<Roster>(run.base, '/api/admin/name-filter/players');
}

async function runVoiceSpy(run: ApiRun) {
  const available = await request<Array<{ id: string; approvalStatus: string }>>(run.base, '/api/questions');
  const question = available.find((item) => item.approvalStatus === 'APPROVED');
  assert(question, 'Thiếu câu hỏi APPROVED để chạy TTS spy.');
  const start = await request<{ jobId: string; status: string }>(run.base, '/api/mc-voice/pre-generate', {
    method: 'POST',
    body: JSON.stringify({ questionIds: [question.id] }),
  });
  let progress: { status: string; completed: number; failed: number } | null = null;
  const end = Date.now() + 10_000;
  while (Date.now() < end) {
    progress = await request<{ status: string; completed: number; failed: number }>(
      run.base, '/api/mc-voice/pre-generate/' + encodeURIComponent(start.jobId),
    );
    if (progress.status !== 'QUEUED' && progress.status !== 'RUNNING') break;
    await delay(10);
  }
  assert(progress?.status === 'COMPLETED' && progress.completed === 1 && progress.failed === 0, 'TTS spy không hoàn tất câu synthetic.');
  const identityKey = /player|user|display.?name|username|nickname|comment|tiktok.?id/iu;
  const hasIdentityKey = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(hasIdentityKey);
    if (!value || typeof value !== 'object') return false;
    return Object.entries(value).some(([key, child]) => identityKey.test(key) || hasIdentityKey(child));
  };
  const identityValues = [...SENSITIVE_NAMES, ...SYNTHETIC_IDS];
  const serialized = JSON.stringify(run.ttsRequests);
  assert(run.ttsRequests.length === 5, 'TTS spy không thấy đủ năm request của câu hỏi.');
  assert(!hasIdentityKey(run.ttsRequests), 'TTS spy thấy trường danh tính người chơi.');
  assert(!identityValues.some((value) => serialized.includes(value)), 'TTS spy thấy dữ liệu danh tính trong giá trị request.');
  return run.ttsRequests.length;
}

async function runScenario(run: ApiRun, filtered: boolean) {
  const publicMessages: string[] = [];
  let overlay: PublicSocket | null = filtered ? await openPublicSocket(run.base, publicMessages) : null;
  const unsafeNames = new Set(SENSITIVE_NAMES);
  const hiddenIds = new Set(SYNTHETIC_IDS);
  const countsAtStart: Record<Risk, number> = { NONE: 0, REVIEW: 0, PARTIAL: 0, HIGH: 0, MANUAL_HIDE: 0 };
  let renamedPlayerId: string | null = null;
  let hiddenPlayerId: string | null = null;
  let overlayReconnects = 0;

  try {
    if (filtered) await runVoiceSpy(run);
    const simulator = await request<{ ok: boolean; running: boolean; players: number }>(
      run.base, '/api/sessions/' + encodeURIComponent(run.sessionId) + '/simulator', {
      method: 'POST',
      body: JSON.stringify({
        action: 'START', players: PLAYER_COUNT, accuracy: 0.72, participation: 1,
        spamRate: 0, noiseRate: 0, seed: SEED,
      }),
      },
    );
    assert(simulator.ok && simulator.running && simulator.players === PLAYER_COUNT,
      'API simulator không khởi chạy đủ 500 người.');
    await sendCommand(run, { type: 'OPEN_LOBBY' });
    await waitForState(run, (state) => state.public.state === 'LOBBY');
    await sendCommand(run, { type: 'START_ROUND', questionCount: ROUND_QUESTIONS });

    for (let questionIndex = 0; questionIndex < ROUND_QUESTIONS; questionIndex += 1) {
      const current = await waitForState(run, (state) =>
        state.public.state === 'ACCEPTING' && state.public.round?.questionIndex === questionIndex);
      assert(current.current, 'Thiếu câu hiện tại khi nhận comment.');
      for (const player of SPECIAL_PLAYERS) {
        const displayName = questionIndex === 0
          ? player.initialName
          : player.renamedName && questionIndex >= 1
            ? player.renamedName
            : player.initialName;
        await apiComment(run, player, displayName, current.current.correctOptionId, questionIndex + '-' + player.key);
      }

      if (questionIndex === 0) {
        const roster = await apiRoster(run);
        const cases = SPECIAL_PLAYERS.map((player) => {
          const row = roster.players.find((entry) => entry.rawDisplayName === player.initialName);
          assert(row, 'API roster không trả người chơi synthetic sau comment thật.');
          return { player, row };
        });
        for (const { row } of cases) countsAtStart[row.risk] += 1;
        hiddenPlayerId = cases.find(({ player }) => player.key === 'clean')!.row.playerId;
        renamedPlayerId = cases.find(({ player }) => player.key === 'rename')!.row.playerId;
        await request(run.base, '/api/admin/name-filter/players/visibility', {
          method: 'POST',
          body: JSON.stringify({ playerIds: [hiddenPlayerId], hidden: true }),
        });
      }

      if (filtered && questionIndex === 3 && overlay) {
        await closeSocket(overlay.socket);
        overlay = await openPublicSocket(run.base, publicMessages);
        overlayReconnects += 1;
      }
      run.scheduler.advance(3_000);
      await delay();
    }

    const finalState = await waitForState(run, (state) => state.public.state === 'VICTORY', 60_000);
    assert(finalState.public.round?.questionCount === ROUND_QUESTIONS, 'Vòng không giữ đủ 10 câu.');
    const roster = await apiRoster(run);
    assert(roster.players.length === PLAYER_COUNT + SPECIAL_PLAYERS.length, 'Tổng số người chơi không đạt 500+ người.');
    const renamed = roster.players.find((entry) => entry.playerId === renamedPlayerId);
    assert(renamed?.rawDisplayName === SPECIAL_PLAYERS.find((player) => player.key === 'rename')!.renamedName,
      'Đổi tên giữa trận không giữ cùng playerId.');
    const hidden = roster.players.find((entry) => entry.playerId === hiddenPlayerId);
    assert(hidden?.risk === 'MANUAL_HIDE', 'Ẩn tay giữa trận không vào trạng thái MANUAL_HIDE.');

    if (filtered) {
      await delay(30);
      const publicText = publicMessages.join('\n');
      assert(![...unsafeNames, ...hiddenIds].some((value) => publicText.includes(value)),
        'Public WS chứa chuỗi danh tính bị cấm.');
      const parsed = publicMessages.flatMap((entry) => {
        try { return [JSON.parse(entry) as { type?: string; payload?: unknown }]; } catch { return []; }
      });
      assert(parsed.some((message) => message.type === 'STATE_SNAPSHOT'), 'Overlay đầu không có state snapshot.');
      assert(overlayReconnects === 1, 'Overlay chưa thực hiện đúng một lần reconnect.');
    }

    const rankProjection = roster.players
      .map(({ playerId, score, rank }) => ({ playerId, score, rank }))
      .sort((left, right) => left.playerId.localeCompare(right.playerId));
    const riskCounts: Record<Risk, number> = { NONE: 0, REVIEW: 0, PARTIAL: 0, HIGH: 0, MANUAL_HIDE: 0 };
    for (const row of roster.players) riskCounts[row.risk] += 1;
    const report = {
      players: roster.players.length,
      questions: finalState.public.round?.questionCount ?? 0,
      initialSpecialRiskCounts: countsAtStart,
      finalSpecialRiskCounts: Object.fromEntries(SPECIAL_PLAYERS.map((player) => [
        player.key, roster.players.find((entry) => entry.playerId ===
          (player.key === 'rename' ? renamedPlayerId : player.key === 'clean' ? hiddenPlayerId :
            roster.players.find((row) => row.rawDisplayName === (player.renamedName ?? player.initialName))?.playerId))?.risk,
      ])),
      finalRiskCounts: riskCounts,
      overlayReconnects,
      rankProjection,
      publicMessages: filtered ? publicMessages.length : undefined,
      voiceRequests: filtered ? run.ttsRequests.length : undefined,
    };
    return report;
  } finally {
    if (overlay) await closeSocket(overlay.socket);
    const current = await adminState(run).catch(() => null);
    if (current?.sessionStatus === 'OPEN')
      await sendCommand(run, { type: 'STOP', reason: 'Dừng mô phỏng synthetic Phase D' }).catch(() => {});
  }
}

export async function runPhaseDNameSafety() {
  const temp = testTempRoot('phase-d-name-safety-');
  let filteredRun: ApiRun | null = null;
  let controlRun: ApiRun | null = null;
  try {
    const seedDir = join(temp, 'seed');
    const filteredDir = join(temp, 'filtered');
    const controlDir = join(temp, 'control');
    mkdirSync(seedDir, { recursive: true });
    mkdirSync(filteredDir, { recursive: true });
    mkdirSync(controlDir, { recursive: true });
    const sessionId = await createBootstrap(seedDir);
    const seedDb = join(seedDir, 'quiz.db');
    copyFileSync(seedDb, join(filteredDir, 'quiz.db'));
    copyFileSync(seedDb, join(controlDir, 'quiz.db'));
    writeFileSync(join(controlDir, 'name-filter.json'), JSON.stringify(controlWhitelist()), { encoding: 'utf8', mode: 0o600 });

    filteredRun = await bootRun(filteredDir);
    controlRun = await bootRun(controlDir);
    assert(filteredRun.sessionId === sessionId && controlRun.sessionId === sessionId,
      'Hai nhánh so sánh không dùng cùng session ID / cùng seed round.');

    const filtered = await runScenario(filteredRun, true);
    const control = await runScenario(controlRun, false);
    assert(JSON.stringify(filtered.rankProjection) === JSON.stringify(control.rankProjection),
      'Điểm hoặc thứ hạng đổi giữa luồng lọc và control cùng seed.');

    return {
      status: 'PHASE_D_NAME_SAFETY_PASSED',
      sameSessionId: true,
      seed: SEED,
      filtered: {
        players: filtered.players,
        questions: filtered.questions,
        initialSpecialRiskCounts: filtered.initialSpecialRiskCounts,
        finalSpecialRiskCounts: filtered.finalSpecialRiskCounts,
        finalRiskCounts: filtered.finalRiskCounts,
        publicMessages: filtered.publicMessages,
        overlayReconnects: filtered.overlayReconnects,
        ttsRequests: filtered.voiceRequests,
      },
      control: { players: control.players, questions: control.questions },
      sameScoresAndRanks: true,
      publicWsLeakedSensitiveValues: false,
      ttsIdentityFields: 0,
    };
  } finally {
    await closeRun(controlRun);
    await closeRun(filteredRun);
    removeTestTempRoot(temp);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runPhaseDNameSafety().then((report) => {
    console.log(JSON.stringify(report, null, 2));
  }).catch((error: unknown) => {
    console.error('PHASE_D_NAME_SAFETY_FAILED — ' + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  });
}
