import type { ConnectionStatus, RawComment } from '@quiz/contracts';
import type { LiveAdapter } from './adapter';
import type { Scheduler } from './scheduler';

/**
 * Adapter TikTok LIVE dùng thư viện cộng đồng `tiktok-live-connector` (GitHub zerodytrash/TikTok-Live-Connector).
 *
 * ⚠ KHÔNG CHÍNH THỨC — thư viện đọc webcast qua chữ ký của dịch vụ bên thứ ba (Euler Stream). Người dùng/đơn vị đã chấp nhận
 * rủi ro điều khoản (BOARD #17, 11/11/2026) trong lúc chờ kênh chính thức của TikTok. Thay adapter khi có API chính thức.
 *
 * Ràng buộc cứng: chỉ đọc; KHÔNG gửi cookie/session (authenticateWs=false); không sendMessage;
 * processInitialData=false (không nạp lịch sử bình luận cũ khi vừa kết nối).
 */

/** Phần tối thiểu của TikTokLiveConnection mà adapter dùng — cho phép tiêm bản giả khi test. */
export interface TikTokConnectionLike {
  connect(): Promise<unknown>;
  disconnect(): Promise<unknown>;
  on(event: string, cb: (data: any) => void): unknown;
  removeAllListeners?(event?: string): unknown;
}

export type TikTokAdapterOptions = {
  /** @username của tài khoản đang phát LIVE (chấp nhận có/không có @ hoặc URL). */
  username: string;
  scheduler: Scheduler;
  /** Khoá Euler Stream (tuỳ chọn) — gói miễn phí bị giới hạn lượt ký. Không phải thông tin đăng nhập TikTok. */
  signApiKey?: string;
  /** Tiêm kết nối (test). Mặc định nạp `tiktok-live-connector`. */
  createConnection?: (username: string) => Promise<TikTokConnectionLike> | TikTokConnectionLike;
  reconnect?: { baseMs?: number; maxMs?: number; maxAttempts?: number };
};

export const TIKTOK_UNOFFICIAL_NOTICE =
  'Kết nối KHÔNG CHÍNH THỨC qua tiktok-live-connector (ký request bởi Euler Stream) — dùng tạm trong lúc chờ kênh chính thức của TikTok.';

/** Chuẩn hoá @username / URL → username. */
export function normalizeTikTokUsername(input: string): string {
  const s = String(input ?? '').trim();
  const fromUrl = /tiktok\.com\/@([^/?#]+)/i.exec(s)?.[1];
  return (fromUrl ?? s).replace(/^@+/, '').trim();
}

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));

/** Ánh xạ sự kiện chat của thư viện (proto v3 hoặc dạng cũ) → RawComment. Trả null nếu thiếu định danh ổn định. */
export function mapTikTokChat(data: any): (Omit<RawComment, 'source'> & { createTimeMs?: number }) | null {
  const user = data?.user ?? {};
  const userId = str(user.id ?? user.userId);
  if (!userId || userId === '0') return null; // không có mã ổn định → không chấm điểm (V3 §5)
  const text = str(data?.content ?? data?.comment);
  const displayName = str(user.nickname || user.uniqueId || user.displayId) || 'Khán giả';
  const msgId = str(data?.common?.msgId ?? data?.msgId);
  const rawTime = Number(data?.common?.createTime ?? data?.createTime);
  // createTime có thể là giây hoặc mili-giây tuỳ phiên bản giao thức
  const createTimeMs = Number.isFinite(rawTime) && rawTime > 0 ? (rawTime < 1e12 ? rawTime * 1000 : rawTime) : undefined;
  return {
    userId,
    displayName,
    text,
    ...(msgId && msgId !== '0' ? { eventId: msgId } : {}),
    ...(createTimeMs ? { createTimeMs } : {}),
  };
}

export class TikTokLiveAdapter implements LiveAdapter {
  readonly source = 'TIKTOK' as const;
  readonly username: string;
  private st: ConnectionStatus = 'DISCONNECTED';
  private conn: TikTokConnectionLike | null = null;
  private commentSubs = new Set<(c: RawComment) => void>();
  private statusSubs = new Set<(s: ConnectionStatus) => void>();
  private manualStop = false;
  private attempts = 0;
  private retryHandle: unknown = null;
  private lastError: string | null = null;
  /** Ước lượng độ lệch đồng hồ + độ trễ tối thiểu (min của now − createTime) để sourceTimestamp so sánh được với giờ máy. */
  private offsets: number[] = [];

  constructor(private readonly opts: TikTokAdapterOptions) {
    this.username = normalizeTikTokUsername(opts.username);
    if (!this.username) throw new Error('Thiếu TikTok username');
  }

  status() {
    return this.st;
  }
  describe() {
    return this.lastError;
  }
  onComment(cb: (c: RawComment) => void) {
    this.commentSubs.add(cb);
    return () => void this.commentSubs.delete(cb);
  }
  onStatus(cb: (s: ConnectionStatus) => void) {
    this.statusSubs.add(cb);
    return () => void this.statusSubs.delete(cb);
  }
  async healthCheck() {
    return { ok: this.st === 'CONNECTED', detail: this.lastError ?? `tiktok:${this.st} @${this.username}` };
  }

  async connect(): Promise<void> {
    this.manualStop = false;
    this.clearRetry();
    if (this.st === 'CONNECTED') return;
    this.setStatus(this.attempts > 0 ? 'RECONNECTING' : 'CONNECTING');
    try {
      const conn = await this.openConnection();
      await conn.connect();
      this.conn = conn;
      this.attempts = 0;
      this.lastError = null;
      this.setStatus('CONNECTED');
    } catch (err) {
      this.lastError = describeError(err, this.username);
      await this.dropConnection();
      if (isOffline(err)) {
        // Tài khoản chưa LIVE: không spam thử lại — operator bấm Kết nối lại khi đã lên sóng.
        this.setStatus('DISCONNECTED');
      } else this.scheduleRetry();
      throw new Error(this.lastError);
    }
  }

  async disconnect(): Promise<void> {
    this.manualStop = true;
    this.clearRetry();
    await this.dropConnection();
    this.setStatus('DISCONNECTED');
  }

  private async openConnection(): Promise<TikTokConnectionLike> {
    const conn = this.opts.createConnection
      ? await this.opts.createConnection(this.username)
      : await defaultConnection(this.username, this.opts.signApiKey);
    conn.on('chat', (data: any) => this.handleChat(data));
    conn.on('disconnected', (info: any) => this.handleDisconnected(info));
    conn.on('streamEnd', () => {
      this.lastError = 'Buổi LIVE đã kết thúc';
      this.manualStop = true; // không tự kết nối lại khi chủ phòng tắt LIVE
    });
    conn.on('error', (e: any) => {
      this.lastError = describeError(e?.exception ?? e?.info ?? e, this.username);
    });
    return conn;
  }

  private handleChat(data: any) {
    const now = this.opts.scheduler.now();
    const c = mapTikTokChat(data);
    if (!c) return;
    let sourceTimestampMs: number | undefined;
    if (c.createTimeMs !== undefined) {
      this.offsets.push(now - c.createTimeMs);
      if (this.offsets.length > 200) this.offsets.shift();
      const base = Math.min(...this.offsets);
      sourceTimestampMs = c.createTimeMs + base; // quy về giờ máy, bỏ phần lệch đồng hồ cố định
    }
    const { createTimeMs: _drop, ...rest } = c;
    void _drop;
    const comment: RawComment = { source: 'TIKTOK', ...rest, ...(sourceTimestampMs !== undefined ? { sourceTimestampMs } : {}) };
    for (const cb of [...this.commentSubs]) cb(comment);
  }

  private handleDisconnected(info: any) {
    this.conn = null;
    if (this.manualStop) {
      this.setStatus('DISCONNECTED');
      return;
    }
    this.lastError = `Mất kết nối${info?.reason ? `: ${info.reason}` : ''}`;
    this.scheduleRetry();
  }

  private scheduleRetry() {
    const { baseMs = 2_000, maxMs = 60_000, maxAttempts = 20 } = this.opts.reconnect ?? {};
    if (this.manualStop) return;
    if (this.attempts >= maxAttempts) {
      this.lastError = `${this.lastError ?? 'Mất kết nối'} — đã thử lại ${this.attempts} lần, dừng tự kết nối`;
      this.setStatus('DISCONNECTED');
      return;
    }
    this.setStatus('RECONNECTING');
    const delay = Math.min(maxMs, baseMs * 2 ** this.attempts);
    this.attempts += 1;
    this.retryHandle = this.opts.scheduler.setTimeout(() => {
      this.retryHandle = null;
      this.connect().catch(() => {});
    }, delay);
  }

  private clearRetry() {
    if (this.retryHandle !== null) this.opts.scheduler.clearTimeout(this.retryHandle);
    this.retryHandle = null;
  }

  private async dropConnection() {
    const c = this.conn;
    this.conn = null;
    if (!c) return;
    try {
      c.removeAllListeners?.();
      await c.disconnect();
    } catch {
      /* đóng lỗi không chặn */
    }
  }

  private setStatus(s: ConnectionStatus) {
    if (this.st === s) return;
    this.st = s;
    for (const cb of [...this.statusSubs]) cb(s);
  }
}

function isOffline(err: unknown) {
  const name = (err as { name?: string; constructor?: { name?: string } })?.constructor?.name ?? (err as { name?: string })?.name;
  return name === 'UserOfflineError' || /offline|not live|isn't online/i.test(String((err as Error)?.message ?? err));
}

function describeError(err: unknown, username: string) {
  if (isOffline(err)) return `@${username} hiện chưa phát LIVE — bắt đầu LIVE rồi bấm Kết nối lại`;
  const msg = err instanceof Error ? err.message : String(err ?? 'lỗi không rõ');
  if (/rate.?limit|429/i.test(msg)) return `Bị giới hạn tần suất (sign server/TikTok) — chờ vài phút rồi thử lại. ${msg}`;
  return msg;
}

async function defaultConnection(username: string, signApiKey?: string): Promise<TikTokConnectionLike> {
  const mod: any = await import('tiktok-live-connector');
  const Ctor = mod.TikTokLiveConnection ?? mod.default?.TikTokLiveConnection;
  if (!Ctor) throw new Error('Không nạp được tiktok-live-connector');
  return new Ctor(username, {
    processInitialData: false,
    fetchRoomInfoOnConnect: true,
    enableExtendedGiftInfo: false,
    authenticateWs: false,
    ...(signApiKey ? { signApiKey } : {}),
  }) as TikTokConnectionLike;
}
