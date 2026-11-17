import { describe, expect, it } from 'vitest';
import type { ConnectionStatus, RawComment } from '@quiz/contracts';
import { ManualScheduler } from './scheduler';
import { hashTikTokUserId, TikTokLiveAdapter, mapTikTokChat, normalizeTikTokUsername, type TikTokConnectionLike } from './tiktok';

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

function setup(conns: FakeConn[], reconnect = { baseMs: 1_000, maxMs: 8_000, maxAttempts: 4 }) {
  const scheduler = new ManualScheduler(1_800_000_000_000);
  let i = 0;
  const adapter = new TikTokLiveAdapter({
    username: '@shop_ff',
    scheduler,
    createConnection: () => conns[Math.min(i++, conns.length - 1)]!,
    reconnect,
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
    expect(adapter.transport()).toBe('WEBSOCKET');
  });

  it('cửa sổ offset hết hạn min cũ mà không quét toàn bộ mảng mỗi comment', async () => {
    const c = new FakeConn();
    const { adapter, scheduler, comments } = setup([c]);
    await adapter.connect();
    c.emit('chat', chat({ common: { msgId: 'old-min', createTime: String(scheduler.now() - 100) } }));
    c.emit('chat', chat({ common: { msgId: 'later-0', createTime: String(scheduler.now() - 500) } }));
    expect(scheduler.now() - comments.at(-1)!.sourceTimestampMs!).toBe(400);
    for (let i = 1; i < 200; i++)
      c.emit('chat', chat({ common: { msgId: `later-${i}`, createTime: String(scheduler.now() - 500) } }));
    expect(scheduler.now() - comments.at(-1)!.sourceTimestampMs!).toBe(0);
  });

  it('ghi raw comment chỉ với userId đã băm và không mang displayName', async () => {
    const c = new FakeConn();
    const records: unknown[] = [];
    const scheduler = new ManualScheduler(1_800_000_000_000);
    const adapter = new TikTokLiveAdapter({
      username: 'synthetic', scheduler, createConnection: () => c,
      recordRawComment: (record) => records.push(record),
    });
    await adapter.connect();
    c.emit('chat', chat());
    expect(records).toEqual([{
      userIdHash: hashTikTokUserId('7123'), text: 'A', createTime: scheduler.now(), msgId: 'm1', receivedAtMs: scheduler.now(),
    }]);
    expect(JSON.stringify(records)).not.toContain('Rồng Lửa');
    expect(JSON.stringify(records)).not.toContain('7123');
  });

  it('mất kết nối → RECONNECTING, rớt nhanh chờ tối thiểu 5 giây rồi kết nối lại', async () => {
    const c1 = new FakeConn();
    const c2 = new FakeConn();
    const { adapter, scheduler, statuses } = setup([c1, c2]);
    await adapter.connect();
    c1.emit('disconnected', { code: 1006, reason: 'mạng' });
    expect(adapter.status()).toBe('RECONNECTING');
    expect(adapter.describe()).toContain('rớt nhanh');
    expect(adapter.describe()).not.toContain('mạng');
    scheduler.advance(4_999);
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
    expect(adapter.describe()).toContain('LIVE Công khai');
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

  it('rớt nhanh lần đầu chờ ít nhất 5 giây; rate limit chỉ báo phân loại lỗi, không lộ thông báo thô', async () => {
    const first = new FakeConn();
    const retry = new FakeConn();
    const { adapter, scheduler } = setup([first, retry], { baseMs: 5_000, maxMs: 10_000, maxAttempts: 2 });
    await adapter.connect();
    first.emit('disconnected', {});
    scheduler.advance(4_999);
    expect(retry.connects).toBe(0);
    scheduler.advance(1);
    await flush();
    expect(retry.connects).toBe(1);

    const limited = new FakeConn();
    const err = Object.assign(new Error('secret response with internal URL and token'), { name: 'SignatureRateLimitError' });
    limited.failWith = err;
    const limitedSetup = setup([limited]);
    await expect(limitedSetup.adapter.connect()).rejects.toThrow(/giới hạn lượt/);
    expect(limitedSetup.adapter.retryAtMs()).toBe(limitedSetup.scheduler.now() + 5 * 60_000);
    expect(limitedSetup.scheduler.pending).toBe(0);
    expect(limitedSetup.adapter.describe()).not.toContain('secret');
    expect(limitedSetup.adapter.describe()).not.toContain('URL');
  });

  it('rate limit dừng retry tự động, tôn trọng retryAfterMs và chặn kết nối tay tới hạn', async () => {
    const first = new FakeConn();
    const afterCooldown = new FakeConn();
    const limited = Object.assign(new Error('private service response'), { name: 'SignatureRateLimitError', retryAfterMs: 12_000 });
    first.failWith = limited;
    const { adapter, scheduler } = setup([first, afterCooldown]);
    const limitedAt = scheduler.now();

    await expect(adapter.connect()).rejects.toThrow(/giới hạn lượt/);
    expect(adapter.retryAtMs()).toBe(limitedAt + 12_000);
    expect(scheduler.pending).toBe(0);
    scheduler.advance(11_999);
    await expect(adapter.connect()).rejects.toThrow(/Thử lại được sau 00:01/);
    expect(afterCooldown.connects).toBe(0);
    expect(adapter.retryAtMs()).toBe(limitedAt + 12_000);

    scheduler.advance(1);
    await adapter.connect();
    expect(afterCooldown.connects).toBe(1);
    expect(adapter.retryAtMs()).toBeNull();
  });

  it('rate limit trong vòng tự kết nối lại không xếp thêm lần thử nào', async () => {
    const initial = new FakeConn();
    const limited = new FakeConn();
    limited.failWith = Object.assign(new Error('HTTP 429'), { name: 'SignatureRateLimitError' });
    const { adapter, scheduler } = setup([initial, limited]);
    await adapter.connect();

    initial.emit('disconnected', { code: 1006 });
    scheduler.advance(5_000);
    await flush();
    expect(limited.connects).toBe(1);
    expect(adapter.status()).toBe('DISCONNECTED');
    expect(adapter.retryAtMs()).toBe(scheduler.now() + 5 * 60_000);
    expect(scheduler.pending).toBe(0);

    scheduler.advance(10 * 60_000);
    expect(limited.connects).toBe(1);
  });

  it('LIVE offline sau khi đã từng kết nối dừng sau tối đa hai lần thử và gợi ý LIVE công khai', async () => {
    const initial = new FakeConn();
    const offlineRetry = new FakeConn();
    offlineRetry.failWith = new Error('Failed to retrieve Room ID from all sources.');
    const { adapter, scheduler } = setup([initial, offlineRetry]);
    await adapter.connect();

    initial.emit('disconnected', { code: 1006 });
    scheduler.advance(5_000);
    await flush();
    expect(offlineRetry.connects).toBe(1);
    expect(adapter.status()).toBe('DISCONNECTED');
    expect(adapter.describe()).toContain('LIVE có thể đã kết thúc — bấm Kết nối khi LIVE lại');
    expect(adapter.describe()).toContain('LIVE Công khai');
    expect(adapter.retryAtMs()).toBeNull();
    expect(scheduler.pending).toBe(0);

    scheduler.advance(10 * 60_000);
    expect(offlineRetry.connects).toBe(1);
  });

  it('lỗi kết nối chung gợi ý LIVE Bạn bè/riêng tư chỉ đọc được LIVE Công khai', async () => {
    const connection = new FakeConn();
    connection.failWith = new Error('ECONNREFUSED');
    const { adapter } = setup([connection], { baseMs: 10_000, maxMs: 10_000, maxAttempts: 0 });
    await expect(adapter.connect()).rejects.toThrow(/LIVE Công khai/);
    expect(adapter.describe()).toContain('Bạn bè/riêng tư');
  });

  it('kết nối rớt nhanh tăng backoff 5s → 10s và dừng sau lần rớt nhanh thứ ba', async () => {
    const connections = Array.from({ length: 4 }, () => new FakeConn());
    const { adapter, scheduler } = setup(connections, { baseMs: 1_000, maxMs: 60_000, maxAttempts: 4 });
    await adapter.connect();

    connections[0]!.emit('disconnected', { code: 1006 });
    expect(adapter.status()).toBe('RECONNECTING');
    scheduler.advance(4_999);
    expect(connections[1]!.connects).toBe(0);
    scheduler.advance(1);
    await flush();
    expect(connections[1]!.connects).toBe(1);

    connections[1]!.emit('disconnected', { code: 1006 });
    scheduler.advance(9_999);
    expect(connections[2]!.connects).toBe(0);
    scheduler.advance(1);
    await flush();
    expect(connections[2]!.connects).toBe(1);

    connections[2]!.emit('disconnected', { code: 1006 });
    expect(adapter.status()).toBe('DISCONNECTED');
    expect(adapter.describe()).toContain('Kết nối TikTok chập chờn');
    expect(adapter.describe()).toContain('Bạn bè/riêng tư');
    scheduler.advance(10 * 60_000);
    expect(connections[3]!.connects).toBe(0);
  });

  it('một bình luận làm kết nối ổn định và đặt lại bộ đếm backoff', async () => {
    const initial = new FakeConn();
    const recovered = new FakeConn();
    const afterStable = new FakeConn();
    const { adapter, scheduler } = setup([initial, recovered, afterStable]);
    await adapter.connect();
    initial.emit('disconnected', { code: 1006 });
    scheduler.advance(5_000);
    await flush();
    expect(recovered.connects).toBe(1);

    recovered.emit('chat', chat());
    recovered.emit('disconnected', { code: 1006 });
    scheduler.advance(999);
    expect(afterStable.connects).toBe(0);
    scheduler.advance(1);
    await flush();
    expect(afterStable.connects).toBe(1);
  });

  it('giữ kết nối đủ 60 giây làm nó ổn định và đặt lại bộ đếm rớt nhanh', async () => {
    const initial = new FakeConn();
    const recovered = new FakeConn();
    const afterStable = new FakeConn();
    const { adapter, scheduler } = setup([initial, recovered, afterStable]);
    await adapter.connect();
    initial.emit('disconnected', { code: 1006 });
    scheduler.advance(5_000);
    await flush();
    expect(recovered.connects).toBe(1);

    scheduler.advance(60_000);
    recovered.emit('disconnected', { code: 1006 });
    scheduler.advance(999);
    expect(afterStable.connects).toBe(0);
    scheduler.advance(1);
    await flush();
    expect(afterStable.connects).toBe(1);
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
