import { existsSync, mkdirSync, readdirSync, rmSync, rmdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { DEFAULT_TIMINGS, type CommandBody } from '@quiz/contracts';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { buildApp } from '@quiz/server';

const TOKEN = 'scale-benchmark-admin-token-0123456789';
const AUTH = { authorization: `Bearer ${TOKEN}` };
const TICK_MS = 25;
const ANSWER_MS = 20_000;
const DEFAULT_SIZES = [10_000, 20_000];

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.floor((p / 100) * ordered.length))]!;
}

function sample(values: number[]) {
  return {
    p50: percentile(values, 50),
    p99: percentile(values, 99),
    max: values.length ? Math.max(...values) : null,
  };
}

function questions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `scale-${i + 1}`,
    packId: 'demo',
    subtopicId: 'demo-general',
    prompt: `Câu hỏi tải ${i + 1}?`,
    options: ['A', 'B', 'C', 'D'].map((id) => ({ id, text: `Lựa chọn ${id}` })),
    correctOptionId: 'A',
    explanation: '',
    difficulty: 'EASY' as const,
    verificationStatus: 'DEMO' as const,
    approvalStatus: 'APPROVED' as const,
  }));
}

function advanceUntil(scheduler: ManualScheduler, predicate: () => boolean, maxMs: number) {
  let elapsed = 0;
  while (!predicate()) {
    if (elapsed >= maxMs) throw new Error(`Timeout sau ${maxMs} ms ảo`);
    scheduler.advance(TICK_MS);
    elapsed += TICK_MS;
  }
}

function instrumentStore(store: Store, durations: Record<string, number>) {
  const target = store as unknown as Record<string, unknown>;
  for (const name of [
    'roundQuestions', 'scoringRowsForQuestion', 'applyQuestionTotals', 'insertLedger', 'saveRoundPlayers',
    'ledgerTotals', 'standings', 'rankedStandings', 'participantCount', 'saveLeaderboardSnapshot',
    'leaderboardHistory', 'answersForRound',
  ]) {
    const original = target[name];
    if (typeof original !== 'function') continue;
    target[name] = (...args: unknown[]) => {
      const startedAt = performance.now();
      try {
        return original.apply(store, args);
      } finally {
        durations[name] = (durations[name] ?? 0) + performance.now() - startedAt;
      }
    };
  }
}

async function runScenario(players: number, dbPath: string) {
  const scheduler = new ManualScheduler();
  const store = new Store(dbPath);
  const storageDurations: Record<string, number> = {};
  instrumentStore(store, storageDurations);
  store.seedQuestions({ id: 'demo', name: 'Scale benchmark' }, questions(10), scheduler.now());
  const adapter = new MockAdapter();
  let emitted = 0;
  const ingestBatchMs: number[] = [];
  const originalEmitBatch = adapter.emitBatch.bind(adapter);
  adapter.emitBatch = (comments) => {
    const startedAt = performance.now();
    emitted += comments.length;
    const result = originalEmitBatch(comments);
    const durationMs = performance.now() - startedAt;
    for (let i = 0; i < comments.length; i += 1) ingestBatchMs.push(durationMs);
    return result;
  };
  const quiz = await buildApp({ store, scheduler, adminToken: TOKEN, adapterFactory: () => adapter });
  const ingestMs: number[] = [];
  const answerCountLatencyMs: number[] = [];
  const answerCountWallLatencyMs: number[] = [];
  const audienceLatencyMs: number[] = [];
  const audienceWallLatencyMs: number[] = [];
  const snapshotBytes: Record<string, number> = {};
  let pendingAnswerOverlayAtVirtualMs: number | null = null;
  let pendingAudienceOverlayAtVirtualMs: number | null = null;
  let pendingAnswerOverlayAtWallMs: number | null = null;
  let pendingAudienceOverlayAtWallMs: number | null = null;
  let maxHeapBytes = process.memoryUsage().heapUsed;
  let maxRssBytes = process.memoryUsage().rss;
  let scoreRoundMs: number | null = null;
  let scoreRoundCpuMs: number | null = null;
  let scoreRoundStorageMs: Record<string, number> | null = null;

  try {
    const config = {
      mode: 'MOCK',
      allowDemoQuestions: true,
      questionsPerRound: 10,
      seed: 20261117,
      audienceRotateEvery: 0,
      timings: {
        ...DEFAULT_TIMINGS,
        lobbyMs: 0,
        prepareMs: 500,
        answerMs: ANSWER_MS,
        revealMs: 500,
        leaderboardMs: 500,
        bigLeaderboardMs: 500,
        roundEndMs: 0,
        victoryMs: 1_000,
        intermissionMs: 1_000,
      },
    };
    const created = await quiz.app.inject({ method: 'POST', url: '/api/sessions', headers: AUTH, payload: { name: `Scale ${players}`, config } });
    if (created.statusCode !== 201) throw new Error(`Tạo phiên lỗi ${created.statusCode}: ${created.body}`);
    const sessionId = String(created.json<{ sessionId: string }>().sessionId);
    await Promise.resolve();
    const runtime = quiz.runtime();
    if (!runtime) throw new Error('Không có runtime');

    const originalIngest = runtime.ingest.bind(runtime);
    runtime.ingest = (raw) => {
      const start = performance.now();
      const result = originalIngest(raw);
      ingestMs.push(performance.now() - start);
      if (result.accepted) {
        if (pendingAnswerOverlayAtVirtualMs === null) pendingAnswerOverlayAtVirtualMs = scheduler.now();
        if (pendingAudienceOverlayAtVirtualMs === null) pendingAudienceOverlayAtVirtualMs = scheduler.now();
        if (pendingAnswerOverlayAtWallMs === null) pendingAnswerOverlayAtWallMs = performance.now();
        if (pendingAudienceOverlayAtWallMs === null) pendingAudienceOverlayAtWallMs = performance.now();
      }
      return result;
    };

    const internal = runtime as unknown as {
      scoreRound: (now: number, kind: 'AFTER_QUESTION' | 'AFTER_VOID', qid: string) => string | null;
    };
    const originalScoreRound = internal.scoreRound;
    internal.scoreRound = (now, kind, qid) => {
      const start = performance.now();
      const cpu = process.cpuUsage();
      const storageBefore = { ...storageDurations };
      try {
        return originalScoreRound.call(runtime, now, kind, qid);
      } finally {
        scoreRoundMs = performance.now() - start;
        const used = process.cpuUsage(cpu);
        scoreRoundCpuMs = (used.user + used.system) / 1_000;
        scoreRoundStorageMs = Object.fromEntries(Object.entries(storageDurations).map(([name, duration]) => [
          name,
          +(duration - (storageBefore[name] ?? 0)).toFixed(2),
        ]));
      }
    };

    runtime.subscribe((batch) => {
      maxHeapBytes = Math.max(maxHeapBytes, process.memoryUsage().heapUsed);
      maxRssBytes = Math.max(maxRssBytes, process.memoryUsage().rss);
      for (const outgoing of batch) {
        if (outgoing.audience !== 'public') continue;
        const { message } = outgoing;
        const bytes = Buffer.byteLength(JSON.stringify(message));
        snapshotBytes[message.type] = Math.max(snapshotBytes[message.type] ?? 0, bytes);
        if (message.type === 'ANSWER_COUNTS' && pendingAnswerOverlayAtVirtualMs !== null) {
          answerCountLatencyMs.push(message.serverTimeMs - pendingAnswerOverlayAtVirtualMs);
          pendingAnswerOverlayAtVirtualMs = null;
          if (pendingAnswerOverlayAtWallMs !== null) {
            answerCountWallLatencyMs.push(performance.now() - pendingAnswerOverlayAtWallMs);
            pendingAnswerOverlayAtWallMs = null;
          }
        }
        if (message.type === 'AUDIENCE_UPDATED' && pendingAudienceOverlayAtWallMs !== null) {
          if (pendingAudienceOverlayAtVirtualMs !== null) {
            audienceLatencyMs.push(message.serverTimeMs - pendingAudienceOverlayAtVirtualMs);
            pendingAudienceOverlayAtVirtualMs = null;
          }
          audienceWallLatencyMs.push(performance.now() - pendingAudienceOverlayAtWallMs);
          pendingAudienceOverlayAtWallMs = null;
        }
      }
    });

    const cpuStart = process.cpuUsage();
    const wallStart = performance.now();
    const simulatorStartedAt = performance.now();
    const simulatorResponse = await quiz.app.inject({
      method: 'POST',
      url: `/api/sessions/${encodeURIComponent(sessionId)}/simulator`,
      headers: AUTH,
      payload: { action: 'START', players, accuracy: 0.6, participation: 0.9, spamRate: 0.15, noiseRate: 0.1, seed: 20261117 },
    });
    if (simulatorResponse.statusCode !== 200) throw new Error(`Khởi chạy simulator lỗi ${simulatorResponse.statusCode}: ${simulatorResponse.body}`);
    const simulatorSetupMs = performance.now() - simulatorStartedAt;

    const command = async (body: CommandBody) => {
      const response = await quiz.app.inject({
        method: 'POST',
        url: `/api/sessions/${encodeURIComponent(sessionId)}/commands`,
        headers: AUTH,
        payload: {
          commandId: randomUUID(),
          expectedStateVersion: runtime.engine.stateVersion,
          operatorId: 'scale-benchmark',
          requestedAtMs: scheduler.now(),
          command: body,
        },
      });
      if (response.statusCode !== 200) throw new Error(`Lệnh ${body.type} lỗi ${response.statusCode}: ${response.body}`);
    };
    await command({ type: 'OPEN_LOBBY' });
    await command({ type: 'START_ROUND', questionCount: 10 });

    const acceptStarted = performance.now();
    advanceUntil(scheduler, () => runtime.engine.state === 'ACCEPTING', 20_000);
    const simulatorScheduleMs = performance.now() - acceptStarted;
    const scheduledHeapBytes = process.memoryUsage().heapUsed;
    const scheduledRssBytes = process.memoryUsage().rss;
    const receivedAtAccept = emitted;

    const transitionMs: Record<string, number> = {};
    const transitionCpuMs: Record<string, number> = {};
    let previousState = runtime.engine.state;
    let progressQuestionIndex = runtime.engine.round?.questionIndex ?? -1;
    const acceptedAtMs = scheduler.now();
    while (runtime.engine.state !== 'LEADERBOARD') {
      const stepStarted = performance.now();
      const stepCpu = process.cpuUsage();
      scheduler.advance(TICK_MS);
      const stepMs = performance.now() - stepStarted;
      const stepCpuUsed = process.cpuUsage(stepCpu);
      const nextState = runtime.engine.state;
      if (nextState !== previousState) {
        const key = `${previousState}->${nextState}`;
        transitionMs[key] = stepMs;
        transitionCpuMs[key] = (stepCpuUsed.user + stepCpuUsed.system) / 1_000;
      }
      previousState = nextState;
      const questionIndex = runtime.engine.round?.questionIndex ?? -1;
      if (questionIndex !== progressQuestionIndex) {
        progressQuestionIndex = questionIndex;
        console.error(`[bench] ${players} người: câu ${questionIndex + 1}/10, trạng thái ${nextState}`);
      }
      if (scheduler.now() - acceptedAtMs > ANSWER_MS + 10_000) throw new Error('Không tới LEADERBOARD trong thời gian tải.');
    }

    const wallMs = performance.now() - wallStart;
    const cpu = process.cpuUsage(cpuStart);
    const cpuMs = (cpu.user + cpu.system) / 1_000;
    const roundId = runtime.engine.round?.roundId;
    if (!roundId) throw new Error('Thiếu roundId sau LEADERBOARD');
    const answerRows = store.answersForRound(roundId).length;
    const finalSnapshotBytes = Buffer.byteLength(JSON.stringify(runtime.publicSnapshot()));
    snapshotBytes.PUBLIC_SNAPSHOT = Math.max(snapshotBytes.PUBLIC_SNAPSHOT ?? 0, finalSnapshotBytes);
    const metrics = runtime.metrics;

    const result = {
      players,
      settings: { answerWindowMs: ANSWER_MS, participation: 0.9, accuracy: 0.6, spamRate: 0.15, noiseRate: 0.1 },
      simulatorSetupMs: +simulatorSetupMs.toFixed(2),
      simulatorScheduleMs: +simulatorScheduleMs.toFixed(2),
      measuredWallMs: +wallMs.toFixed(2),
      cpuMs: +cpuMs.toFixed(2),
      cpuCores: +(cpuMs / Math.max(1, wallMs)).toFixed(2),
      memoryMiB: {
        heapBefore: +(scheduledHeapBytes / 1024 / 1024).toFixed(1),
        heapPeakSampled: +(maxHeapBytes / 1024 / 1024).toFixed(1),
        rssBefore: +(scheduledRssBytes / 1024 / 1024).toFixed(1),
        rssPeakSampled: +(maxRssBytes / 1024 / 1024).toFixed(1),
      },
      ingestMs: sample(ingestMs),
      ingestBatchMs: sample(ingestBatchMs),
      answerCountOverlayVirtualLatencyMs: sample(answerCountLatencyMs),
      answerCountOverlayWallLatencyMs: sample(answerCountWallLatencyMs),
      audienceOverlayVirtualLatencyMs: sample(audienceLatencyMs),
      audienceOverlayWallLatencyMs: sample(audienceWallLatencyMs),
      stateTransitionCallbackMs: transitionMs,
      stateTransitionCallbackCpuMs: transitionCpuMs,
      scoreAndRankMs: scoreRoundMs,
      scoreAndRankCpuMs: scoreRoundCpuMs,
      scoreAndRankStorageMs: scoreRoundStorageMs,
      incoming: { simulatorEmitted: emitted, runtimeReceived: metrics.received, accepted: metrics.accepted, databaseAnswers: answerRows, missingAcceptedAnswers: metrics.accepted - answerRows, adapterDropped: adapter.dropped },
      publicMessageMaxBytes: snapshotBytes,
      simulatorEmittedBeforeAcceptState: receivedAtAccept,
    };
    console.log(JSON.stringify(result));
    return result;
  } finally {
    await quiz.close().catch(() => {});
    store.close();
  }
}

async function main() {
  const requested = process.argv.slice(2).map(Number);
  const sizes = requested.length ? requested : DEFAULT_SIZES;
  if (sizes.some((size) => !Number.isInteger(size) || size < 1 || size > 20_000))
    throw new Error('Đối số người chơi phải là số nguyên trong khoảng 1–20.000.');

  const repository = resolve(process.cwd());
  if (!existsSync(join(repository, 'pnpm-workspace.yaml'))) throw new Error('Chạy script từ thư mục gốc repository.');
  const tempRoot = join(repository, '.tmp-test');
  const createdTempRoot = !existsSync(tempRoot);
  mkdirSync(tempRoot, { recursive: true });
  const runRoot = join(tempRoot, `scale-20k-${process.pid}-${Date.now()}`);
  mkdirSync(runRoot);
  if (!runRoot.startsWith(`${tempRoot}${process.platform === 'win32' ? '\\' : '/'}`)) throw new Error('Đường dẫn scratch không hợp lệ.');
  try {
    for (const size of sizes) {
      console.error(`[bench] Bắt đầu tải ${size} người`);
      await runScenario(size, join(runRoot, `quiz-${size}.sqlite`));
    }
  } finally {
    rmSync(runRoot, { recursive: true, force: true });
    if (createdTempRoot && readdirSync(tempRoot).length === 0) rmdirSync(tempRoot);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
