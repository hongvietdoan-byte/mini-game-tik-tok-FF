import { describe, expect, it } from 'vitest';
import type { ConnectionStatus, RawComment } from '@quiz/contracts';
import { ManualScheduler } from './scheduler';
import { TikTokLiveAdapter, mapTikTokChat, normalizeTikTokUsername, type TikTokConnectionLike } from './tiktok';

class FakeConn implements TikTokConnectionLike {
  handlers = new Map<string, ((d: any) => void)[]>();
  connects = 0;
  disconnects = 0;
  failWith: Error | null = null;
  async connect() {
    this.connects += 1;
    if (this.failWith) throw this.failWith;
    return { roomId: '1' };
  }
  async disconnect() {
    this.disconnects += 1;
  }
  on(ev: string, cb: (d: any) => void) {
    this.handlers.set(ev, [...(this.handlers.get(ev) ?? []), cb]);
  }
  removeAllListeners() {
    this.handlers.clear();
  }
  emit(ev: string, d: any = {}) {
    for (const cb of this.handlers.get(ev) ?? []) cb(d);
  }
}
class UserOfflineError extends Error {}
const flush = () => new Promise((r) => setTimeout(r, 0));

function setup(conns: FakeConn[]) {
  const scheduler = new ManualScheduler(1_800_000_000_000);
  let i = 0;
  const adapter = new TikTokLiveAdapter({
    username: '@shop_ff',
    scheduler,
    createConnection: () => conns[Math.min(i++, conns.length - 1)]!,
    reconnect: { baseMs: 1_000, maxMs: 8_000, maxAttempts: 4 },
  });
  const comments: RawComment[] = [];
  const statuses: ConnectionStatus[] = [];
  adapter.onComment((c) => comments.push(c));
  adapter.onStatus((s) => statuses.push(s));
  return { adapter, scheduler, comments, statuses };
}

const chat = (over: any = {}) => ({
  common: { msgId: 'm1', createTime: '1800000000000' },
  user: { id: '7123', nickname: 'Rồng Lửa', uniqueId: 'rong_lua' },
  content: 'A',
  ...over,
});

describe('TikTokLiveAdapter (không chính thức, chỉ đọc)', () => {
  it('chuẩn hoá username từ @ / URL', () => {
    expect(normalizeTikTokUsername('@abc')).toBe('abc');
    expect(normalizeTikTokUsername('https://www.tiktok.com/@abc.def/live?x=1')).toBe('abc.def');
    expect(() => new TikTokLiveAdapter({ username: '  ', scheduler: new ManualScheduler() })).toThrow();
  });

  it('ánh xạ chat proto v3 và dạng cũ; bỏ sự kiện không có mã người dùng ổn định', () => {
    expect(mapTikTokChat(chat())).toEqual({ userId: '7123', displayName: 'Rồng Lửa', text: 'A', eventId: 'm1', createTimeMs: 1_800_000_000_000 });
    expect(mapTikTokChat({ user: { userId: '9', uniqueId: 'x' }, comment: 'b', msgId: 'q', createTime: 1_800_000_000 })).toEqual({
      userId: '9',
      displayName: '',
      text: 'b',
      eventId: 'q',
      createTimeMs: 1_800_000_000_000,
    });
    expect(mapTikTokChat({ user: { id: '10', nickname: '   ', uniqueId: 'public_handle' }, content: 'A' })?.displayName).toBe('');
    expect(mapTikTokChat({ user: { nickname: 'không id' }, content: 'A' })).toBeNull();
    expect(mapTikTokChat({ user: { id: '0' }, content: 'A' })).toBeNull();
  });

  it('kết nối → CONNECTED, phát comment với source TIKTOK và sourceTimestamp quy về giờ máy', async () => {
    const c = new FakeConn();
    const { adapter, scheduler, comments, statuses } = setup([c]);
    await adapter.connect();
    expect(statuses).toEqual(['CONNECTING', 'CONNECTED']);
    // đồng hồ TikTok chậm hơn máy 3 s: lần đầu lấy làm mốc lệch → sourceTimestamp = giờ nhận
    c.emit('chat', chat({ common: { msgId: 'm1', createTime: String(scheduler.now() - 3_000) } }));
    expect(comments[0]).toMatchObject({ source: 'TIKTOK', userId: '7123', text: 'A', eventId: 'm1', sourceTimestampMs: scheduler.now() });
    // một comment bị đệm 8 s → sourceTimestamp lùi 8 s so với giờ nhận (server sẽ cách ly)
    c.emit('chat', chat({ common: { msgId: 'm2', createTime: String(scheduler.now() - 11_000) } }));
    expect(scheduler.now() - comments[1]!.sourceTimestampMs!).toBe(8_000);
  });

  it('mất kết nối → RECONNECTING, thử lại có backoff, thành công thì CONNECTED', async () => {
    const c1 = new FakeConn();
    const c2 = new FakeConn();
    const { adapter, scheduler, statuses } = setup([c1, c2]);
    await adapter.connect();
    c1.emit('disconnected', { code: 1006, reason: 'mạng' });
    expect(adapter.status()).toBe('RECONNECTING');
    expect(adapter.describe()).toContain('mạng');
    scheduler.advance(999);
    expect(c2.connects).toBe(0);
    scheduler.advance(1);
    await flush();
    expect(c2.connects).toBe(1);
    expect(adapter.status()).toBe('CONNECTED');
    expect(statuses).toEqual(['CONNECTING', 'CONNECTED', 'RECONNECTING', 'CONNECTED']);
  });

  it('tài khoản chưa LIVE → DISCONNECTED kèm hướng dẫn, không spam thử lại', async () => {
    const c = new FakeConn();
    c.failWith = new UserOfflineError('User is offline');
    const { adapter, scheduler } = setup([c]);
    await expect(adapter.connect()).rejects.toThrow(/chưa phát LIVE/);
    expect(adapter.status()).toBe('DISCONNECTED');
    scheduler.advance(120_000);
    expect(c.connects).toBe(1);
  });

  it('không lấy được Room ID → coi như chưa LIVE: DISCONNECTED, không tự thử lại', async () => {
    const c = new FakeConn();
    c.failWith = new Error('Failed to retrieve Room ID from all sources.');
    const { adapter, scheduler } = setup([c]);
    await expect(adapter.connect()).rejects.toThrow(/chưa phát LIVE/);
    expect(adapter.status()).toBe('DISCONNECTED');
    scheduler.advance(120_000);
    expect(c.connects).toBe(1);
  });

  it('hết lượt thử lại → DISCONNECTED; ngắt tay hoặc LIVE kết thúc thì không tự nối lại', async () => {
    const conns = Array.from({ length: 6 }, () => new FakeConn());
    for (const c of conns.slice(1)) c.failWith = new Error('ECONNRESET');
    const { adapter, scheduler } = setup(conns);
    await adapter.connect();
    conns[0]!.emit('disconnected', {});
    for (let i = 0; i < 10; i++) {
      scheduler.advance(10_000);
      await flush();
    }
    expect(adapter.status()).toBe('DISCONNECTED');
    expect(adapter.describe()).toMatch(/dừng tự kết nối/);

    const c = new FakeConn();
    const s2 = setup([c, new FakeConn()]);
    await s2.adapter.connect();
    c.emit('streamEnd', {});
    c.emit('disconnected', {});
    expect(s2.adapter.status()).toBe('DISCONNECTED');
    expect(s2.adapter.describe()).toContain('kết thúc');

    const d = new FakeConn();
    const s3 = setup([d]);
    await s3.adapter.connect();
    await s3.adapter.disconnect();
    expect(d.disconnects).toBe(1);
    expect(s3.adapter.status()).toBe('DISCONNECTED');
  });
});
