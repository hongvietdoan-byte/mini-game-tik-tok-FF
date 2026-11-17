import { createHash } from 'node:crypto';
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

export type TikTokTransport = 'WEBSOCKET' | 'POLLING' | 'UNKNOWN';
export type TikTokRawCommentRecord = {
  userIdHash: string;
  text: string;
  /** Thời điểm nguồn đã quy chuẩn sang mili-giây, giữ độ trễ khi replay. */
  createTime: number | null;
  msgId: string | null;
  receivedAtMs: number;
};

export type TikTokAdapterOptions = {
  /** @username của tài khoản đang phát LIVE (chấp nhận có/không có @ hoặc URL). */
  username: string;
  scheduler: Scheduler;
  /** Khoá Euler Stream (tuỳ chọn) — gói miễn phí bị giới hạn lượt ký. Không phải thông tin đăng nhập TikTok. */
  signApiKey?: string;
  /** Tiêm kết nối (test). Mặc định nạp `tiktok-live-connector`. */
  createConnection?: (username: string) => Promise<TikTokConnectionLike> | TikTokConnectionLike;
  reconnect?: { baseMs?: number; maxMs?: number; maxAttempts?: number };
  /** Gọi chỉ khi bật ghi log; payload đã bỏ nickname/ảnh và băm userId. */
  recordRawComment?: (record: TikTokRawCommentRecord) => void;
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
  // uniqueId/displayId có thể là @handle; không sử dụng làm tên công khai khi nickname trống.
  const displayName = str(user.nickname).trim();
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
  private transportState: TikTokTransport = 'UNKNOWN';
  /** Monotonic deque giữ min(now - createTime) trên 200 comment gần nhất. */
  private offsetSequence = 0;
  private minimumOffsets: { sequence: number; value: number }[] = [];
  private minimumOffsetHead = 0;

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
  transport(): TikTokTransport {
    return this.transportState;
  }
  rawRecordingEnabled() {
    return this.opts.recordRawComment !== undefined;
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
    this.transportState = 'UNKNOWN';
    this.setStatus(this.attempts > 0 ? 'RECONNECTING' : 'CONNECTING');
    try {
      const conn = await this.openConnection();
      await conn.connect();
      this.conn = conn;
      this.attempts = 0;
      this.lastError = null;
      // v2.5.0 chỉ resolve connect sau khi setupWebsocket mở socket.
      if (this.transportState === 'UNKNOWN') this.transportState = 'WEBSOCKET';
      this.setStatus('CONNECTED');
    } catch (err) {
      this.lastError = describeError(err, this.username);
      await this.dropConnection();
      if (isOffline(err)) {
        // Tài khoản chưa LIVE / không lấy được Room ID: không spam thử lại — operator bấm Kết nối lại khi đã lên sóng.
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
      this.transportState = 'UNKNOWN';
      this.manualStop = true; // không tự kết nối lại khi chủ phòng tắt LIVE
    });
    conn.on('websocketConnected', () => { this.transportState = 'WEBSOCKET'; });
    // Hook tương lai: bản ghim 2.5.0 không có polling fallback.
    conn.on('polling', () => { this.transportState = 'POLLING'; });
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
      const sequence = this.offsetSequence++;
      const offset = now - c.createTimeMs;
      while (this.minimumOffsets.length > this.minimumOffsetHead &&
        this.minimumOffsets.at(-1)!.value >= offset) this.minimumOffsets.pop();
      this.minimumOffsets.push({ sequence, value: offset });
      const firstValidSequence = sequence - 199;
      while (this.minimumOffsetHead < this.minimumOffsets.length &&
        this.minimumOffsets[this.minimumOffsetHead]!.sequence < firstValidSequence) this.minimumOffsetHead += 1;
      if (this.minimumOffsetHead > 256) {
        this.minimumOffsets = this.minimumOffsets.slice(this.minimumOffsetHead);
        this.minimumOffsetHead = 0;
      }
      const base = this.minimumOffsets[this.minimumOffsetHead]!.value;
      sourceTimestampMs = c.createTimeMs + base; // quy về giờ máy, bỏ phần lệch đồng hồ cố định
    }
    const { createTimeMs: _drop, ...rest } = c;
    void _drop;
    try {
      this.opts.recordRawComment?.({
        userIdHash: hashTikTokUserId(c.userId),
        text: c.text,
        createTime: sourceTimestampMs ?? null,
        msgId: c.eventId ?? null,
        receivedAtMs: now,
      });
    } catch {
      // Ghi log tùy chọn không được làm gián đoạn luồng nhận/chấm comment.
    }
    const comment: RawComment = { source: 'TIKTOK', ...rest, ...(sourceTimestampMs !== undefined ? { sourceTimestampMs } : {}) };
    for (const cb of [...this.commentSubs]) cb(comment);
  }

  private handleDisconnected(info: any) {
    this.conn = null;
    if (this.manualStop) {
      this.transportState = 'UNKNOWN';
      this.setStatus('DISCONNECTED');
      return;
    }
    void info;
    this.transportState = 'UNKNOWN';
    this.lastError = 'WebSocket bị ngắt. Đang thử kết nối lại.';
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
    const backoff = Math.max(0, baseMs) * 2 ** this.attempts;
    const delay = Math.min(maxMs, this.attempts === 0 ? 1_000 : backoff);
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
  return name === 'UserOfflineError' || /offline|not live|isn't online/i.test(String((err as Error)?.message ?? err)) || isRoomIdFailure(err);
}

/** "Failed to retrieve Room ID…": thường là chưa LIVE (đôi khi TikTok chặn tạm) — coi như chưa LIVE, không tự thử lại dồn dập. */
function isRoomIdFailure(err: unknown) {
  return /room\s*id/i.test(String((err as Error)?.message ?? err));
}

function describeError(err: unknown, username: string) {
  if (isRoomIdFailure(err)) return `Không lấy được phòng LIVE của @${username} — thường do chưa phát LIVE (hoặc TikTok tạm chặn). Bắt đầu LIVE rồi bấm Kết nối lại`;
  if (isOffline(err)) return `@${username} hiện chưa phát LIVE — bắt đầu LIVE rồi bấm Kết nối lại`;
  const name = errorName(err);
  const msg = errorMessage(err);
  if (name === 'SignatureRateLimitError' || /rate.?limit|\b429\b/i.test(`${name} ${msg}`))
    return 'Dịch vụ ký kết nối đang giới hạn lượt. Chờ theo thời gian retry rồi bấm Kết nối lại; kiểm tra gói/khoá ký nếu lỗi tiếp diễn.';
  if (/signapierror|signature|signing|euler/i.test(`${name} ${msg}`))
    return `Lỗi ký kết nối${name ? ` (${name})` : ''}. Kiểm tra cấu hình khoá ký; không cần cookie TikTok. Xem lại dịch vụ ký rồi thử kết nối lại.`;
  if (/websocket|socket/i.test(`${name} ${msg}`))
    return `Kết nối WebSocket thất bại${name ? ` (${name})` : ''}. Kiểm tra mạng và trạng thái LIVE rồi thử kết nối lại.`;
  return `Kết nối TikTok thất bại${name ? ` (${name})` : ''}. Kiểm tra mạng và trạng thái LIVE rồi thử kết nối lại.`;
}

function errorName(err: unknown): string {
  const value = err as { name?: unknown; constructor?: { name?: unknown } } | null;
  const name = typeof value?.name === 'string' && value.name !== 'Error' ? value.name : value?.constructor?.name ?? value?.name;
  return typeof name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,79}$/.test(name) ? name : '';
}

function errorMessage(err: unknown): string {
  const value = err as { message?: unknown; cause?: unknown } | null;
  const direct = typeof value?.message === 'string' ? value.message : '';
  const cause = value?.cause as { message?: unknown } | undefined;
  return `${direct} ${typeof cause?.message === 'string' ? cause.message : ''}`;
}

export function hashTikTokUserId(userId: string): string {
  // Node server only; no raw identifier leaves this adapter through recording.
  return createSha256(userId);
}

function createSha256(value: string): string {
  // Node server only; no raw identifier leaves this adapter through recording.
  return createHash('sha256').update(value).digest('hex');
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
