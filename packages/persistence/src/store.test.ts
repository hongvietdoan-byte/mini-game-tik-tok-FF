import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { QuestionSchema, SessionConfigSchema, type LeaderboardEntry, type QuestionSnapshot } from '@quiz/contracts';
import { createInitialState, createPrng, snapshotQuestion } from '@quiz/quiz-core';
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
    first.close();
    const second = openStore(path);
    expect(second.raw.pragma('journal_mode', { simple: true })).toBe('wal');
    expect(second.raw.pragma('foreign_keys', { simple: true })).toBe(1);
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
