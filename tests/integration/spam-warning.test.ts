import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_TIMINGS } from '@quiz/contracts';
import { boot, command, createSession, rt, runUntil, type Harness } from './helpers';

const open: Harness[] = [];
afterEach(async () => {
  for (const h of open.splice(0)) {
    await h.quiz.close().catch(() => {});
    h.store.close();
  }
});

async function acceptingSession(config: Parameters<typeof createSession>[1] = {}) {
  const h = await createSession(await boot({}), config);
  open.push(h);
  expect((await command(h, { type: 'OPEN_LOBBY' })).status).toBe(200);
  expect((await command(h, { type: 'START_ROUND' })).status).toBe(200);
  runUntil(h, () => rt(h).engine.state === 'ACCEPTING');
  return h;
}

function answer(h: Harness, userId: string, displayName: string, text: string, eventId: string) {
  return rt(h).ingest({ source: 'MOCK', userId, displayName, text, eventId });
}

describe('cảnh báo spam đáp án', () => {
  it('cảnh báo từ 5 đáp án bị từ chối trong cửa sổ mặc định và chỉ gửi dữ liệu an toàn cho admin', async () => {
    const h = await acceptingSession();
    const runtime = rt(h);
    const userId = 'private-tiktok-user-0234';
    const correct = runtime.adminSnapshot().current!.correctOptionId;

    expect(answer(h, userId, 'd1t User', correct, 'spam-first')).toEqual({ accepted: true });
    for (let i = 0; i < 5; i += 1)
      expect(answer(h, userId, 'd1t User', correct, `spam-duplicate-${i}`)).toEqual({ accepted: false, reason: 'DUPLICATE_ANSWER' });

    const warning = runtime.adminSnapshot().spamWarnings![0]!;
    expect(warning).toMatchObject({
      playerId: h.store.findPlayerId('MOCK', userId),
      safeDisplayName: 'Người chơi 1',
      count: 5,
      primaryReason: 'DUPLICATE_ANSWER',
      lastAtMs: h.scheduler.now(),
    });
    expect(warning.playerId).not.toBe(userId);
    expect(runtime.publicSnapshot()).not.toHaveProperty('spamWarnings');
    expect(JSON.stringify(runtime.publicSnapshot())).not.toContain(userId);
    expect(runtime.metrics.accepted).toBe(1);
    expect(runtime.metrics.rejected.DUPLICATE_ANSWER).toBe(5);
    expect(runtime.adminSnapshot().config).toMatchObject({ spamWarningThreshold: 5, spamWarningWindowMs: 30_000 });
  });

  it('bốn lần chưa cảnh báo, chat thường không được tính', async () => {
    const h = await acceptingSession();
    const runtime = rt(h);
    const correct = runtime.adminSnapshot().current!.correctOptionId;
    expect(answer(h, 'four-user', 'Ngọc', correct, 'four-first')).toEqual({ accepted: true });
    for (let i = 0; i < 4; i += 1)
      expect(answer(h, 'four-user', 'Ngọc', correct, `four-duplicate-${i}`)).toEqual({ accepted: false, reason: 'DUPLICATE_ANSWER' });
    for (let i = 0; i < 10; i += 1)
      expect(answer(h, 'chat-user', 'Người xem', 'xin chào', `chat-${i}`)).toEqual({ accepted: false, reason: 'NOT_AN_ANSWER' });

    expect(runtime.adminSnapshot().spamWarnings).toEqual([]);
  });

  it('đếm đáp án hợp cú pháp khi chưa nhận đáp án, không tạo player hay ghi thêm DB', async () => {
    const h = await createSession(await boot({}), { spamWarningThreshold: 3, spamWarningWindowMs: 5_000 });
    open.push(h);
    const runtime = rt(h);
    const userId = 'never-accepted-raw-id';
    const before = (h.store.raw.prepare('SELECT COUNT(*) AS n FROM players').get() as { n: number }).n;

    for (let i = 0; i < 3; i += 1)
      expect(answer(h, userId, 'd1t Viewer', 'A', `not-accepting-${i}`)).toEqual({ accepted: false, reason: 'NOT_ACCEPTING' });

    expect(runtime.adminSnapshot().spamWarnings!).toMatchObject([{
      safeDisplayName: 'Người chơi',
      count: 3,
      primaryReason: 'NOT_ACCEPTING',
    }]);
    expect(runtime.adminSnapshot().spamWarnings![0]!.playerId).not.toBe(userId);
    expect((h.store.raw.prepare('SELECT COUNT(*) AS n FROM players').get() as { n: number }).n).toBe(before);
  });

  it('giới hạn danh sách còn 20 cảnh báo mới nhất, kể cả khi timestamp trùng nhau', async () => {
    const h = await createSession(await boot({}), { spamWarningThreshold: 1 });
    open.push(h);
    const runtime = rt(h);
    for (let i = 1; i <= 22; i += 1)
      answer(h, `cap-user-${i}`, `Viewer ${i}`, 'A', `cap-event-${i}`);

    const warnings = runtime.adminSnapshot().spamWarnings!;
    expect(warnings).toHaveLength(20);
    expect(warnings[0]!.safeDisplayName).toBe('Viewer 22');
    expect(warnings.at(-1)!.safeDisplayName).toBe('Viewer 3');
  });

  it('xóa các lần cũ khi hết cửa sổ trượt', async () => {
    const h = await acceptingSession({
      spamWarningWindowMs: 1_000,
      timings: { ...DEFAULT_TIMINGS, answerMs: 10_000 },
    });
    const runtime = rt(h);
    const correct = runtime.adminSnapshot().current!.correctOptionId;
    expect(answer(h, 'expires-user', 'Khán giả', correct, 'expires-first')).toEqual({ accepted: true });
    for (let i = 0; i < 5; i += 1) answer(h, 'expires-user', 'Khán giả', correct, `expires-duplicate-${i}`);
    expect(runtime.adminSnapshot().spamWarnings).toHaveLength(1);
    const warningCounts: number[] = [];
    runtime.subscribe((batch) => {
      for (const item of batch)
        if (item.audience === 'admin' && item.message.type === 'ADMIN_SNAPSHOT')
          warningCounts.push(item.message.payload.spamWarnings?.length ?? -1);
    });

    h.scheduler.advance(1_001);
    expect(runtime.adminSnapshot().spamWarnings).toEqual([]);
    h.scheduler.advance(250);
    expect(warningCounts.at(-1)).toBe(0);
  });

  it('giữ bộ đếm qua các câu hỏi trong cùng phiên', async () => {
    const h = await acceptingSession({
      timings: { ...DEFAULT_TIMINGS, prepareMs: 500, answerMs: 3_000, revealMs: 500, leaderboardMs: 500 },
    });
    const runtime = rt(h);
    const userId = 'same-session-user';
    let correct = runtime.adminSnapshot().current!.correctOptionId;
    expect(answer(h, userId, 'Khán giả', correct, 'q1-first')).toEqual({ accepted: true });
    for (let i = 0; i < 3; i += 1) answer(h, userId, 'Khán giả', correct, `q1-duplicate-${i}`);

    runUntil(h, () => runtime.engine.state === 'REVEAL');
    runUntil(h, () => runtime.engine.state === 'ACCEPTING');
    correct = runtime.adminSnapshot().current!.correctOptionId;
    expect(answer(h, userId, 'Khán giả', correct, 'q2-first')).toEqual({ accepted: true });
    for (let i = 0; i < 2; i += 1) answer(h, userId, 'Khán giả', correct, `q2-duplicate-${i}`);

    expect(runtime.adminSnapshot().spamWarnings!).toMatchObject([{ count: 5, primaryReason: 'DUPLICATE_ANSWER' }]);
  });
});
