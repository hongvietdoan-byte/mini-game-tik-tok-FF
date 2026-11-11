import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_TIMINGS } from '@quiz/contracts';
import { ManualScheduler } from '@quiz/live-adapters';
import { currentQuestionInstanceId } from '@quiz/quiz-core';
import {
  boot,
  command,
  createSession,
  ledgerSums,
  referenceScores,
  rt,
  runUntil,
  storedScores,
  tempDbPath,
  type Harness,
} from '../integration/helpers';

const open: Harness[] = [];
const ROUNDS = 6;
const QUESTIONS_PER_ROUND = 10;
const COMMENTS_PER_QUESTION = 1_140; // 19,65 bình luận/s trong cửa sổ 58 giây.
const COMMENT_STEP_MS = 50;
const ANSWER_MS = 58_000;
const EXPECTED_COMMENTS = ROUNDS * QUESTIONS_PER_ROUND * COMMENTS_PER_QUESTION;
const OLD_EVENT_MS = 8 * 24 * 60 * 60 * 1_000;
const MEMORY_LIMIT_BYTES = 96 * 1024 * 1024;
const SECOND_HALF_HEAP_LIMIT_BYTES = 32 * 1024 * 1024;
const TIMINGS = {
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
};

afterEach(async () => {
  for (const h of open.splice(0)) {
    await h.quiz.close().catch(() => {});
    h.store.close();
  }
});

type SequenceAudit = { first: number | null; last: number; regressions: number; messages: number };

function watchSequence(h: Harness, audit: SequenceAudit) {
  return rt(h).subscribe((batch) => {
    for (const outgoing of batch) {
      const seq = outgoing.message.seq;
      if (audit.first === null) audit.first = seq;
      if (seq <= audit.last) audit.regressions += 1;
      audit.last = seq;
      audit.messages += 1;
    }
  });
}

function seatShape(h: Harness) {
  const audience = rt(h).publicSnapshot().audience;
  if (!audience) throw new Error('Audience chưa được tạo trong vòng');
  expect(audience.seats).toHaveLength(35);
  const occupied = audience.seats.flatMap((seat) => (seat.occupant ? [seat.occupant.displayName] : []));
  expect(new Set(occupied).size).toBe(occupied.length);
  expect(audience.queued + occupied.length).toBe(audience.total);
  return audience;
}

function seatSignature(h: Harness) {
  return seatShape(h).seats.map((seat) => `${seat.slotId}:${seat.occupant?.displayName ?? '-'}:${seat.occupant?.characterId ?? '-'}`).join('|');
}

function checkRotation(h: Harness, before: ReturnType<typeof seatShape>) {
  const after = seatShape(h);
  expect(after.rotationId).toBe(before.rotationId + 1);
  const changed = after.seats.filter((seat, index) => seat.occupant?.displayName !== before.seats[index]!.occupant?.displayName);
  expect(changed.length).toBeGreaterThan(0);
  expect(changed.length).toBeLessThanOrEqual(5);

  const seatedBefore = new Set(before.seats.flatMap((seat) => (seat.occupant ? [seat.occupant.displayName] : [])));
  const seatedAfter = new Set(after.seats.flatMap((seat) => (seat.occupant ? [seat.occupant.displayName] : [])));
  for (const top of rt(h).publicSnapshot().leaderboard?.entries.slice(0, 3) ?? []) {
    if (!seatedBefore.has(top.displayName)) continue;
    expect(seatedAfter.has(top.displayName)).toBe(true);
    expect(after.seats.find((seat) => seat.occupant?.displayName === top.displayName)?.occupant?.pinned).toBe(true);
  }
  return after;
}

function memoryBytes() {
  const gc = (globalThis as typeof globalThis & { gc?: () => void }).gc;
  gc?.();
  return process.memoryUsage().heapUsed;
}

async function memorySnapshot() {
  await new Promise<void>((resolve) => setImmediate(resolve));
  return memoryBytes();
}

function duplicateRowCount(h: Harness, table: 'answers' | 'score_events', roundId: string) {
  const group = table === 'answers'
    ? 'round_id, question_instance_id, player_id'
    : 'round_id, question_instance_id, player_id, score_reason';
  return (h.store.raw
    .prepare(`SELECT COUNT(*) AS n FROM (SELECT 1 FROM ${table} WHERE round_id = ? GROUP BY ${group} HAVING COUNT(*) > 1)`)
    .get(roundId) as { n: number }).n;
}

describe('C-0051 — soak MOCK 60 phút ảo', () => {
  it('6 vòng × 10 câu, 20 comment/s, reconnect, recovery, prune, score và 35 ghế', async () => {
    const dbPath = tempDbPath();
    let h = await createSession(await boot({ dbPath, questions: ROUNDS * QUESTIONS_PER_ROUND }), {
      questionsPerRound: QUESTIONS_PER_ROUND,
      timings: TIMINGS,
      audienceRotateEvery: 2,
      audiencePinTop: 3,
    });
    open.push(h);
    const sessionId = h.sessionId;
    const sessionStartedAt = h.scheduler.now();
    const initialHeap = await memorySnapshot();
    const audits: SequenceAudit[] = [{ first: null, last: 0, regressions: 0, messages: 0 }];
    let unsubscribe = watchSequence(h, audits[0]!);
    let commentNo = 0;
    let acceptedComments = 0;
    let reconnects = 0;
    let restartSeqBefore = 0;
    let restartSeqAfter = 0;
    let restartStateVersionBefore = 0;
    let restartStateVersionAfter = 0;
    let middleHeap = 0;
    const roundIds: string[] = [];

    expect((await command(h, { type: 'OPEN_LOBBY' })).status).toBe(200);
    for (let round = 0; round < ROUNDS; round += 1) {
      const started = await command(h, { type: 'START_ROUND', questionCount: QUESTIONS_PER_ROUND });
      expect(started.status, JSON.stringify(started.body)).toBe(200);
      const roundId = rt(h).engine.round!.roundId;
      roundIds.push(roundId);
      let lastSeats: ReturnType<typeof seatShape> | null = null;

      for (let question = 0; question < QUESTIONS_PER_ROUND; question += 1) {
        const globalQuestion = round * QUESTIONS_PER_ROUND + question;
        runUntil(h, () => rt(h).engine.state === 'ACCEPTING' && rt(h).engine.round!.questionIndex === question);
        const r = rt(h);
        const questionId = currentQuestionInstanceId(r.engine);
        if (!questionId) throw new Error('Thiếu question instance trong ACCEPTING');

        if (question > 0 && question % 2 === 0) {
          if (!lastSeats) throw new Error('Thiếu snapshot ghế trước lần xoay');
          lastSeats = checkRotation(h, lastSeats);
        } else {
          lastSeats = seatShape(h);
        }

        const correct = r.adminSnapshot().current!.correctOptionId;
        const wrong = (['A', 'B', 'C', 'D'] as const).find((option) => option !== correct)!;
        for (let slot = 0; slot < COMMENTS_PER_QUESTION; slot += 1) {
          if (globalQuestion === 30 && slot === COMMENTS_PER_QUESTION / 2) {
            // Mốc giữa: chờ nhịp flush audience trước khi mô phỏng crash giữa câu.
            h.scheduler.advance(1_000);
            const beforeRecoverySeats = seatSignature(h);
            const expiredId = 'soak-expired-before-recovery';
            h.store.raw
              .prepare('INSERT INTO processed_events (source, event_id, question_instance_id, received_at_ms) VALUES (?, ?, ?, ?)')
              .run('MOCK', expiredId, questionId, h.scheduler.now() - OLD_EVENT_MS);
            const previousNow = h.scheduler.now();
            restartStateVersionBefore = rt(h).engine.stateVersion;
            restartSeqBefore = audits.at(-1)!.last;
            unsubscribe();
            await h.quiz.close();
            h.store.close();
            open.splice(open.indexOf(h), 1);

            const restored = await boot({ dbPath, scheduler: new ManualScheduler(previousNow), seedQuestions: false });
            await restored.quiz.recover();
            h = { ...restored, sessionId };
            open.push(h);
            expect(rt(h).engine.state).toBe('PAUSED');
            expect(rt(h).engine.suspended?.kind).toBe('RECOVERY');
            expect(rt(h).engine.round!.roundId).toBe(roundId);
            expect(currentQuestionInstanceId(rt(h).engine)).toBe(questionId);
            restartStateVersionAfter = rt(h).publicSnapshot().stateVersion;
            expect(restartStateVersionAfter).toBeGreaterThanOrEqual(restartStateVersionBefore);
            expect(seatSignature(h)).toBe(beforeRecoverySeats);
            expect(h.store.raw.prepare('SELECT event_id FROM processed_events WHERE event_id = ?').get(expiredId)).toBeUndefined();

            const recoveryAudit: SequenceAudit = { first: null, last: 0, regressions: 0, messages: 0 };
            audits.push(recoveryAudit);
            unsubscribe = watchSequence(h, recoveryAudit);
            expect((await command(h, { type: 'RESOLVE_RECOVERY', decision: 'RESUME', reason: 'Tiếp tục sau crash trong soak' })).status).toBe(200);
            restartSeqAfter = recoveryAudit.first ?? recoveryAudit.last;

            const replay = rt(h).ingest({
              source: 'MOCK',
              userId: 'soak-replay-probe',
              displayName: 'Kiểm tra phát lại',
              text: correct,
              eventId: `soak-${String(commentNo - 1).padStart(6, '0')}`,
            });
            expect(replay).toEqual({ accepted: false, reason: 'DUPLICATE_EVENT' });
          }

          const player = commentNo % 2_000;
          const result = rt(h).ingest({
            source: 'MOCK',
            userId: `soak-player-${String(player).padStart(4, '0')}`,
            displayName: `Khán giả soak ${player}`,
            text: commentNo % 5 === 0 ? wrong : correct,
            eventId: `soak-${String(commentNo).padStart(6, '0')}`,
          });
          if (result.accepted) acceptedComments += 1;
          commentNo += 1;
          h.scheduler.advance(COMMENT_STEP_MS);

          if (slot === COMMENTS_PER_QUESTION / 2 && [2, 7, 13, 18, 24].includes(globalQuestion)) {
            const down = await h.quiz.app.inject({
              method: 'POST',
              url: `/api/sessions/${sessionId}/source`,
              headers: { authorization: 'Bearer test-admin-token-0123456789abcdef' },
              payload: { action: 'DISCONNECT' },
            });
            expect(down.statusCode).toBe(200);
            expect(rt(h).engine.state).toBe('CONNECTION_INTERRUPTED');
            h.scheduler.advance(1_000);
            const restored = await h.quiz.app.inject({
              method: 'POST',
              url: `/api/sessions/${sessionId}/source`,
              headers: { authorization: 'Bearer test-admin-token-0123456789abcdef' },
              payload: { action: 'RECONNECT' },
            });
            expect(restored.statusCode).toBe(200);
            expect(rt(h).engine.state).toBe('CONNECTION_INTERRUPTED');
            expect((await command(h, { type: 'RESUME', reason: 'Kết nối lại trong soak' })).status).toBe(200);
            expect(rt(h).engine.state).toBe('ACCEPTING');
            reconnects += 1;
          }
        }

        runUntil(h, () => rt(h).engine.state === 'REVEAL' && rt(h).engine.round!.questionIndex === question);
        const audience = seatShape(h);
        expect(audience.total).toBe(question === 0 ? COMMENTS_PER_QUESTION : 2_000);
        if (commentNo === EXPECTED_COMMENTS / 2) middleHeap = await memorySnapshot();

        if (question === QUESTIONS_PER_ROUND - 1) {
          runUntil(h, () => rt(h).engine.state === 'VICTORY');
        }
      }

      const answers = h.store.raw
        .prepare('SELECT COUNT(*) AS n, COUNT(DISTINCT question_instance_id || \'|\' || player_id) AS unique_n FROM answers WHERE round_id = ?')
        .get(roundId) as { n: number; unique_n: number };
      expect(answers).toEqual({ n: QUESTIONS_PER_ROUND * COMMENTS_PER_QUESTION, unique_n: QUESTIONS_PER_ROUND * COMMENTS_PER_QUESTION });
      expect(duplicateRowCount(h, 'answers', roundId)).toBe(0);
      expect(duplicateRowCount(h, 'score_events', roundId)).toBe(0);

      if (round < ROUNDS - 1) runUntil(h, () => rt(h).engine.state === 'LOBBY');
    }

    const remainingMs = 3_600_000 - (h.scheduler.now() - sessionStartedAt);
    if (remainingMs > 0) h.scheduler.advance(remainingMs);
    const finalHeap = await memorySnapshot();
    const elapsedVirtualMs = h.scheduler.now() - sessionStartedAt;
    const processed = h.store.raw
      .prepare("SELECT COUNT(*) AS n, COUNT(DISTINCT event_id) AS unique_n FROM processed_events WHERE source = 'MOCK' AND event_id LIKE 'soak-%'")
      .get() as { n: number; unique_n: number };
    const connectionDrops = (h.store.raw
      .prepare("SELECT COUNT(*) AS n FROM connection_events WHERE session_id = ? AND status = 'DISCONNECTED'")
      .get(sessionId) as { n: number }).n;
    const roundCount = (h.store.raw
      .prepare('SELECT COUNT(*) AS n FROM rounds WHERE session_id = ? AND status = \'COMPLETED\'')
      .get(sessionId) as { n: number }).n;
    const perRound = h.store.raw
      .prepare('SELECT COUNT(*) AS n FROM round_questions WHERE round_id IN (SELECT id FROM rounds WHERE session_id = ?) AND status = \'CLOSED\'')
      .get(sessionId) as { n: number };
    for (const roundId of roundIds) {
      const reference = referenceScores(h.store, roundId, { windowMs: ANSWER_MS });
      expect(storedScores(h.store, roundId)).toEqual(reference);
      const ledger = ledgerSums(h.store, roundId);
      for (const [playerId, score] of reference) expect(ledger.get(playerId) ?? 0).toBe(score.score);
    }

    console.log(
      `[soak] virtual=${(elapsedVirtualMs / 60_000).toFixed(2)} min; comments=${commentNo}; accepted=${acceptedComments}; ` +
      `heap start/mid/end=${(initialHeap / 1_048_576).toFixed(1)}/${(middleHeap / 1_048_576).toFixed(1)}/${(finalHeap / 1_048_576).toFixed(1)} MiB; ` +
      `seq process before/after=${restartSeqBefore}/${restartSeqAfter}; stateVersion restart=${restartStateVersionBefore}/${restartStateVersionAfter}; ` +
      `reconnects=${reconnects}; drops=${connectionDrops}`,
    );

    expect(elapsedVirtualMs).toBe(3_600_000);
    expect(commentNo).toBe(EXPECTED_COMMENTS);
    expect(acceptedComments).toBe(EXPECTED_COMMENTS);
    expect(reconnects).toBe(5);
    expect(connectionDrops).toBeGreaterThanOrEqual(5);
    expect(roundCount).toBe(ROUNDS);
    expect(perRound.n).toBe(ROUNDS * QUESTIONS_PER_ROUND);
    expect(processed).toEqual({ n: EXPECTED_COMMENTS, unique_n: EXPECTED_COMMENTS });
    expect(middleHeap).toBeGreaterThan(0);
    expect(finalHeap - initialHeap).toBeLessThan(MEMORY_LIMIT_BYTES);
    expect(finalHeap - middleHeap).toBeLessThan(SECOND_HALF_HEAP_LIMIT_BYTES);
    expect(audits.every((audit) => audit.regressions === 0 && audit.messages > 0)).toBe(true);
  }, 300_000);

  it('LIVE kết thúc giữa vòng: kết nối không tự chạy lại, operator dừng vòng an toàn', async () => {
    const h = await createSession(await boot({ questions: 10 }), {
      questionsPerRound: 10,
      timings: { ...TIMINGS, answerMs: 3_000 },
    });
    open.push(h);
    expect((await command(h, { type: 'OPEN_LOBBY' })).status).toBe(200);
    expect((await command(h, { type: 'START_ROUND', questionCount: 10 })).status).toBe(200);
    runUntil(h, () => rt(h).engine.state === 'ACCEPTING');
    const r = rt(h);
    const current = currentQuestionInstanceId(r.engine)!;
    const roundId = r.engine.round!.roundId;
    expect(r.ingest({ source: 'MOCK', userId: 'live-end-player', displayName: 'Khán giả', text: 'A', eventId: 'live-end-before' }).accepted).toBe(true);

    const disconnect = await h.quiz.app.inject({
      method: 'POST',
      url: `/api/sessions/${h.sessionId}/source`,
      headers: { authorization: 'Bearer test-admin-token-0123456789abcdef' },
      payload: { action: 'DISCONNECT' },
    });
    expect(disconnect.statusCode).toBe(200);
    expect(r.engine.state).toBe('CONNECTION_INTERRUPTED');
    h.scheduler.advance(60_000);
    expect(r.engine.state).toBe('CONNECTION_INTERRUPTED');
    expect(r.ingest({ source: 'MOCK', userId: 'live-end-late', displayName: 'Đến sau', text: 'B', eventId: 'live-end-after' })).toEqual({
      accepted: false,
      reason: 'NOT_ACCEPTING',
    });

    expect((await command(h, { type: 'STOP', reason: 'LIVE đã kết thúc giữa vòng' })).status).toBe(200);
    expect(r.engine.sessionStatus).toBe('CLOSED');
    const status = h.store.raw.prepare('SELECT status FROM rounds WHERE id = ?').get(roundId) as { status: string };
    expect(status.status).toBe('ABORTED');
    expect(h.store.raw.prepare('SELECT question_instance_id FROM answers WHERE source_event_id = ?').get('live-end-after')).toBeUndefined();
    expect(currentQuestionInstanceId(r.engine)).toBe(current);
  });

});
