import { existsSync, mkdirSync, readdirSync, rmSync, rmdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { DEFAULT_TIMINGS, type CommandBody } from '@quiz/contracts';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import {
  computeRoundScores, evaluateRoundAchievements, evaluateStageAchievements, questionTop3,
  stageDefinitions, stageScores, stageTop3,
} from '@quiz/quiz-core';
import { buildApp } from '@quiz/server';

const TOKEN = 'v5-benchmark-admin-token-0123456789';
const AUTH = { authorization: `Bearer ${TOKEN}` };
const ANSWER_MS = 20_000;
const SIZES = [100, 1_000, 5_000, 10_000];
const TICK_MS = 25;

function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  return +ordered[Math.min(ordered.length - 1, Math.ceil(p / 100 * ordered.length) - 1)]!.toFixed(2);
}

function distribution(values: number[]) {
  return { p50: percentile(values, 50), p95: percentile(values, 95), p99: percentile(values, 99), max: values.length ? +Math.max(...values).toFixed(2) : null };
}

function databaseBytes(path: string) {
  return [path, `${path}-wal`, `${path}-shm`].reduce((sum, item) => sum + (existsSync(item) ? statSync(item).size : 0), 0);
}

function questions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `v5-scale-${i + 1}`, packId: 'demo', subtopicId: 'demo-general', prompt: `Câu hỏi tải ${i + 1}?`,
    options: ['A', 'B', 'C', 'D'].map((id) => ({ id, text: `Lựa chọn ${id}` })), correctOptionId: 'A',
    explanation: '', difficulty: 'EASY' as const, verificationStatus: 'DEMO' as const, approvalStatus: 'APPROVED' as const,
  }));
}

async function runScenario(players: number, dbPath: string) {
  const scheduler = new ManualScheduler();
  const store = new Store(dbPath);
  store.seedQuestions({ id: 'demo', name: 'V5 load benchmark' }, questions(15), scheduler.now());
  const databaseBytesBefore = databaseBytes(dbPath);
  const adapter = new MockAdapter();
  let emitted = 0;
  let maxBatchSize = 0;
  let batches = 0;
  const originalEmitBatch = adapter.emitBatch.bind(adapter);
  adapter.emitBatch = (comments) => {
    emitted += comments.length;
    batches += 1;
    maxBatchSize = Math.max(maxBatchSize, comments.length);
    return originalEmitBatch(comments);
  };
  const quiz = await buildApp({ store, scheduler, adminToken: TOKEN, adapterFactory: () => adapter });
  const payloadBytes: Record<string, number[]> = {};
  let peakHeap = process.memoryUsage().heapUsed;
  let peakRss = process.memoryUsage().rss;
  try {
    const config = {
      mode: 'MOCK', allowDemoQuestions: true, questionsPerRound: 15, scoringMode: 'KAHOOT', seed: 20261117,
      audienceRotateEvery: 0,
      timings: { ...DEFAULT_TIMINGS, lobbyMs: 0, prepareMs: 500, answerMs: ANSWER_MS, revealMs: 500,
        leaderboardMs: 500, bigLeaderboardMs: 500, roundEndMs: 0, victoryMs: 1_000, intermissionMs: 1_000 },
    };
    const created = await quiz.app.inject({ method: 'POST', url: '/api/sessions', headers: AUTH, payload: { name: `V5 Scale ${players}`, config } });
    if (created.statusCode !== 201) throw new Error(`Tạo phiên lỗi ${created.statusCode}: ${created.body}`);
    const sessionId = String(created.json<{ sessionId: string }>().sessionId);
    const runtime = quiz.runtime();
    if (!runtime) throw new Error('Không tạo được runtime.');
    runtime.subscribe((batch) => {
      peakHeap = Math.max(peakHeap, process.memoryUsage().heapUsed);
      peakRss = Math.max(peakRss, process.memoryUsage().rss);
      for (const outgoing of batch) {
        if (outgoing.audience !== 'public') continue;
        const message = outgoing.message;
        (payloadBytes[message.type] ??= []).push(Buffer.byteLength(JSON.stringify(message.payload)));
      }
    });
    const simulatorResponse = await quiz.app.inject({
      method: 'POST', url: `/api/sessions/${encodeURIComponent(sessionId)}/simulator`, headers: AUTH,
      payload: { action: 'START', players, accuracy: 0.6, participation: 0.9, spamRate: 0.15, noiseRate: 0.1, seed: 20261117 },
    });
    if (simulatorResponse.statusCode !== 200) throw new Error(`Simulator lỗi ${simulatorResponse.statusCode}: ${simulatorResponse.body}`);
    const command = (body: CommandBody) => {
      const response = runtime.dispatch({
        commandId: randomUUID(), expectedStateVersion: runtime.engine.stateVersion,
        operatorId: 'v5-benchmark', requestedAtMs: scheduler.now(), command: body,
      });
      if (!response.result.ok) throw new Error(`${body.type}: ${response.result.code} ${response.result.message}`);
    };
    command({ type: 'OPEN_LOBBY' });
    command({ type: 'START_ROUND', questionCount: 15 });
    const cpuStart = process.cpuUsage();
    const wallStart = performance.now();
    const initialTime = scheduler.now();
    let lastQuestion = runtime.engine.round?.questionIndex ?? -1;
    while (runtime.engine.state !== 'VICTORY') {
      scheduler.advance(TICK_MS);
      const questionIndex = runtime.engine.round?.questionIndex ?? -1;
      if (questionIndex !== lastQuestion) {
        lastQuestion = questionIndex;
        console.error(`[bench:v5] ${players} người: câu ${questionIndex + 1}/15`);
      }
      if (scheduler.now() - initialTime > 15 * (ANSWER_MS + 10_000)) throw new Error('Timeout trước VICTORY.');
    }
    const wallMs = performance.now() - wallStart;
    const cpuUsed = process.cpuUsage(cpuStart);
    const cpuMs = (cpuUsed.user + cpuUsed.system) / 1_000;
    const roundId = runtime.engine.round?.roundId;
    if (!roundId) throw new Error('Không có roundId sau VICTORY.');

    const answers = store.answersForRound(roundId);
    const questionsInRound = store.roundQuestions(roundId);
    const baseline = computeRoundScores(questionsInRound.map((question) => ({
      questionInstanceId: question.id, index: question.position, correctOptionId: question.snapshot.correctOptionId,
      closed: question.status === 'CLOSED', voided: question.status === 'VOIDED',
      openedAtMs: question.openedAtMs, windowMs: ANSWER_MS,
    })), answers, { mode: 'KAHOOT' });
    const currentPoints = store.ledgerTotals(roundId);
    const allScoredPlayers = new Set([...baseline.totals.keys(), ...currentPoints.keys()]);
    const pointTotalsMatch = [...allScoredPlayers].every((playerId) => baseline.totals.get(playerId)?.score === (currentPoints.get(playerId) ?? 0));
    const missingAcceptedAnswers = runtime.metrics.accepted - answers.length;
    if (missingAcceptedAnswers !== 0) throw new Error(`Số đáp án được nhận và lưu DB lệch ${missingAcceptedAnswers}.`);
    if (!pointTotalsMatch) throw new Error('Tổng điểm phát lại trước/sau V5 không bằng nhau.');

    const answerRows = store.raw.prepare(
      `SELECT id AS answerId, question_instance_id AS questionInstanceId, player_id AS playerId,
              option_id AS optionId, received_at_ms AS receivedAtMs
       FROM answers WHERE round_id = ? ORDER BY id`,
    ).all(roundId) as { answerId: number; questionInstanceId: string; playerId: string; optionId: string; receivedAtMs: number }[];
    const questionTop3Ms: number[] = [];
    for (const question of questionsInRound) {
      const started = performance.now();
      questionTop3({
        questionInstanceId: question.id, correctOptionId: question.snapshot.correctOptionId,
        openedAtMs: question.openedAtMs, voided: question.status === 'VOIDED',
        answers: answerRows.filter((answer) => answer.questionInstanceId === question.id).map((answer) => ({ ...answer, safeDisplayName: 'Benchmark player' })),
      });
      questionTop3Ms.push(performance.now() - started);
    }
    const stageQuestions = questionsInRound.map((question) => ({ questionInstanceId: question.id, questionIndex: question.position + 1 }));
    const stageAnswers = store.rankingAnswersForRound(roundId).map((answer) => ({
      questionInstanceId: answer.questionInstanceId, playerId: answer.playerId, safeDisplayName: 'Benchmark player',
    }));
    const scoreEvents = store.ledgerRows(roundId);
    const stages = stageDefinitions(questionsInRound.length, 5);
    const stageCalculationMs: number[] = [];
    for (const stage of stages) {
      const started = performance.now();
      stageTop3(stageScores(stage, stageQuestions, stageAnswers, scoreEvents));
      stageCalculationMs.push(performance.now() - started);
    }
    const achievementInput = {
      roundId,
      questions: questionsInRound.map((question) => ({ questionInstanceId: question.id, questionIndex: question.position + 1, status: question.status })),
      answers: store.achievementAnswersForRound(roundId).map((answer) => ({
        questionInstanceId: answer.questionInstanceId, playerId: answer.playerId, optionId: answer.optionId, safeDisplayName: 'Benchmark player',
      })),
      scoreEvents,
      leaderboardSnapshots: store.leaderboardHistory(roundId).map((snapshot) => ({
        questionInstanceId: snapshot.questionInstanceId, entries: snapshot.entries.map(({ playerId, rank }) => ({ playerId, rank })),
      })),
    };
    const achievementEvaluationMs: number[] = [];
    for (const stage of stages) {
      const started = performance.now();
      evaluateStageAchievements(achievementInput, stage);
      achievementEvaluationMs.push(performance.now() - started);
    }
    const roundEvalStarted = performance.now();
    evaluateRoundAchievements(achievementInput);
    achievementEvaluationMs.push(performance.now() - roundEvalStarted);
    const websocketPayloadBytesByType = Object.fromEntries(Object.entries(payloadBytes).map(([type, values]) => [type, {
      count: values.length,
      meanBytes: values.length ? +(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : 0,
      p95Bytes: percentile(values, 95),
      maxBytes: Math.max(...values),
    }]));
    const databaseGrowthBytes = databaseBytes(dbPath) - databaseBytesBefore;
    const rankingSnapshots = (store.raw.prepare('SELECT COUNT(*) AS n FROM ranking_snapshots WHERE round_id = ?').get(roundId) as { n: number }).n;
    const achievementAwards = (store.raw.prepare('SELECT COUNT(*) AS n FROM achievement_awards WHERE round_id = ?').get(roundId) as { n: number }).n;
    const result = {
      players,
      settings: { questionCount: 15, leaderboardInterval: 5, answerWindowMs: ANSWER_MS, participation: 0.9, accuracy: 0.6, spamRate: 0.15, noiseRate: 0.1, seed: 20261117 },
      measuredWallMs: +wallMs.toFixed(2), cpuMs: +cpuMs.toFixed(2),
      memoryMiB: { heapPeakSampled: +(peakHeap / 1024 / 1024).toFixed(1), rssPeakSampled: +(peakRss / 1024 / 1024).toFixed(1) },
      answers: { emitted: emitted, received: runtime.metrics.received, accepted: runtime.metrics.accepted, persisted: answers.length, missingAcceptedAnswers, burstBatchCount: batches, maxCommentsPerBatch: maxBatchSize },
      pointReplay: {
        pointsBeforeV5: [...baseline.totals.values()].reduce((sum, total) => sum + total.score, 0),
        pointsAfterV5: [...currentPoints.values()].reduce((sum, total) => sum + total, 0),
        perPlayerEqual: pointTotalsMatch,
      },
      evaluationMs: { questionTop3: distribution(questionTop3Ms), stageTop3: distribution(stageCalculationMs), achievementEvaluator: distribution(achievementEvaluationMs) },
      websocketPayloadBytesByType,
      database: { beforeBytes: databaseBytesBefore, afterBytes: databaseBytesBefore + databaseGrowthBytes, growthBytes: databaseGrowthBytes },
      persistedV5: { rankingSnapshots, achievementAwards },
    };
    if (rankingSnapshots === 0 || achievementAwards === 0) throw new Error('Không thấy dữ liệu Top 3/danh hiệu được lưu trong DB.');
    console.log(JSON.stringify(result));
    return result;
  } finally {
    await quiz.close().catch(() => {});
    store.close();
  }
}

async function main() {
  const repository = resolve(process.cwd());
  if (!existsSync(join(repository, 'pnpm-workspace.yaml'))) throw new Error('Chạy benchmark từ thư mục gốc repository.');
  const temporaryRoot = join(repository, '.tmp-test');
  mkdirSync(temporaryRoot, { recursive: true });
  const runRoot = join(temporaryRoot, `v5-run-${process.pid}-${Date.now()}`);
  const reportRoot = join(repository, '.claude', 'bench-v5-reports');
  mkdirSync(reportRoot, { recursive: true });
  mkdirSync(runRoot);
  const results: Awaited<ReturnType<typeof runScenario>>[] = [];
  try {
    for (const players of SIZES) {
      console.error(`[bench:v5] Bắt đầu ${players} người`);
      results.push(await runScenario(players, join(runRoot, `quiz-${players}.db`)));
    }
    const prefix = `bench-v5-${new Date().toISOString().replace(/[:.]/gu, '-')}`;
    const jsonPath = join(reportRoot, `${prefix}.json`);
    const markdownPath = join(reportRoot, `${prefix}.md`);
    const markdown = [
      '# V5 load benchmark', '',
      '| Người chơi | Đáp án nhận/lưu | Mất | Điểm replay khớp | Top 3 câu p50/p95/p99 ms | Top 3 chặng p50/p95/p99 ms | Evaluator danh hiệu p50/p95/p99 ms | CPU ms | Heap peak MiB | RSS peak MiB | DB tăng bytes |',
      '| ---: | ---: | ---: | :---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
      ...results.map((item) => `| ${item.players} | ${item.answers.accepted}/${item.answers.persisted} | ${item.answers.missingAcceptedAnswers} | ${item.pointReplay.perPlayerEqual ? 'Có' : 'Không'} | ${item.evaluationMs.questionTop3.p50}/${item.evaluationMs.questionTop3.p95}/${item.evaluationMs.questionTop3.p99} | ${item.evaluationMs.stageTop3.p50}/${item.evaluationMs.stageTop3.p95}/${item.evaluationMs.stageTop3.p99} | ${item.evaluationMs.achievementEvaluator.p50}/${item.evaluationMs.achievementEvaluator.p95}/${item.evaluationMs.achievementEvaluator.p99} | ${item.cpuMs} | ${item.memoryMiB.heapPeakSampled} | ${item.memoryMiB.rssPeakSampled} | ${item.database.growthBytes} |`),
      '', 'Payload WebSocket theo event type và chi tiết: xem file JSON.', '',
      `JSON: \`${jsonPath}\``, '',
    ].join('\n');
    writeFileSync(jsonPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`, 'utf8');
    writeFileSync(markdownPath, markdown, 'utf8');
    console.log(`Báo cáo Markdown: ${markdownPath}\nBáo cáo JSON: ${jsonPath}`);
  } finally {
    rmSync(runRoot, { recursive: true, force: true });
    if (readdirSync(temporaryRoot).length === 0) rmdirSync(temporaryRoot);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
