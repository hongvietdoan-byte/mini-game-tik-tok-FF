import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decideComment, parseAnswer } from '@quiz/quiz-core';
import type { ConnectionStatus, RawComment } from '@quiz/contracts';
import { ManualScheduler } from './scheduler';
import { TikTokLiveAdapter, type TikTokConnectionLike } from './tiktok';

type NormalizationReplay = {
  normalizationCases: {
    name: string;
    payload: Record<string, any>;
    expectedOption: 'A' | 'B' | 'C' | 'D' | null;
    expectedCreateTimeMs?: number;
    expectedEventId?: string | null;
  }[];
  clockSkewReplay: {
    firstSourceLagMs: number;
    gapMs: number;
    laterSourceLagMs: number;
    expectedNormalizedLagMs: number;
  };
};
type RoundReplay = {
  primaryPlayer: { userId: string; nicknames: string[] };
  duplicateMessage: { userId: string; nickname: string; text: string };
  roundComments: { eventId: string; text: string }[];
};

const replay = JSON.parse(readFileSync(
  new URL('../../../fixtures/replay/tiktok-comments-normalization.json', import.meta.url),
  'utf8',
)) as NormalizationReplay;
const roundReplay = JSON.parse(readFileSync(
  new URL('../../../fixtures/replay/tiktok-comments-round.json', import.meta.url),
  'utf8',
)) as RoundReplay;

class ReplayConnection implements TikTokConnectionLike {
  handlers = new Map<string, ((data: any) => void)[]>();
  connects = 0;
  disconnects = 0;
  failWith: Error | null = null;

  async connect() {
    this.connects += 1;
    if (this.failWith) throw this.failWith;
    return { roomId: 'fixture-room' };
  }

  async disconnect() {
    this.disconnects += 1;
  }

  on(event: string, callback: (data: any) => void) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), callback]);
  }

  removeAllListeners() {
    this.handlers.clear();
  }

  emit(event: string, data: any = {}) {
    for (const callback of this.handlers.get(event) ?? []) callback(data);
  }
}

class UserOfflineError extends Error {}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(connections: ReplayConnection[], startMs = 1_800_000_000_000) {
  const scheduler = new ManualScheduler(startMs);
  let index = 0;
  const adapter = new TikTokLiveAdapter({
    username: '@synthetic_live',
    scheduler,
    createConnection: () => connections[Math.min(index++, connections.length - 1)]!,
    reconnect: { baseMs: 1_000, maxMs: 4_000, maxAttempts: 4 },
  });
  const comments: RawComment[] = [];
  const statuses: ConnectionStatus[] = [];
  adapter.onComment((comment) => comments.push(comment));
  adapter.onStatus((status) => statuses.push(status));
  return { adapter, scheduler, comments, statuses };
}

describe('TikTok connector replay', () => {
  it('ánh xạ payload proto/cũ và parse đúng luật chính xác hiện hành', async () => {
    const connection = new ReplayConnection();
    const { adapter, scheduler, comments } = setup([connection]);
    await adapter.connect();

    for (const sample of replay.normalizationCases) {
      const countBefore = comments.length;
      connection.emit('chat', sample.payload);
      expect(comments).toHaveLength(countBefore + 1);
      const comment = comments.at(-1)!;
      const user = sample.payload.user;
      expect(comment).toMatchObject({
        source: 'TIKTOK',
        userId: String(user.id ?? user.userId),
        displayName: String(user.nickname || user.uniqueId || user.displayId || 'Khán giả'),
        text: String(sample.payload.content ?? sample.payload.comment),
        sourceTimestampMs: scheduler.now(),
      });
      expect(parseAnswer(comment.text), sample.name).toBe(sample.expectedOption);

      const expectedEventId = sample.expectedEventId === null
        ? undefined
        : String(sample.payload.common?.msgId ?? sample.payload.msgId);
      expect(comment.eventId).toBe(expectedEventId);
      if (sample.expectedCreateTimeMs !== undefined)
        expect(sample.payload.createTime * 1000).toBe(sample.expectedCreateTimeMs);
    }
  });

  it('giữ user.id ổn định qua lần đổi nickname và chuyển nguyên msgId trùng cho runtime dedupe', async () => {
    const connection = new ReplayConnection();
    const { adapter, scheduler, comments } = setup([connection]);
    await adapter.connect();

    const first = roundReplay.roundComments[0]!;
    const duplicate = roundReplay.duplicateMessage;
    const names = roundReplay.primaryPlayer.nicknames;
    connection.emit('chat', {
      common: { msgId: first.eventId, createTime: String(scheduler.now()) },
      user: { id: roundReplay.primaryPlayer.userId, nickname: names[0] },
      content: 'A',
    });
    connection.emit('chat', {
      common: { msgId: first.eventId, createTime: String(scheduler.now()) },
      user: { id: duplicate.userId, nickname: duplicate.nickname },
      content: duplicate.text.replace('{correct}', 'B'),
    });
    connection.emit('chat', {
      common: { msgId: roundReplay.roundComments[1]!.eventId, createTime: String(scheduler.now()) },
      user: { id: roundReplay.primaryPlayer.userId, nickname: names[1] },
      content: 'B',
    });

    expect(comments.map((comment) => comment.userId)).toEqual([
      roundReplay.primaryPlayer.userId,
      duplicate.userId,
      roundReplay.primaryPlayer.userId,
    ]);
    expect(comments.map((comment) => comment.displayName)).toEqual([names[0], duplicate.nickname, names[1]]);
    expect(comments.map((comment) => comment.eventId)).toEqual([first.eventId, first.eventId, roundReplay.roundComments[1]!.eventId]);
  });

  it('chuẩn hoá lệch đồng hồ connector và cách ly comment đệm quá ngưỡng', async () => {
    const connection = new ReplayConnection();
    const { adapter, scheduler, comments } = setup([connection]);
    await adapter.connect();
    const openedAtMs = scheduler.now();

    const firstLag = replay.clockSkewReplay.firstSourceLagMs;
    connection.emit('chat', {
      common: { msgId: 'replay-clock-anchor', createTime: String(scheduler.now() - firstLag) },
      user: { id: 'demo-clock-301', nickname: 'Mây Lặng' },
      content: 'A',
    });
    expect(comments.at(-1)!.sourceTimestampMs).toBe(openedAtMs);

    scheduler.advance(replay.clockSkewReplay.gapMs);
    const laterLag = replay.clockSkewReplay.laterSourceLagMs;
    connection.emit('chat', {
      common: { msgId: 'replay-clock-buffered', createTime: String(scheduler.now() - laterLag) },
      user: { id: 'demo-clock-302', nickname: 'Nắng Nhạt' },
      content: 'B',
    });
    const lateComment = comments.at(-1)!;
    const normalizedLagMs = scheduler.now() - lateComment.sourceTimestampMs!;
    expect(normalizedLagMs).toBe(replay.clockSkewReplay.expectedNormalizedLagMs);
    expect(decideComment({
      text: lateComment.text,
      receivedAtMs: scheduler.now(),
      sourceTimestampMs: lateComment.sourceTimestampMs,
    }, { accepting: true, openAtMs: openedAtMs, deadlineMs: openedAtMs + 30_000 }, { maxSourceLagMs: 5_000 }))
      .toEqual({ ok: false, reason: 'STALE_SOURCE_TIMESTAMP' });
  });

  it('thử lại theo backoff, giữ trạng thái CONNECTED khi lần retry sau thành công', async () => {
    const first = new ReplayConnection();
    const failedRetry = new ReplayConnection();
    failedRetry.failWith = new Error('ECONNRESET');
    const successfulRetry = new ReplayConnection();
    const { adapter, scheduler, comments, statuses } = setup([first, failedRetry, successfulRetry]);

    await adapter.connect();
    first.emit('disconnected', { reason: 'mạng chập chờn' });
    expect(adapter.status()).toBe('RECONNECTING');
    scheduler.advance(999);
    expect(failedRetry.connects).toBe(0);
    scheduler.advance(1);
    await flush();
    expect(failedRetry.connects).toBe(1);
    expect(adapter.status()).toBe('RECONNECTING');

    scheduler.advance(1_999);
    expect(successfulRetry.connects).toBe(0);
    scheduler.advance(1);
    await flush();
    expect(successfulRetry.connects).toBe(1);
    expect(adapter.status()).toBe('CONNECTED');

    successfulRetry.emit('chat', {
      common: { msgId: 'replay-after-backoff', createTime: String(scheduler.now()) },
      user: { id: 'demo-reconnect-401', nickname: 'Gió Mát' },
      content: 'C',
    });
    expect(comments.map((comment) => comment.eventId)).toEqual(['replay-after-backoff']);
    expect(statuses).toEqual(['CONNECTING', 'CONNECTED', 'RECONNECTING', 'CONNECTED']);
  });

  it('UserOfflineError tạo trạng thái DISCONNECTED, không lên lịch retry và không crash', async () => {
    const connection = new ReplayConnection();
    connection.failWith = new UserOfflineError('User is offline');
    const { adapter, scheduler } = setup([connection]);

    await expect(adapter.connect()).rejects.toThrow(/chưa phát LIVE/);
    expect(adapter.status()).toBe('DISCONNECTED');
    expect(adapter.describe()).toContain('chưa phát LIVE');
    expect(scheduler.pending).toBe(0);
    scheduler.advance(120_000);
    expect(connection.connects).toBe(1);
  });

  it('Failed to retrieve Room ID được phân loại offline và không tự retry', async () => {
    const connection = new ReplayConnection();
    connection.failWith = new Error('Failed to retrieve Room ID');
    const { adapter, scheduler } = setup([connection]);

    await adapter.connect().catch(() => undefined);
    expect(adapter.status()).toBe('DISCONNECTED');
    expect(adapter.describe()).toContain('chưa phát LIVE');
    expect(scheduler.pending).toBe(0);
  });
});
