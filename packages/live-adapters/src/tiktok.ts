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
const DEFAULT_SIGNATURE_RETRY_MS = 5 * 60_000;
const SIGNATURE_RATE_LIMIT_DETAIL = 'Dịch vụ ký kết nối đang giới hạn lượt.';
const PRIVATE_LIVE_HINT = 'Nếu LIVE đang để chế độ Bạn bè/riêng tư, game chỉ đọc được LIVE Công khai.';
const CONNECTION_STABILITY_MS = 60_000;
const RAPID_DISCONNECT_LIMIT = 3;

/** Chuẩn hoá @username / URL → username. */
export function normalizeTikTokUsername(input: string): string {
  const s = String(input ?? '').trim();
  const fromUrl = /tiktok\.com\/@([^/?#]+)/i.exec(s)?.[1];
  return (fromUrl ?? s).replace(/^@+/, '').trim();
}

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));

/** Ánh xạ sự kiện chat của thư viện (proto v3 hoặc dạng cũ) → RawComment. Trả null nếu thiếu định danh ổn định. */
export function mapTikTokChat(data: any): (Omit<RawComment, 'source'> & { createTimeMs?: number; uniqueId?: string }) | null {
  const user = data?.user ?? {};
  const userId = str(user.id ?? user.userId);
  if (!userId || userId === '0') return null; // không có mã ổn định → không chấm điểm (V3 §5)
  const text = str(data?.content ?? data?.comment);
  // uniqueId/displayId có thể là @handle; không sử dụng làm tên công khai khi nickname trống.
  const displayName = str(user.nickname).trim();
  const uniqueId = str(user.uniqueId ?? user.displayId).trim().replace(/^@+/u, '');
  const msgId = str(data?.common?.msgId ?? data?.msgId);
  const rawTime = Number(data?.common?.createTime ?? data?.createTime);
  // createTime có thể là giây hoặc mili-giây tuỳ phiên bản giao thức
  const createTimeMs = Number.isFinite(rawTime) && rawTime > 0 ? (rawTime < 1e12 ? rawTime * 1000 : rawTime) : undefined;
  return {
    userId,
    displayName,
    text,
    ...(uniqueId ? { uniqueId } : {}),
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
  private connectedOnce = false;
  private attempts = 0;
  private rapidDisconnects = 0;
  private connectedAtMs: number | null = null;
  private connectionStable = false;
  private retryHandle: unknown = null;
  private stabilityHandle: unknown = null;
  private retryAt: number | null = null;
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
  retryAtMs() {
    return this.retryAt;
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
    if (this.retryAt !== null) {
      const remainingMs = this.retryAt - this.opts.scheduler.now();
      if (remainingMs > 0) {
        this.lastError = `${SIGNATURE_RATE_LIMIT_DETAIL} Thử lại được sau ${formatRetryDuration(remainingMs)}.`;
        this.setStatus('DISCONNECTED');
        throw new Error(this.lastError);
      }
      this.retryAt = null;
      this.lastError = null;
    }
    this.manualStop = false;
    this.clearRetry();
    if (this.st === 'CONNECTED') return;
    this.transportState = 'UNKNOWN';
    this.setStatus(this.attempts > 0 ? 'RECONNECTING' : 'CONNECTING');
    try {
      const conn = await this.openConnection();
      await conn.connect();
      this.conn = conn;
      this.connectedOnce = true;
      this.retryAt = null;
      this.lastError = null;
      this.connectedAtMs = this.opts.scheduler.now();
      this.connectionStable = false;
      this.clearStabilityTimer();
      this.stabilityHandle = this.opts.scheduler.setTimeout(() => {
        if (this.conn === conn && this.st === 'CONNECTED') this.markConnectionStable();
      }, CONNECTION_STABILITY_MS);
      // v2.5.0 chỉ resolve connect sau khi setupWebsocket mở socket.
      if (this.transportState === 'UNKNOWN') this.transportState = 'WEBSOCKET';
      this.setStatus('CONNECTED');
    } catch (err) {
      await this.dropConnection();
      if (isSignatureRateLimit(err)) {
        // Dịch vụ ký đã giới hạn lượt: không tự thử lại và giữ cooldown kể cả khi operator bấm sớm.
        const retryAfterMs = retryAfterMsFromError(err, this.opts.scheduler.now()) ?? DEFAULT_SIGNATURE_RETRY_MS;
        this.retryAt = this.opts.scheduler.now() + retryAfterMs;
        this.manualStop = true;
        this.lastError = describeError(err, this.username, this.connectedOnce);
        this.setStatus('DISCONNECTED');
      } else if (isOffline(err)) {
        // Chưa LIVE hoặc đã kết thúc: dừng retry tự động, tránh tạo thêm lượt ký vô ích.
        this.manualStop = true;
        this.lastError = describeError(err, this.username, this.connectedOnce);
        this.setStatus('DISCONNECTED');
      } else {
        this.lastError = describeError(err, this.username, this.connectedOnce);
        this.scheduleRetry();
      }
      throw new Error(this.lastError);
    }
  }

  async disconnect(): Promise<void> {
    this.manualStop = true;
    this.clearRetry();
    this.clearStabilityTimer();
    this.connectedAtMs = null;
    this.connectionStable = false;
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
    if (this.st === 'CONNECTED') this.markConnectionStable();
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
    const now = this.opts.scheduler.now();
    const wasStable = this.connectionStable;
    const connectedAtMs = this.connectedAtMs;
    const rapidDrop = !wasStable && connectedAtMs !== null && now - connectedAtMs < CONNECTION_STABILITY_MS;
    this.clearStabilityTimer();
    this.connectedAtMs = null;
    this.connectionStable = false;
    if (this.manualStop) {
      this.transportState = 'UNKNOWN';
      this.setStatus('DISCONNECTED');
      return;
    }
    if (rapidDrop) this.rapidDisconnects += 1;
    else if (wasStable || (connectedAtMs !== null && now - connectedAtMs >= CONNECTION_STABILITY_MS)) {
      this.rapidDisconnects = 0;
      this.attempts = 0;
    }
    this.transportState = 'UNKNOWN';
    const error = info?.exception ?? info?.error ?? info;
    if (isSignatureRateLimit(error)) {
      const retryAfterMs = retryAfterMsFromError(error, this.opts.scheduler.now()) ?? DEFAULT_SIGNATURE_RETRY_MS;
      this.retryAt = this.opts.scheduler.now() + retryAfterMs;
      this.manualStop = true;
      this.lastError = describeError(error, this.username, this.connectedOnce);
      this.setStatus('DISCONNECTED');
      return;
    }
    if (isOffline(error) && this.connectedOnce) {
      this.manualStop = true;
      this.lastError = describeError(error, this.username, true);
      this.setStatus('DISCONNECTED');
      return;
    }
    if (this.rapidDisconnects >= RAPID_DISCONNECT_LIMIT) {
      this.manualStop = true;
      this.lastError = 'Kết nối TikTok chập chờn (có thể LIVE để chế độ Bạn bè/riêng tư hoặc LIVE đã tắt) — kiểm tra rồi bấm Kết nối.';
      this.setStatus('DISCONNECTED');
      return;
    }
    this.lastError = rapidDrop
      ? 'Kết nối TikTok vừa rớt nhanh. Đang chờ backoff trước khi thử lại.'
      : 'WebSocket bị ngắt. Đang thử kết nối lại.';
    this.scheduleRetry();
  }

  private markConnectionStable() {
    this.clearStabilityTimer();
    this.connectionStable = true;
    this.connectedAtMs = null;
    this.attempts = 0;
    this.rapidDisconnects = 0;
  }

  private clearStabilityTimer() {
    if (this.stabilityHandle !== null) this.opts.scheduler.clearTimeout(this.stabilityHandle);
    this.stabilityHandle = null;
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
    const minimumDelayMs = this.rapidDisconnects > 0 ? 5_000 : 0;
    const backoff = Math.max(minimumDelayMs, Math.max(0, baseMs)) * 2 ** this.attempts;
    const cap = Math.max(minimumDelayMs, Math.min(60_000, Math.max(0, maxMs)));
    const delay = Math.min(cap, this.attempts === 0 && minimumDelayMs === 0 ? 1_000 : backoff);
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

function isSignatureRateLimit(err: unknown) {
  const nested = (err as { cause?: unknown } | null)?.cause;
  return errorName(err) === 'SignatureRateLimitError' || errorName(nested) === 'SignatureRateLimitError' ||
    /rate.?limit|\b429\b/i.test(`${errorName(err)} ${errorMessage(err)}`);
}

function retryAfterMsFromError(err: unknown, nowMs: number): number | undefined {
  const error = err as Record<string, unknown> | null;
  const nested = error?.cause as Record<string, unknown> | null;
  for (const source of [error, nested]) {
    const raw = source?.retryAfterMs;
    const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : Number.NaN;
    if (Number.isFinite(value) && value >= 0) return Math.ceil(value);
  }
  const response = (error?.response ?? nested?.response) as { headers?: Headers | Record<string, unknown> } | undefined;
  const headerValue = (headers: Headers | Record<string, unknown> | undefined) => {
    if (!headers) return undefined;
    if (typeof (headers as Headers).get === 'function') return (headers as Headers).get('retry-after') ?? undefined;
    const record = headers as Record<string, unknown>;
    const found = record['retry-after'] ?? record['Retry-After'];
    return typeof found === 'string' ? found : undefined;
  };
  const rawRetryAfter = error?.retryAfter ?? nested?.retryAfter ?? headerValue(response?.headers);
  if (typeof rawRetryAfter === 'number' && Number.isFinite(rawRetryAfter) && rawRetryAfter >= 0)
    return Math.ceil(rawRetryAfter * 1_000);
  if (typeof rawRetryAfter === 'string') {
    const seconds = Number(rawRetryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1_000);
    const timestamp = Date.parse(rawRetryAfter);
    if (Number.isFinite(timestamp)) return Math.max(0, timestamp - nowMs);
  }
  return undefined;
}

/** "Failed to retrieve Room ID…": thường là chưa LIVE (đôi khi TikTok chặn tạm) — coi như chưa LIVE, không tự thử lại dồn dập. */
function isRoomIdFailure(err: unknown) {
  return /room\s*id/i.test(String((err as Error)?.message ?? err));
}

function describeError(err: unknown, username: string, connectedOnce = false) {
  if (isSignatureRateLimit(err)) return `${SIGNATURE_RATE_LIMIT_DETAIL} Kiểm tra gói/khoá ký nếu lỗi tiếp diễn.`;
  if (isRoomIdFailure(err) || isOffline(err)) {
    const offlineMessage = connectedOnce
      ? 'LIVE có thể đã kết thúc — bấm Kết nối khi LIVE lại.'
      : `@${username} hiện chưa phát LIVE — bắt đầu LIVE rồi bấm Kết nối lại.`;
    return `${offlineMessage} ${PRIVATE_LIVE_HINT}`;
  }
  const name = errorName(err);
  const msg = errorMessage(err);
  if (/signapierror|signature|signing|euler/i.test(`${name} ${msg}`))
    return `Lỗi ký kết nối${name ? ` (${name})` : ''}. Kiểm tra cấu hình khoá ký; không cần cookie TikTok. Xem lại dịch vụ ký rồi thử kết nối lại. ${PRIVATE_LIVE_HINT}`;
  if (/websocket|socket/i.test(`${name} ${msg}`))
    return `Kết nối WebSocket thất bại${name ? ` (${name})` : ''}. Kiểm tra mạng và trạng thái LIVE rồi thử kết nối lại. ${PRIVATE_LIVE_HINT}`;
  return `Kết nối TikTok thất bại${name ? ` (${name})` : ''}. Kiểm tra mạng và trạng thái LIVE rồi thử kết nối lại. ${PRIVATE_LIVE_HINT}`;
}

function formatRetryDuration(ms: number) {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1_000);
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
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
