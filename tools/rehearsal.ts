import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import { performance } from 'node:perf_hooks';
import { MockAdapter, type Scheduler } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { buildApp, type QuizApp } from '@quiz/server';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = 'mock-rehearsal-local-only-token-20261112';
const PACK_ID = 'mock-rehearsal';
const QUESTION_COUNT = 15;
const PREPARE_MS = 500;
const ANSWER_MS = 3_000;
const REVEAL_MS = 1_000;
const LEADERBOARD_MS = 1_000;
const REPORT_DATE = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

type Timer = { id: number; due: number; fn: () => void; cancelled: boolean };

/** Đồng hồ ảo tất định, dùng để chạy nhanh nhưng vẫn qua Fastify và SessionRuntime thật. */
class RehearsalClock implements Scheduler {
  private timeMs: number;
  private nextId = 0;
  private heap: Timer[] = [];
  private timers = new Map<number, Timer>();
  callbacksFired = 0;

  constructor(nowMs = 1_800_000_000_000) {
    this.timeMs = nowMs;
  }

  now() { return this.timeMs; }

  setTimeout(fn: () => void, delayMs: number) {
    const timer: Timer = { id: ++this.nextId, due: this.timeMs + Math.max(0, delayMs), fn, cancelled: false };
    this.timers.set(timer.id, timer);
    this.push(timer);
    return timer.id;
  }

  clearTimeout(handle: unknown) {
    const timer = this.timers.get(handle as number);
    if (timer) {
      timer.cancelled = true;
      this.timers.delete(timer.id);
    }
  }

  advance(ms: number) {
    this.runUntil(this.timeMs + Math.max(0, ms));
  }

  /** Tới đúng mốc mà chưa gọi timer, để gửi một HTTP comment đúng deadline. */
  jumpWithoutFiring(atMs: number) {
    if (atMs < this.timeMs) throw new Error('Đồng hồ tổng duyệt không được lùi.');
    this.timeMs = atMs;
  }

  flushDue() {
    this.runUntil(this.timeMs);
  }

  private runUntil(targetMs: number) {
    let steps = 0;
    while (this.heap.length > 0 && this.heap[0]!.due <= targetMs) {
      if (++steps > 1_000_000) throw new Error('Vượt giới hạn timer trong đồng hồ tổng duyệt.');
      const timer = this.pop()!;
      if (timer.cancelled || !this.timers.delete(timer.id)) continue;
      this.timeMs = Math.max(this.timeMs, timer.due);
      timer.fn();
      this.callbacksFired += 1;
    }
    this.timeMs = Math.max(this.timeMs, targetMs);
  }

  private less(a: Timer, b: Timer) {
    return a.due < b.due || (a.due === b.due && a.id < b.id);
  }

  private push(timer: Timer) {
    this.heap.push(timer);
    let i = this.heap.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (!this.less(this.heap[i]!, this.heap[parent]!)) break;
      [this.heap[i], this.heap[parent]] = [this.heap[parent]!, this.heap[i]!];
      i = parent;
    }
  }

  private pop(): Timer | undefined {
    const first = this.heap[0];
    const last = this.heap.pop();
    if (!first || !last || this.heap.length === 0) return first;
    this.heap[0] = last;
    let i = 0;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let smallest = i;
      if (left < this.heap.length && this.less(this.heap[left]!, this.heap[smallest]!)) smallest = left;
      if (right < this.heap.length && this.less(this.heap[right]!, this.heap[smallest]!)) smallest = right;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest]!, this.heap[i]!];
      i = smallest;
    }
    return first;
  }
}

type Harness = { quiz: QuizApp; store: Store; clock: RehearsalClock; baseUrl: string; closed: boolean };
type Gate = { id: string; name: string; status: 'PENDING' | 'PASS' | 'FAIL'; detail: string };
type RoundMetric = {
  round: number;
  viewers: number;
  questions: number;
  comments: number;
  accepted: number;
  rejected: number;
  rejectReasons: string;
  p95HttpBatchMs: number;
  wallMs: number;
  integrity: string;
};

const requiredGates: Gate[] = [
  { id: 'server', name: 'Fastify lắng nghe HTTP, chế độ MOCK, dữ liệu tạm', status: 'PENDING', detail: '' },
  { id: 'restart', name: 'Khởi động lại giữa câu và yêu cầu operator xử lý recovery', status: 'PENDING', detail: '' },
  { id: 'join', name: 'Người xem vào giữa vòng', status: 'PENDING', detail: '' },
  { id: 'spam', name: '100 comment spam từ một tài khoản chỉ ghi một đáp án', status: 'PENDING', detail: '' },
  { id: 'first-answer', name: 'A rồi B: giữ đáp án đầu tiên', status: 'PENDING', detail: '' },
  { id: 'deadline', name: 'Comment đúng deadline bị loại theo cửa sổ end-exclusive', status: 'PENDING', detail: '' },
  { id: 'stale', name: 'Comment trễ từ câu trước bị cách ly', status: 'PENDING', detail: '' },
  { id: 'pause', name: 'Pause giữ nguyên thời gian; resume nhận comment trở lại', status: 'PENDING', detail: '' },
  { id: 'rounds', name: 'Hoàn tất liên tiếp 6 vòng × 15 câu', status: 'PENDING', detail: '' },
  { id: 'load-500', name: 'Mô phỏng 500 người xem', status: 'PENDING', detail: '' },
  { id: 'load-2000', name: 'Mô phỏng 2.000 người xem', status: 'PENDING', detail: '' },
  { id: 'integrity', name: 'Sổ điểm và đáp án không trùng trong cả sáu vòng', status: 'PENDING', detail: '' },
];

const gates = requiredGates.map((gate) => ({ ...gate }));
const roundMetrics: RoundMetric[] = [];
const answerWindowSamples: number[] = [];
const temporaryRoots = new Set<string>();
const openHarnesses = new Set<Harness>();
let fatal: string | null = null;

function mark(id: string, status: 'PASS' | 'FAIL', detail: string) {
  const gate = gates.find((item) => item.id === id);
  if (!gate) throw new Error(`Gate không tồn tại: ${id}`);
  gate.status = status;
  gate.detail = detail;
  if (status === 'FAIL') fatal ??= `${gate.name}: ${detail}`;
}

function requireRuntime(harness: Harness) {
  const runtime = harness.quiz.runtime();
  if (!runtime) throw new Error('Server không có SessionRuntime.');
  return runtime;
}

async function request<T>(harness: Harness, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${TOKEN}`);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(`${harness.baseUrl}${path}`, {
    ...init,
    headers,
  });
  const body = await response.json().catch(() => null) as T | null;
  if (!response.ok) throw new Error(`HTTP ${response.status} ${path}: ${JSON.stringify(body)}`);
  if (body === null) throw new Error(`HTTP ${path} không trả JSON.`);
  return body;
}

function makeQuestions(count: number, packId = PACK_ID) {
  const difficulty = ['EASY', 'MEDIUM', 'HARD'] as const;
  return Array.from({ length: count }, (_, index) => ({
    id: `rehearsal-${String(index + 1).padStart(3, '0')}`,
    packId,
    subtopicId: `${packId}-synthetic`,
    prompt: `Câu hỏi giả lập số ${index + 1}?`,
    options: ['A', 'B', 'C', 'D'].map((option, optionIndex) => ({ id: `o${optionIndex + 1}`, text: `Phương án ${option} của câu ${index + 1}` })),
    correctOptionId: `o${(index % 4) + 1}`,
    explanation: '',
    difficulty: difficulty[index % difficulty.length],
    verificationStatus: 'DEMO' as const,
    approvalStatus: 'APPROVED' as const,
  }));
}

async function startHarness(dbPath: string, clock = new RehearsalClock(), seedCount = 0): Promise<Harness> {
  const store = new Store(dbPath);
  if (seedCount > 0) {
    const seeded = store.seedQuestions({ id: PACK_ID, name: 'Gói giả lập tổng duyệt' }, makeQuestions(seedCount), clock.now());
    if (seeded !== seedCount) throw new Error(`Nạp fixture tạm ${seeded}/${seedCount} câu.`);
  }
  const quiz = await buildApp({
    store,
    scheduler: clock,
    adminToken: TOKEN,
    adapterFactory: () => new MockAdapter(),
    repositoryRoot: ROOT,
    logger: false,
  });
  await quiz.app.listen({ host: '127.0.0.1', port: 0 });
  const address = quiz.app.server.address() as AddressInfo | null;
  if (!address || typeof address === 'string') throw new Error('Fastify không lấy được cổng HTTP.');
  const harness = { quiz, store, clock, baseUrl: `http://127.0.0.1:${address.port}`, closed: false };
  openHarnesses.add(harness);
  return harness;
}

async function closeHarness(harness: Harness) {
  if (harness.closed) return;
  harness.closed = true;
  await harness.quiz.close().catch(() => {});
  harness.store.close();
  openHarnesses.delete(harness);
}

async function command(harness: Harness, sessionId: string, commandBody: Record<string, unknown>) {
  const runtime = requireRuntime(harness);
  return request<{ ok: boolean; code?: string; message?: string }>(harness, `/api/sessions/${sessionId}/commands`, {
    method: 'POST',
    body: JSON.stringify({
      commandId: randomUUID(),
      expectedStateVersion: runtime.engine.stateVersion,
      operatorId: 'mock-rehearsal',
      requestedAtMs: harness.clock.now(),
      command: commandBody,
    }),
  });
}

async function createSession(harness: Harness, packId = PACK_ID) {
  const response = await request<{ sessionId: string }>(harness, '/api/sessions', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Tổng duyệt MOCK — dữ liệu giả lập',
      config: {
        mode: 'MOCK',
        packId,
        questionsPerRound: QUESTION_COUNT,
        allowDemoQuestions: true,
        speedMultiplier: 1,
        maxSourceLagMs: 1_000,
        leaderboardInterval: 15,
        timings: {
          lobbyMs: 0,
          prepareMs: PREPARE_MS,
          answerMs: ANSWER_MS,
          revealMs: REVEAL_MS,
          leaderboardMs: LEADERBOARD_MS,
          bigLeaderboardMs: LEADERBOARD_MS,
          roundEndMs: 500,
          victoryMs: 1_000,
          intermissionMs: 1_000,
        },
      },
    }),
  });
  return response.sessionId;
}

async function postComment(harness: Harness, sessionId: string, userId: string, text: string, eventId: string) {
  return request<{ ok: boolean }>(harness, `/api/sessions/${sessionId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ userId, displayName: `Khán giả ${userId}`, text, eventId }),
  });
}

async function feedViewers(harness: Harness, sessionId: string, viewers: number, round: number, questionIndex: number) {
  const runtime = requireRuntime(harness);
  if (runtime.engine.state !== 'ACCEPTING') throw new Error('Chỉ bơm người giả lập khi cửa sổ câu hỏi đang mở.');
  const count = Math.floor(viewers * 0.3);
  const chunkSize = 100;
  const chunks = Math.ceil(count / chunkSize);
  const openAt = harness.clock.now();
  let sent = 0;

  for (let offset = 0; offset < count; offset += chunkSize) {
    const chunkIndex = Math.floor(offset / chunkSize);
    const virtualAt = openAt + Math.round(ANSWER_MS * 0.8 * (chunkIndex + 1) / chunks);
    harness.clock.advance(virtualAt - harness.clock.now());
    const comments = Array.from({ length: Math.min(chunkSize, count - offset) }, (_, i) => {
      const serial = offset + i;
      const playerIndex = ((round - 1) * QUESTION_COUNT * count + questionIndex * count + serial) % viewers;
      const userId = `rehearsal-viewer-${viewers}-${String(playerIndex + 1).padStart(4, '0')}`;
      const answer = ['A', 'B', 'C', 'D'][(serial + questionIndex + round) % 4]!;
      const eventId = `rehearsal-load-${viewers}-r${round}-q${questionIndex}-u${playerIndex}`;
      return postComment(harness, sessionId, userId, answer, eventId);
    });
    const batchStartedAt = performance.now();
    const results = await Promise.all(comments);
    answerWindowSamples.push(performance.now() - batchStartedAt);
    if (results.some((result) => !result.ok)) throw new Error(`Nguồn MOCK từ chối một batch comment ở vòng ${round}, câu ${questionIndex + 1}.`);
    sent += results.length;
  }
  return { sent, viewers };
}

function answerRows(harness: Harness, roundId: string, userId: string) {
  return harness.store.raw.prepare(
    `SELECT a.option_id AS optionId FROM answers a JOIN players p ON p.id = a.player_id
     WHERE a.round_id = ? AND p.source = 'MOCK' AND p.source_user_id = ? ORDER BY a.received_at_ms`,
  ).all(roundId, userId) as { optionId: string }[];
}

function metrics(harness: Harness) {
  return requireRuntime(harness).adminSnapshot().metrics;
}

function metricDelta(after: number, before: number) { return Math.max(0, after - before); }

async function advancePhase(harness: Harness) {
  const runtime = requireRuntime(harness);
  const timer = runtime.engine.timer;
  if (!timer || timer.deadlineMs === null) throw new Error(`Không có timer ở trạng thái ${runtime.engine.state}.`);
  const delta = Math.max(0, timer.deadlineMs - harness.clock.now());
  harness.clock.advance(delta);
}

async function advanceUntil(harness: Harness, state: string) {
  for (let i = 0; i < 12 && requireRuntime(harness).engine.state !== state; i++) await advancePhase(harness);
  if (requireRuntime(harness).engine.state !== state)
    throw new Error(`Không tới trạng thái ${state}; hiện tại ${requireRuntime(harness).engine.state}.`);
}

async function openNextRound(harness: Harness, sessionId: string) {
  await command(harness, sessionId, { type: 'START_ROUND' });
  const runtime = requireRuntime(harness);
  if (runtime.engine.state !== 'PREPARE') throw new Error(`START_ROUND không vào PREPARE (${runtime.engine.state}).`);
  const roundId = runtime.engine.round!.roundId;
  await advanceUntil(harness, 'ACCEPTING');
  return roundId;
}

async function completeOneQuestion(harness: Harness) {
  if (requireRuntime(harness).engine.state !== 'ACCEPTING') throw new Error('Câu hỏi phải ở ACCEPTING trước khi chạy timer.');
  await advancePhase(harness);
  await advanceUntil(harness, 'LEADERBOARD');
  await advancePhase(harness);
  const state = requireRuntime(harness).engine.state;
  if (state === 'PREPARE') await advanceUntil(harness, 'ACCEPTING');
  else if (state !== 'ROUND_END') throw new Error(`Không kết thúc câu đúng trạng thái: ${state}.`);
}

async function restartGate(root: string) {
  const dbPath = join(root, 'restart', 'rehearsal.db');
  const firstClock = new RehearsalClock();
  const first = await startHarness(dbPath, firstClock, QUESTION_COUNT);
  const sessionId = await createSession(first);
  await command(first, sessionId, { type: 'OPEN_LOBBY' });
  await openNextRound(first, sessionId);
  const beforeCrash = requireRuntime(first);
  if (beforeCrash.engine.state !== 'ACCEPTING' || beforeCrash.engine.round?.questionIndex !== 0)
    throw new Error('Không đạt ACCEPTING để thử restart giữa câu.');
  await postComment(first, sessionId, 'restart-gate-player', 'A', 'restart-before');
  const savedScoreRows = first.store.raw.prepare('SELECT COUNT(*) AS n FROM score_events WHERE round_id = ?')
    .get(beforeCrash.engine.round!.roundId) as { n: number };
  await closeHarness(first);

  const recoveredClock = new RehearsalClock(firstClock.now() + 60_000);
  const store = new Store(dbPath);
  const quiz = await buildApp({ store, scheduler: recoveredClock, adminToken: TOKEN, adapterFactory: () => new MockAdapter(), repositoryRoot: ROOT, logger: false });
  const recovered = await quiz.recover();
  if (!recovered) throw new Error('Server mới không khôi phục được phiên đang mở.');
  await quiz.app.listen({ host: '127.0.0.1', port: 0 });
  const address = quiz.app.server.address() as AddressInfo | null;
  if (!address || typeof address === 'string') throw new Error('Server khôi phục không có cổng HTTP.');
  const second: Harness = { quiz, store, clock: recoveredClock, baseUrl: `http://127.0.0.1:${address.port}`, closed: false };
  openHarnesses.add(second);

  if (recovered.engine.state !== 'PAUSED' || recovered.engine.suspended?.kind !== 'RECOVERY')
    throw new Error(`Recovery tự chạy không an toàn: ${recovered.engine.state}/${recovered.engine.suspended?.kind}.`);
  recoveredClock.advance(60_000);
  if (recovered.engine.state !== 'PAUSED') throw new Error('Phiên recovery tự chạy khi operator chưa chọn.');
  const result = await command(second, sessionId, { type: 'RESOLVE_RECOVERY', decision: 'RESUME', reason: 'Tổng duyệt recovery' });
  const afterScoreRows = second.store.raw.prepare('SELECT COUNT(*) AS n FROM score_events WHERE round_id = ?')
    .get(recovered.engine.round!.roundId) as { n: number };
  const okay = result.ok && recovered.engine.state === 'ACCEPTING' && savedScoreRows.n === afterScoreRows.n;
  await closeHarness(second);
  if (!okay) throw new Error('Recovery không giữ trạng thái/điểm như yêu cầu.');
  return 'Đóng app đang chạy, mở lại trên cùng DB; trạng thái PAUSED/RECOVERY không tự tiến; RESOLVE_RECOVERY/RESUME trả 200 và số bút toán giữ nguyên.';
}

function p95(samples: number[]) {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * 0.95) - 1]!;
}

export function rehearsalStatusLabel(passed: boolean) {
  return passed ? 'CODE_REHEARSAL_PASSED' : 'CODE_REHEARSAL_FAILED';
}

function markdownReport() {
  const passed = gates.every((gate) => gate.status === 'PASS');
  const title = rehearsalStatusLabel(passed);
  const lines = [
    `# Biên bản tổng duyệt MOCK — ${REPORT_DATE}`,
    '',
    `**Kết quả: ${title}**`,
    '',
    'Chạy Fastify qua HTTP loopback, `MockAdapter`, DB SQLite tạm và câu hỏi giả lập gắn DEMO. Mỗi câu bơm HTTP theo batch 100 comment, chọn 30% trong nhóm 500 hoặc 2.000 người; đồng hồ điều khiển tất định. Gate restart đóng và dựng lại app trên cùng DB.',
    '',
    '## Cấu hình và số liệu từng vòng',
    '',
    '| Vòng | Người giả lập | Câu | Comment nhận | Được chấp nhận | Bị loại (lý do) | p95 HTTP batch 100 (ms) | Thời gian xử lý (ms) | Toàn vẹn |',
    '|---:|---:|---:|---:|---:|---|---:|---:|---|',
    ...(roundMetrics.length > 0
      ? roundMetrics.map((round) => `| ${round.round} | ${round.viewers} | ${round.questions} | ${round.comments} | ${round.accepted} | ${round.rejected} (${round.rejectReasons || '—'}) | ${round.p95HttpBatchMs} | ${round.wallMs} | ${round.integrity} |`)
      : ['| — | — | — | — | — | — | — | — | — | Chưa chạy |']),
    '',
    '## Các gate',
    '',
    '| Gate | Kết quả | Bằng chứng |',
    '|---|---|---|',
    ...gates.map((gate) => `| ${gate.name} | ${gate.status} | ${gate.detail || 'Chưa chạy'} |`),
    '',
    '## Lỗi P0/P1 còn mở',
    '',
    passed
      ? '- Không phát hiện lỗi P0/P1 trong các gate tổng duyệt này. Các hạng mục ngoài kịch bản chưa được đánh giá bởi biên bản này.'
      : `- P0 tổng duyệt chưa đạt: ${fatal ?? 'có gate FAIL'}. Cần xử lý trước khi dùng kết quả rehearsal.`,
    '',
    '## Ghi chú ngoài phạm vi gate',
    '',
    '- Đây là tổng duyệt source-code dùng `MockAdapter`; kết quả không thay cho operator rehearsal V4 P0.5 trên TikTok LIVE thật. `MockSimulator` hiện có test hồi quy bình thường trong `packages/live-adapters/src/simulator.test.ts`, xác nhận event ID không trùng sau restart.',
    '- Tất cả dữ liệu/ảnh/câu hỏi dùng trong rehearsal là synthetic và được tạo ở thư mục tạm; không ghi vào DB của repo.',
    '',
  ];
  return lines.join('\n');
}

async function main() {
  const tempRoot = await import('node:fs/promises').then(({ mkdtemp }) => mkdtemp(join(tmpdir(), 'quiz-mock-rehearsal-')));
  temporaryRoots.add(resolve(tempRoot));

  try {
    const restartDetail = await restartGate(tempRoot);
    mark('restart', 'PASS', restartDetail);

    const dbPath = join(tempRoot, 'rounds', 'rehearsal.db');
    const harness = await startHarness(dbPath, new RehearsalClock(), 120);
    const sessionId = await createSession(harness);
    mark('server', 'PASS', `Fastify listen ${harness.baseUrl}; session mode ${requireRuntime(harness).config.mode}; DB đặt ở temp.`);

    const firstBefore = metrics(harness);
    const firstSampleStart = answerWindowSamples.length;
    const firstRoundStartedAt = performance.now();
    await command(harness, sessionId, { type: 'OPEN_LOBBY' });
    const completed: { viewers: number; questionCount: number }[] = [];
    const scenarioRoundId = await openNextRound(harness, sessionId);
    // Người xem vào sau khi câu 1 đã mở.
    const joinResult = await feedViewers(harness, sessionId, 500, 1, 0);
    if (requireRuntime(harness).engine.state !== 'ACCEPTING' || joinResult.sent !== 150)
      throw new Error(`Nhóm 500 người vào giữa vòng nhưng chỉ phát ${joinResult.sent} comment.`);
    const joined = harness.store.raw.prepare("SELECT COUNT(DISTINCT source_user_id) AS n FROM players WHERE source = 'MOCK' AND source_user_id LIKE 'rehearsal-viewer-500-%'").get() as { n: number };
    if (joined.n !== 150) throw new Error(`Người vào giữa vòng ghi ${joined.n}/150 người.`);
    mark('join', 'PASS', 'Sau khi câu 1 ở ACCEPTING, 150/500 người bắt đầu gửi comment qua HTTP; DB nhận đủ 150 người.');

    const firstA = await postComment(harness, sessionId, 'scenario-first-answer', 'A', 'scenario-first-a');
    const thenB = await postComment(harness, sessionId, 'scenario-first-answer', 'B', 'scenario-first-b');
    if (!firstA.ok || !thenB.ok) throw new Error('Mock endpoint không nhận được luồng A rồi B.');
    const firstAnswerRows = answerRows(harness, scenarioRoundId, 'scenario-first-answer');
    if (firstAnswerRows.length !== 1 || firstAnswerRows[0]!.optionId !== 'A')
      throw new Error(`A→B không giữ A duy nhất: ${JSON.stringify(firstAnswerRows)}.`);
    mark('first-answer', 'PASS', 'Hai HTTP comment A rồi B; DB chỉ có một answer và option đầu là A.');

    const spamBefore = harness.store.raw.prepare('SELECT COUNT(*) AS n FROM answers WHERE round_id = ?').get(scenarioRoundId) as { n: number };
    await Promise.all(Array.from({ length: 100 }, (_, index) =>
      postComment(harness, sessionId, 'scenario-spam-100', index % 2 === 0 ? 'C' : 'D', `spam-${index + 1}`),
    ));
    const spamRows = answerRows(harness, scenarioRoundId, 'scenario-spam-100');
    const spamAfter = harness.store.raw.prepare('SELECT COUNT(*) AS n FROM answers WHERE round_id = ?').get(scenarioRoundId) as { n: number };
    if (spamRows.length !== 1 || spamAfter.n - spamBefore.n !== 1)
      throw new Error(`Spam 100 ghi ${spamRows.length} answer cho user; kỳ vọng 1.`);
    mark('spam', 'PASS', `Gửi 100 HTTP comment song song; DB thêm ${spamAfter.n - spamBefore.n} answer cho một user.`);

    await completeOneQuestion(harness); // câu 1 kết thúc, câu 2 đã mở ACCEPTING
    const runtime = requireRuntime(harness);
    if (runtime.engine.state !== 'ACCEPTING' || runtime.engine.round?.questionIndex !== 1 || !runtime.engine.timer || runtime.engine.timer.deadlineMs === null)
      throw new Error('Không mở được cửa sổ test deadline.');
    const previousQuestionTimestamp = harness.clock.now();
    await feedViewers(harness, sessionId, 500, 1, 1);
    const deadline = runtime.engine.timer!.deadlineMs!;
    harness.clock.advance(Math.max(0, deadline - harness.clock.now() - 1));
    harness.clock.jumpWithoutFiring(deadline);
    const beforeLate = runtime.metrics.rejected.LATE;
    await postComment(harness, sessionId, 'scenario-exact-deadline', 'A', 'exact-deadline');
    if (runtime.metrics.rejected.LATE !== beforeLate + 1)
      throw new Error('Comment đúng deadline không bị từ chối LATE.');
    harness.clock.flushDue();
    if (runtime.engine.state !== 'REVEAL') throw new Error(`Timer deadline không đóng câu: ${runtime.engine.state}.`);
    mark('deadline', 'PASS', 'Đặt virtual receive time đúng bằng deadline; API ghi reject LATE, sau đó timer đóng câu.');

    await advanceUntil(harness, 'LEADERBOARD');
    await advancePhase(harness);
    if (runtime.engine.state !== 'PREPARE') throw new Error('Không chuyển sang câu kế tiếp sau deadline.');
    await advancePhase(harness);
    if (runtime.engine.state !== 'ACCEPTING') throw new Error('Câu kế tiếp không mở để thử comment cũ.');
    await feedViewers(harness, sessionId, 500, 1, 2);

    const staleBefore = runtime.metrics.rejected.STALE_SOURCE_TIMESTAMP;
    runtime.mockComment({
      userId: 'scenario-old-question', displayName: 'Khán giả câu trước', text: 'B',
      eventId: 'late-from-previous-question', sourceTimestampMs: previousQuestionTimestamp,
    } as Parameters<typeof runtime.mockComment>[0]);
    if (runtime.metrics.rejected.STALE_SOURCE_TIMESTAMP !== staleBefore + 1)
      throw new Error('Comment mang timestamp câu trước không bị cách ly.');
    mark('stale', 'PASS', `MockAdapter phát timestamp từ câu trước (${Math.round(harness.clock.now() - previousQuestionTimestamp)} ms); reject STALE_SOURCE_TIMESTAMP.`);

    const remaining = runtime.engine.timer!.deadlineMs! - harness.clock.now();
    await command(harness, sessionId, { type: 'PAUSE', reason: 'Gate pause/resume rehearsal' });
    if (runtime.engine.state !== 'PAUSED') throw new Error('PAUSE không vào PAUSED.');
    const frozen = runtime.engine.timer!.remainingMs;
    harness.clock.advance(5_000);
    if (runtime.engine.state !== 'PAUSED' || runtime.engine.timer!.remainingMs !== frozen)
      throw new Error('Timer tiếp tục chạy trong PAUSED.');
    await postComment(harness, sessionId, 'scenario-paused-comment', 'C', 'comment-during-pause');
    await command(harness, sessionId, { type: 'RESUME', reason: 'Tiếp tục sau gate pause/resume' });
    if (runtime.engine.state !== 'ACCEPTING') throw new Error('RESUME không mở lại câu.');
    const pausedComment = answerRows(harness, scenarioRoundId, 'scenario-paused-comment');
    if (pausedComment.length !== 0) throw new Error('Comment trong lúc pause đã được ghi đáp án.');
    const resumeAcceptedBefore = runtime.metrics.accepted;
    await postComment(harness, sessionId, 'scenario-after-resume', 'D', 'comment-after-resume');
    if (runtime.metrics.accepted !== resumeAcceptedBefore + 1) throw new Error('Comment sau resume không được nhận.');
    mark('pause', 'PASS', `PAUSED giữ ${frozen}/${remaining} ms sau khi clock đi thêm 5000 ms; comment lúc pause bị loại, sau RESUME nhận lại.`);
    await completeOneQuestion(harness);

    const finishCurrent = async (
      roundNumber: number,
      viewers: number,
      roundId: string,
      beforeMetrics: ReturnType<typeof metrics>,
      sampleStart: number,
      startedAt: number,
    ) => {
      while (runtime.engine.state !== 'ROUND_END') {
        const questionIndex = runtime.engine.round!.questionIndex;
        await feedViewers(harness, sessionId, viewers, roundNumber, questionIndex);
        await completeOneQuestion(harness);
      }
      await advancePhase(harness); // ROUND_END → VICTORY
      const check = runtime.verifyIntegrity();
      await advanceUntil(harness, 'INTERMISSION');
      await advanceUntil(harness, 'LOBBY');
      const wallMs = performance.now() - startedAt;
      const questionCount = harness.store.roundQuestions(roundId).length;
      const currentMetrics = metrics(harness);
      const duplicateAnswers = harness.store.raw.prepare(
        `SELECT COUNT(*) AS n FROM (SELECT question_instance_id, player_id FROM answers WHERE round_id = ? GROUP BY question_instance_id, player_id HAVING COUNT(*) > 1)`,
      ).get(roundId) as { n: number };
      const row: RoundMetric = {
        round: roundNumber,
        viewers,
        questions: questionCount,
        comments: metricDelta(currentMetrics.received, beforeMetrics.received),
        accepted: metricDelta(currentMetrics.accepted, beforeMetrics.accepted),
        rejected: Object.keys(currentMetrics.rejected).reduce((sum, key) => sum + metricDelta(currentMetrics.rejected[key as keyof typeof currentMetrics.rejected], beforeMetrics.rejected[key as keyof typeof beforeMetrics.rejected]), 0),
        rejectReasons: Object.keys(currentMetrics.rejected)
          .map((key) => [key, metricDelta(currentMetrics.rejected[key as keyof typeof currentMetrics.rejected], beforeMetrics.rejected[key as keyof typeof beforeMetrics.rejected])] as const)
          .filter(([, count]) => count > 0)
          .map(([key, count]) => `${key}:${count}`)
          .join(', '),
        p95HttpBatchMs: Math.round(p95(answerWindowSamples.slice(sampleStart)) * 100) / 100,
        wallMs: Math.round(wallMs * 100) / 100,
        integrity: check === null && duplicateAnswers.n === 0 ? 'PASS' : `FAIL: ${check ?? `answers duplicate=${duplicateAnswers.n}`}`,
      };
      roundMetrics.push(row);
      completed.push({ viewers, questionCount });
      if (questionCount !== QUESTION_COUNT || check !== null || duplicateAnswers.n !== 0)
        throw new Error(`Vòng ${roundNumber}: ${row.integrity}, ${questionCount}/${QUESTION_COUNT} câu.`);
    };

    await finishCurrent(1, 500, scenarioRoundId, firstBefore, firstSampleStart, firstRoundStartedAt);

    for (let roundNumber = 2; roundNumber <= 6; roundNumber++) {
      const viewers = roundNumber <= 3 ? 500 : 2_000;
      const beforeMetrics = metrics(harness);
      const sampleStart = answerWindowSamples.length;
      const roundStartedAt = performance.now();
      const roundId = await openNextRound(harness, sessionId);
      await finishCurrent(roundNumber, viewers, roundId, beforeMetrics, sampleStart, roundStartedAt);
    }

    if (runtime.engine.completedRounds !== 6 || completed.length !== 6 || completed.some((item) => item.questionCount !== 15))
      throw new Error(`Số vòng/câu hoàn tất sai: ${runtime.engine.completedRounds}; rows=${JSON.stringify(completed)}.`);
    mark('rounds', 'PASS', 'Cùng một phiên Fastify đã hoàn tất liên tiếp 6 vòng; mỗi vòng có 15 câu hỏi trong round_questions.');
    const viewers500 = harness.store.raw.prepare("SELECT COUNT(DISTINCT source_user_id) AS n FROM players WHERE source = 'MOCK' AND source_user_id LIKE 'rehearsal-viewer-500-%'").get() as { n: number };
    const viewers2000 = harness.store.raw.prepare("SELECT COUNT(DISTINCT source_user_id) AS n FROM players WHERE source = 'MOCK' AND source_user_id LIKE 'rehearsal-viewer-2000-%'").get() as { n: number };
    if (viewers500.n !== 500 || viewers2000.n !== 2_000)
      throw new Error(`Lượng người giả lập khác cấu hình: 500=${viewers500.n}; 2000=${viewers2000.n}.`);
    mark('load-500', 'PASS', `${viewers500.n} user ID qua HTTP trong 3 vòng; p95 batch tối đa ${Math.max(...roundMetrics.filter((item) => item.viewers === 500).map((item) => item.p95HttpBatchMs))} ms.`);
    mark('load-2000', 'PASS', `${viewers2000.n} user ID qua HTTP trong 3 vòng; p95 batch tối đa ${Math.max(...roundMetrics.filter((item) => item.viewers === 2_000).map((item) => item.p95HttpBatchMs))} ms.`);
    mark('integrity', 'PASS', `Từng vòng có 15 câu, verifyIntegrity() rỗng và không có cặp answer trùng; ${roundMetrics.reduce((sum, item) => sum + item.comments, 0)} comment đã đi qua runtime.`);
    await closeHarness(harness);
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    fatal ??= message;
    for (const gate of gates) {
      if (gate.status === 'PENDING') {
        gate.status = 'FAIL';
        gate.detail = `Chưa chạy do lỗi trước đó: ${message.split('\n')[0]}`;
      }
    }
    console.error(message);
  } finally {
    await Promise.all([...openHarnesses].map(closeHarness));
  }

  const reportPath = join(ROOT, 'docs', 'reports', `REHEARSAL_${REPORT_DATE}.md`);
  await mkdir(dirname(reportPath), { recursive: true });
  await import('node:fs/promises').then(({ writeFile }) => writeFile(reportPath, markdownReport(), 'utf8'));

  for (const root of temporaryRoots) {
    const tempBase = `${resolve(tmpdir())}${sep}`;
    if (!root.startsWith(tempBase)) throw new Error(`Từ chối dọn đường dẫn ngoài thư mục tạm: ${root}`);
    await rm(root, { recursive: true, force: true });
  }

  const passed = gates.every((gate) => gate.status === 'PASS');
  console.log(`${rehearsalStatusLabel(passed)} — ${roundMetrics.length}/6 vòng; biên bản: ${reportPath}`);
  if (!passed) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
