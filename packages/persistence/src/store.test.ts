import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { QuestionSchema, SessionConfigSchema, type LeaderboardEntry, type QuestionSnapshot } from '@quiz/contracts';
import { computeRoundScores, createInitialState, createPrng, estimateStreamDelayMs, snapshotQuestion } from '@quiz/quiz-core';
import { DEMO_PACK, DEMO_QUESTIONS, makeSimPlayers } from '../../../fixtures';
import { Store } from './index';
import { testTempRoot } from '../../../tests/support/tempRoot';

const openStores: Store[] = [];
const tempDirs: string[] = [];

function tempDbPath(): string {
  const dir = testTempRoot('quiz-');
  tempDirs.push(dir);
  return join(dir, 'test.db');
}

function openStore(path = tempDbPath()): Store {
  const store = new Store(path);
  openStores.push(store);
  return store;
}

function addSession(store: Store, id = 'session-1', now = 100) {
  store.createSession({ id, name: `Phiên ${id}`, mode: 'MOCK', packId: DEMO_PACK.id, config: SessionConfigSchema.parse({}), now });
}

function snapshots(roundId: string, count = 2): QuestionSnapshot[] {
  return DEMO_QUESTIONS.slice(0, count).map((input, index) =>
    snapshotQuestion(QuestionSchema.parse(input), index, roundId, createPrng(index + 19)),
  );
}

function addRound(store: Store, sessionId = 'session-1', roundId = 'round-1', roundNumber = 1, count = 2) {
  store.createRound({
    id: roundId,
    sessionId,
    roundNumber,
    seed: 20261111 + roundNumber,
    selectionMode: 'RANDOM',
    snapshots: snapshots(roundId, count),
    now: 200 + roundNumber,
  });
}

function addAction(store: Store, input: Partial<Parameters<Store['recordAction']>[0]> & { commandId: string; now: number }) {
  store.recordAction({
    commandId: input.commandId,
    sessionId: input.sessionId ?? 'session-1',
    operatorId: input.operatorId ?? 'operator-demo',
    commandType: input.commandType ?? 'OPEN_LOBBY',
    reason: input.reason ?? null,
    expectedStateVersion: input.expectedStateVersion ?? 0,
    resultStateVersion: input.resultStateVersion ?? 1,
    accepted: input.accepted ?? true,
    resultJson: input.resultJson ?? '{"ok":true}',
    requestedAtMs: input.requestedAtMs ?? input.now,
    now: input.now,
  });
}

afterEach(() => {
  for (const store of openStores.splice(0).reverse()) store.close();
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

describe('Store: khởi tạo và câu hỏi', () => {
  it('chạy migration trên DB mới, bật WAL/foreign keys và mở lại cùng file', () => {
    const path = tempDbPath();
    const first = openStore(path);
    expect(first.raw.pragma('journal_mode', { simple: true })).toBe('wal');
    expect(first.raw.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(first.raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='live_sessions'").get()).toBeTruthy();
    expect(first.raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ranking_snapshots'").get()).toBeTruthy();
    expect(first.raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='achievement_awards'").get()).toBeTruthy();
    const scoreIndexes = first.raw.prepare('PRAGMA index_list(score_events)').all() as { name: string }[];
    expect(scoreIndexes.map((index) => index.name)).toContain('score_events_ledger_uq');
    expect(scoreIndexes.map((index) => index.name)).toContain('score_events_round_question_idx');
    first.close();
    const second = openStore(path);
    expect(second.raw.pragma('journal_mode', { simple: true })).toBe('wal');
    expect(second.raw.pragma('foreign_keys', { simple: true })).toBe(1);
  });

  it('lưu bền settings JSON và cung cấp tên subtopic cho bộ chọn câu', () => {
    const path = tempDbPath();
    const first = openStore(path);
    first.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, 100);
    first.setJsonSetting('round-selection-priority', {
      priorityTopicNames: ['FFA 2026', 'FFWS'], priorityShare: 0.6,
    }, 1234);
    expect(first.listSubtopics(DEMO_PACK.id)).toContainEqual(expect.objectContaining({ id: 'ff-che-do' }));
    first.close();

    const reopened = openStore(path);
    expect(reopened.getJsonSetting('round-selection-priority')).toEqual({
      priorityTopicNames: ['FFA 2026', 'FFWS'], priorityShare: 0.6,
    });
    expect(reopened.listSubtopics(DEMO_PACK.id).length).toBeGreaterThan(0);
  });

  it('ranking snapshots are idempotent on recovery, append revisions on changed results, and scrub safe names', () => {
    const store = openStore();
    addSession(store);
    store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, 100);
    addRound(store, 'session-1', 'ranking-round', 1, 1);
    const base = {
      roundId: 'ranking-round',
      scope: 'QUESTION' as const,
      scopeId: store.roundQuestions('ranking-round')[0]!.id,
      achievementId: 'FASTEST_CORRECT',
      metricKey: 'responseMs',
      entries: [{
        playerId: 'opaque-player', safeDisplayName: 'Safe Name', rank: 1,
        metricValue: 250, metricUnit: 'ms' as const, tied: false,
      }],
      totalQualified: 1,
      tiedOverflowCount: 0,
      finalizedAtMs: 500,
    };
    expect(store.saveRankingSnapshot(base)).toMatchObject({ revision: 1, finalizedAtMs: 500 });
    expect(store.saveRankingSnapshot({ ...base, finalizedAtMs: 900 })).toMatchObject({ revision: 1, finalizedAtMs: 500 });
    const changed = { ...base, entries: [{ ...base.entries[0]!, metricValue: 200 }], finalizedAtMs: 1_000 };
    expect(store.saveRankingSnapshot(changed)).toMatchObject({ revision: 2, finalizedAtMs: 1_000 });
    expect(store.rankingSnapshotsForRound('ranking-round', 'QUESTION', 'FASTEST_CORRECT')).toHaveLength(1);
    expect(store.raw.prepare('SELECT COUNT(*) AS n FROM ranking_snapshots').get()).toMatchObject({ n: 2 });

    store.scrubPlayerNameHistory('opaque-player', ['Safe Name'], 'Người chơi');
    const latest = store.latestRankingSnapshot('ranking-round', 'QUESTION', base.scopeId, 'FASTEST_CORRECT')!;
    expect(latest.entries[0]?.safeDisplayName).toBe('Người chơi');
    expect(latest.revision).toBe(2);
  });

  it('achievement awards dùng khóa người chơi idempotent; thay kết quả tăng revision và xóa người không còn đạt', () => {
    const path = tempDbPath();
    const store = openStore(path);
    addSession(store);
    store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, 100);
    addRound(store, 'session-1', 'award-round', 1, 1);
    const playerA = store.resolvePlayer('MOCK', 'award-a', 'Safe A', 300);
    const playerB = store.resolvePlayer('MOCK', 'award-b', 'Safe B', 301);
    const base = {
      roundId: 'award-round', scope: 'ROUND' as const, scopeId: 'award-round',
      achievementId: 'MOST_CORRECT', metricKey: 'correctCount',
      entries: [{ playerId: playerA, safeDisplayName: 'Safe A', rank: 1, metricValue: 5, metricUnit: 'questions' as const, tied: false }],
      totalQualified: 1, tiedOverflowCount: 0, finalizedAtMs: 500,
    };
    expect(store.saveAchievementSnapshot(base)).toMatchObject({ revision: 1 });
    expect(store.currentAchievementAwards('award-round', 'ROUND', 'award-round', 'MOST_CORRECT')).toMatchObject([
      { playerId: playerA, revision: 1, metricValue: 5, rank: 1 },
    ]);
    expect(store.saveAchievementSnapshot({ ...base, finalizedAtMs: 900 })).toMatchObject({ revision: 1, finalizedAtMs: 500 });
    expect(store.currentAchievementAwards('award-round', 'ROUND', 'award-round', 'MOST_CORRECT')).toHaveLength(1);

    const tie = { ...base, entries: [
      { ...base.entries[0]!, tied: true },
      { playerId: playerB, safeDisplayName: 'Safe B', rank: 1, metricValue: 5, metricUnit: 'questions' as const, tied: true },
    ], totalQualified: 2 };
    expect(store.saveAchievementSnapshot(tie)).toMatchObject({ revision: 2, totalQualified: 2 });
    expect(store.currentAchievementAwards('award-round', 'ROUND', 'award-round', 'MOST_CORRECT')).toHaveLength(2);

    const voided = { ...base, entries: [], totalQualified: 0, finalizedAtMs: 1_000 };
    expect(store.saveAchievementSnapshot(voided, [])).toMatchObject({ revision: 3, totalQualified: 0 });
    expect(store.currentAchievementAwards('award-round', 'ROUND', 'award-round', 'MOST_CORRECT')).toEqual([]);
    store.close();
    openStores.pop();
    const recovered = openStore(path);
    expect(recovered.latestRankingSnapshot('award-round', 'ROUND', 'award-round', 'MOST_CORRECT')).toMatchObject({ revision: 3 });
    expect(recovered.saveAchievementSnapshot({ ...voided, finalizedAtMs: 1_100 }, [])).toMatchObject({ revision: 3 });
    expect(recovered.currentAchievementAwards('award-round', 'ROUND', 'award-round', 'MOST_CORRECT')).toEqual([]);
  });

  it('reviewQuestion APPROVE/REJECT cập nhật trạng thái, lưu snapshot version và trả null nếu không tồn tại', () => {
    const store = openStore();
    store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, 100);
    const approveId = DEMO_QUESTIONS[0]!.id;
    const rejectId = DEMO_QUESTIONS[1]!.id;

    const approved = store.reviewQuestion(approveId, 'APPROVE', 'operator-a', 500);
    expect(approved).toMatchObject({
      id: approveId,
      approvalStatus: 'APPROVED',
      verificationStatus: 'OPERATOR_VERIFIED',
    });
    const rejected = store.reviewQuestion(rejectId, 'REJECT', 'operator-b', 600);
    expect(rejected).toMatchObject({
      id: rejectId,
      approvalStatus: 'REJECTED',
      verificationStatus: 'DEMO',
    });
    expect(store.reviewQuestion('missing-question', 'APPROVE', 'operator-a', 700)).toBeNull();

    const versions = store.raw
      .prepare('SELECT question_id AS questionId, version, snapshot_json AS snapshotJson, edited_by AS editedBy, created_at_ms AS createdAtMs FROM question_versions ORDER BY question_id')
      .all() as { questionId: string; version: number; snapshotJson: string; editedBy: string; createdAtMs: number }[];
    expect(versions).toHaveLength(2);
    expect(versions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        questionId: approveId,
        version: approved!.version,
        snapshotJson: JSON.stringify(approved),
        editedBy: 'APPROVE:operator-a',
        createdAtMs: 500,
      }),
      expect.objectContaining({
        questionId: rejectId,
        version: rejected!.version,
        snapshotJson: JSON.stringify(rejected),
        editedBy: 'REJECT:operator-b',
        createdAtMs: 600,
      }),
    ]));
  });

  it('seedQuestions trả số câu mới, gọi lại trả 0 và listQuestions round-trip qua QuestionSchema', () => {
    const store = openStore();
    expect(store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, 1234)).toBe(DEMO_QUESTIONS.length);
    expect(store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, 5678)).toBe(0);
    const loaded = store.listQuestions(DEMO_PACK.id);
    expect(loaded).toHaveLength(DEMO_QUESTIONS.length);
    expect(loaded.map((question) => QuestionSchema.parse(question))).toEqual(
      DEMO_QUESTIONS.map((question) => QuestionSchema.parse(question)),
    );
  });
});

describe('Store: phiên và vòng', () => {
  it('create/get/latestOpen/close/heartbeat quản lý phiên', () => {
    const store = openStore();
    addSession(store, 'older', 100);
    addSession(store, 'newer', 200);
    expect(store.getSession('newer')).toMatchObject({ id: 'newer', status: 'OPEN', lastHeartbeatMs: 200, createdAtMs: 200 });
    expect(store.latestOpenSession()?.id).toBe('newer');
    store.heartbeat('newer', 250);
    expect(store.getSession('newer')?.lastHeartbeatMs).toBe(250);
    store.closeSession('newer', 300);
    expect(store.getSession('newer')).toMatchObject({ status: 'CLOSED', closedAtMs: 300 });
    expect(store.latestOpenSession()?.id).toBe('older');
  });

  it('lưu snapshot câu hỏi, usedQuestionIdsInSession và nextRoundNumber', () => {
    const store = openStore();
    addSession(store);
    store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, 100);
    const first = snapshots('round-1', 2);
    store.createRound({ id: 'round-1', sessionId: 'session-1', roundNumber: 1, seed: 10, selectionMode: 'RANDOM', snapshots: first, now: 200 });
    expect(store.roundQuestions('round-1').map((row) => row.snapshot)).toEqual(first);
    expect(store.usedQuestionIdsInSession('session-1')).toEqual(new Set(first.map((snapshot) => snapshot.questionId)));
    expect(store.nextRoundNumber('session-1')).toBe(2);
    store.createRound({ id: 'round-2', sessionId: 'session-1', roundNumber: 2, seed: 11, selectionMode: 'RANDOM', snapshots: snapshots('round-2', 1), now: 300 });
    expect(store.nextRoundNumber('session-1')).toBe(3);
  });

  it('giữ stream delay đã chốt của câu qua khôi phục DB và regrade cho cùng điểm', () => {
    const path = tempDbPath();
    const store = openStore(path);
    addSession(store);
    store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, 100);
    addRound(store, 'session-1', 'delay-round', 1, 1);
    const question = store.roundQuestions('delay-round')[0]!;
    const playerId = store.resolvePlayer('MOCK', 'delay-player', 'Người chơi', 1_000);
    store.markQuestion(question.id, 'OPEN', 1_000, false, 2_000);
    expect(store.insertAnswer({
      questionInstanceId: question.id, roundId: 'delay-round', playerId,
      option: question.snapshot.correctOptionId, receivedAtMs: 1_500, sourceEventId: 'delay-answer',
    })).toBe(true);
    store.markQuestion(question.id, 'CLOSED', 2_000);

    const score = (source: Store) => {
      const row = source.roundQuestions('delay-round')[0]!;
      const questions = [{
        questionInstanceId: row.id, index: row.position + 1, correctOptionId: row.snapshot.correctOptionId,
        closed: row.status === 'CLOSED', voided: row.status === 'VOIDED', openedAtMs: row.openedAtMs,
        windowMs: 10_000, streamDelayMs: row.streamDelayMs,
      }];
      const answers = source.answersForRound('delay-round').map((answer) => ({
        questionInstanceId: answer.questionInstanceId, playerId: answer.playerId,
        option: answer.option, receivedAtMs: answer.receivedAtMs,
      }));
      return computeRoundScores(questions, answers, { mode: 'KAHOOT' });
    };
    const before = score(store);
    expect(before.ledger.find((entry) => entry.reason === 'SPEED')?.points).toBe(500);

    const index = openStores.indexOf(store);
    if (index >= 0) openStores.splice(index, 1);
    store.close();
    const restored = openStore(path);
    expect(restored.roundQuestions('delay-round')[0]?.streamDelayMs).toBe(2_000);
    expect(score(restored)).toEqual(before);
  });

  it('lấy tối đa năm câu đúng gần nhất, bỏ câu không có đáp án đúng', () => {
    const store = openStore();
    addSession(store);
    store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, 100);
    addRound(store, 'session-1', 'delay-samples', 1, 7);
    const questions = store.roundQuestions('delay-samples');
    const playerId = store.resolvePlayer('MOCK', 'delay-sampler', 'Người chơi', 1_000);
    const rawElapsed = [1_000, 2_000, 3_000, 6_000, 8_000, 10_000];
    questions.forEach((question, index) => {
      const openedAtMs = 10_000 + index * 20_000;
      store.markQuestion(question.id, 'OPEN', openedAtMs, false, 2_000);
      if (index < rawElapsed.length) {
        expect(store.insertAnswer({
          questionInstanceId: question.id, roundId: 'delay-samples', playerId,
          option: question.snapshot.correctOptionId, receivedAtMs: openedAtMs + rawElapsed[index]!,
          sourceEventId: `delay-sample-${index}`,
        })).toBe(true);
      }
      store.markQuestion(question.id, 'CLOSED', openedAtMs + 15_000);
    });
    const recent = store.recentCorrectAnswerElapsedMs('session-1');
    expect(recent).toEqual([10_000, 8_000, 6_000, 3_000, 2_000]);
    expect(estimateStreamDelayMs(recent)).toBe(2_000);
    expect(store.correctAnswerElapsedMsForQuestion(questions[5]!.id)).toBe(10_000);
    expect(store.correctAnswerElapsedMsForQuestion(questions[6]!.id)).toBeNull();
  });

});

describe('Store: người chơi và đáp án', () => {
  it('resolvePlayer giữ id theo (source, userId), nhưng tách nguồn khác nhau', () => {
    const store = openStore();
    const [player] = makeSimPlayers(1, 4);
    expect(player).toBeDefined();
    const mock = store.resolvePlayer('MOCK', player!.userId, player!.displayName, 10);
    expect(store.resolvePlayer('MOCK', player!.userId, 'Tên hiển thị mới', 20)).toBe(mock);
    expect(store.resolvePlayer('TIKTOK', player!.userId, player!.displayName, 30)).not.toBe(mock);
    expect(store.raw.prepare('SELECT COUNT(*) AS n FROM players').get()).toMatchObject({ n: 2 });
  });

  it('insertAnswer chỉ nhận đáp án đầu, đếm người tham gia và phân bố A/B/C/D', () => {
    const store = openStore();
    addSession(store);
    store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, 100);
    addRound(store, 'session-1', 'round-1', 1, 2);
    const [one, two] = makeSimPlayers(2, 9);
    const p1 = store.resolvePlayer('MOCK', one!.userId, one!.displayName, 300);
    const p2 = store.resolvePlayer('MOCK', two!.userId, two!.displayName, 301);
    expect(store.insertAnswer({ questionInstanceId: 'round-1:q01', roundId: 'round-1', playerId: p1, option: 'A', receivedAtMs: 400, sourceEventId: 'evt-1' })).toBe(true);
    expect(store.insertAnswer({ questionInstanceId: 'round-1:q01', roundId: 'round-1', playerId: p1, option: 'B', receivedAtMs: 401, sourceEventId: 'evt-2' })).toBe(false);
    expect(store.insertAnswer({ questionInstanceId: 'round-1:q01', roundId: 'round-1', playerId: p2, option: 'C', receivedAtMs: 402, sourceEventId: null })).toBe(true);
    // receivedAtMs có thêm từ khi có thưởng tốc độ (11/11)
    expect(store.answersForRound('round-1')).toMatchObject([
      { questionInstanceId: 'round-1:q01', playerId: p1, option: 'A' },
      { questionInstanceId: 'round-1:q01', playerId: p2, option: 'C' },
    ]);
    expect(store.answersForRound('round-1').every((a) => Number.isFinite(a.receivedAtMs))).toBe(true);
    expect(store.participantCount('round-1')).toBe(2);
    expect(store.optionCounts('round-1:q01')).toEqual({ A: 1, B: 0, C: 1, D: 0 });
  });
});

describe('Store: sổ điểm và snapshot', () => {
  it('ghi ledger idempotent, void tạo reversal âm và giữ nguyên dòng ban đầu', () => {
    const store = openStore();
    addSession(store);
    store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, 100);
    addRound(store, 'session-1', 'round-1', 1, 1);
    const playerId = store.resolvePlayer('MOCK', 'sim-ledger', 'Người chơi DEMO', 300);
    const entries = [
      { questionInstanceId: 'round-1:q01', playerId, reason: 'CORRECT' as const, points: 100 },
      { questionInstanceId: 'round-1:q01', playerId, reason: 'STREAK_3' as const, points: 30 },
    ];
    expect(store.insertLedger('round-1', entries, 400)).toBe(2);
    expect(store.insertLedger('round-1', entries, 401)).toBe(0);
    expect(store.ledgerTotals('round-1').get(playerId)).toBe(130);
    expect(store.insertVoidReversals('round-1', 'round-1:q01', 500)).toBe(2);
    expect(store.insertVoidReversals('round-1', 'round-1:q01', 501)).toBe(0);
    expect(store.ledgerTotals('round-1').get(playerId)).toBe(0);
    expect(store.ledgerRows('round-1')).toEqual([
      { questionInstanceId: 'round-1:q01', playerId, reason: 'CORRECT', points: 100 },
      { questionInstanceId: 'round-1:q01', playerId, reason: 'STREAK_3', points: 30 },
      { questionInstanceId: 'round-1:q01', playerId, reason: 'VOID_REVERSAL:CORRECT', points: -100 },
      { questionInstanceId: 'round-1:q01', playerId, reason: 'VOID_REVERSAL:STREAK_3', points: -30 },
    ]);
  });

  it('latestGameSnapshot lấy version lớn nhất và cùng version có thể được cập nhật', () => {
    const store = openStore();
    addSession(store);
    const base = createInitialState({ sessionId: 'session-1', mode: 'MOCK', timings: SessionConfigSchema.parse({}).timings, leaderboardInterval: 5, speedMultiplier: 1 });
    store.saveGameSnapshot({ ...base, stateVersion: 1, state: 'LOBBY' }, 'LOBBY', 1000, 100);
    store.saveGameSnapshot({ ...base, stateVersion: 3, state: 'ACCEPTING' }, 'QUESTION', 5000, 200);
    store.saveGameSnapshot({ ...base, stateVersion: 3, state: 'PAUSED' }, 'QUESTION', 3000, 300);
    expect(store.latestGameSnapshot('session-1')).toMatchObject({ stateVersion: 3, state: 'PAUSED' });
    expect(store.getSession('session-1')?.stateVersion).toBe(3);
  });
});

describe('Store: audit, outbox và rollback', () => {
  it('recordAction/findAction lưu kết quả và từ chối commandId trùng UNIQUE', () => {
    const store = openStore();
    addSession(store);
    const action = { commandId: 'command-0001', now: 300, commandType: 'OPEN_LOBBY', resultJson: '{"ok":true,"stateVersion":1}' };
    addAction(store, action);
    expect(store.findAction('command-0001')).toEqual({ resultJson: action.resultJson });
    expect(() => addAction(store, action)).toThrow(/UNIQUE/i);
  });

  it('outbox trả sự kiện chưa publish rồi rỗng sau markPublished', () => {
    const store = openStore();
    addSession(store);
    store.addOutbox('session-1', 1, 'STATE_CHANGED', { state: 'LOBBY' }, 400);
    const unpublished = store.takeUnpublished('session-1');
    expect(unpublished).toHaveLength(1);
    expect(unpublished[0]).toMatchObject({ stateVersion: 1, type: 'STATE_CHANGED', payload: { state: 'LOBBY' } });
    store.markPublished(unpublished.map((event) => event.id), 500);
    expect(store.takeUnpublished('session-1')).toEqual([]);
  });

  it('transaction rollback xóa toàn bộ ghi dang dở', () => {
    const store = openStore();
    expect(() => store.transaction(() => {
      store.raw.prepare("INSERT INTO theme_packs (id, name, schema_version, pack_version, manifest_json) VALUES ('rollback-pack', 'DEMO', 1, '1.0.0', '{}')").run();
      throw new Error('lỗi giả lập');
    })).toThrow('lỗi giả lập');
    expect(store.raw.prepare("SELECT id FROM theme_packs WHERE id = 'rollback-pack'").get()).toBeUndefined();
  });

  it('backup mở được như SQLite DB và giữ nguyên số câu hỏi', async () => {
    const store = openStore();
    store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, 100);
    const backupPath = join(store.path.replace(/[\\/][^\\/]+$/, ''), 'backup.db');
    await store.backup(backupPath);
    expect(existsSync(backupPath)).toBe(true);
    const backup = openStore(backupPath);
    expect(backup.listQuestions(DEMO_PACK.id)).toHaveLength(DEMO_QUESTIONS.length);
  });

  it('history sắp xếp rounds/actions và trả finalTop10 theo round', () => {
    const store = openStore();
    addSession(store);
    store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, 100);
    addRound(store, 'session-1', 'round-1', 1, 1);
    store.setRoundStatus('round-1', 'RUNNING', 210);
    store.setRoundStatus('round-1', 'COMPLETED', 220);
    addRound(store, 'session-1', 'round-2', 2, 1);
    store.setRoundStatus('round-2', 'RUNNING', 310);
    addAction(store, { commandId: 'command-later', now: 500 });
    addAction(store, { commandId: 'command-earlier', now: 400 });
    const entry: LeaderboardEntry = { rank: 1, tied: false, playerId: 'MOCK:player-1', displayName: 'Người chơi DEMO', score: 100, correctCount: 1 };
    store.saveLeaderboardSnapshot({ roundId: 'round-1', questionInstanceId: null, kind: 'FINAL', entries: [entry], participantCount: 1, now: 600 });
    expect(store.history('session-1')).toEqual({
      rounds: [
        { id: 'round-1', roundNumber: 1, seed: 20261112, questionCount: 1, status: 'COMPLETED', startedAtMs: 210, endedAtMs: 220, finalTop10: [entry], participantCount: 1 },
        { id: 'round-2', roundNumber: 2, seed: 20261113, questionCount: 1, status: 'RUNNING', startedAtMs: 310, endedAtMs: null, finalTop10: null, participantCount: null },
      ],
      actions: [
        expect.objectContaining({ commandId: 'command-earlier', createdAtMs: 400 }),
        expect.objectContaining({ commandId: 'command-later', createdAtMs: 500 }),
      ],
    });
  });

  it('không có tên cột nhạy cảm trong bất kỳ bảng nào', () => {
    const store = openStore();
    const tables = store.raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
    expect(tables.length).toBeGreaterThan(0);
    const columns = tables.flatMap(({ name }) =>
      (store.raw.prepare(`PRAGMA table_info("${name.replaceAll('"', '""')}")`).all() as { name: string }[]).map((column) => `${name}.${column.name}`),
    );
    expect(columns.filter((name) => /email|phone|birth|dob|password|address/i.test(name))).toEqual([]);
  });
});
