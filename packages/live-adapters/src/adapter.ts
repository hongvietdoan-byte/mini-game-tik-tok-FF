import type { ConnectionStatus, LiveSource, RawComment } from '@quiz/contracts';

/** Hợp đồng adapter nguồn comment LIVE (mục 4 đặc tả). */
export interface LiveAdapter {
  readonly source: LiveSource;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  status(): ConnectionStatus;
  onComment(cb: (comment: RawComment) => void): () => void;
  onStatus(cb: (status: ConnectionStatus) => void): () => void;
  healthCheck(): Promise<{ ok: boolean; detail: string }>;
  /** Lỗi/ghi chú gần nhất của nguồn (tuỳ chọn) — hiển thị ở Connection Manager. */
  describe?(): string | null;
}

class Emitter<T> {
  private subs = new Set<(v: T) => void>();
  on(cb: (v: T) => void) {
    this.subs.add(cb);
    return () => {
      this.subs.delete(cb);
    };
  }
  emit(v: T) {
    for (const cb of [...this.subs]) cb(v);
  }
}

/** Adapter giả lập: nguồn comment nội bộ cho simulator & kiểm thử. */
export class MockAdapter implements LiveAdapter {
  readonly source = 'MOCK' as const;
  private st: ConnectionStatus = 'DISCONNECTED';
  private comments = new Emitter<RawComment>();
  private statuses = new Emitter<ConnectionStatus>();
  /** Số comment bị mất do đang mất kết nối (mô phỏng giới hạn của connector thật). */
  dropped = 0;

  async connect() {
    this.setStatus('CONNECTED');
  }
  async disconnect() {
    this.setStatus('DISCONNECTED');
  }
  status() {
    return this.st;
  }
  onComment(cb: (c: RawComment) => void) {
    return this.comments.on(cb);
  }
  onStatus(cb: (s: ConnectionStatus) => void) {
    return this.statuses.on(cb);
  }
  async healthCheck() {
    return { ok: this.st === 'CONNECTED', detail: `mock:${this.st}` };
  }

  /** Bơm một comment (chỉ tới được server khi đang CONNECTED). */
  emit(c: Omit<RawComment, 'source'>) {
    if (this.st !== 'CONNECTED') {
      this.dropped += 1;
      return false;
    }
    this.comments.emit({ ...c, source: 'MOCK' });
    return true;
  }
  /** Mô phỏng rớt mạng / có mạng lại. */
  simulateConnectionLoss() {
    this.setStatus('RECONNECTING');
  }
  simulateConnectionRestore() {
    this.setStatus('CONNECTED');
  }
  private setStatus(s: ConnectionStatus) {
    if (this.st === s) return;
    this.st = s;
    this.statuses.emit(s);
  }
}

export const LIVE_CONNECTOR_BLOCKED = 'LIVE_CONNECTOR_BLOCKED';

/**
 * Adapter TikTok — CHƯA TRIỂN KHAI (Phase 4, sau cổng khả thi).
 * Chưa có bằng chứng về một kết nối được phép, định danh người dùng ổn định, việc nhận tin
 * và reconnect trên tài khoản/môi trường mục tiêu → luôn báo BLOCKED, không giả vờ hoạt động.
 */
export class TikTokAdapterBlocked implements LiveAdapter {
  readonly source = 'TIKTOK' as const;
  async connect(): Promise<void> {
    throw new Error(`${LIVE_CONNECTOR_BLOCKED}: chưa qua cổng khả thi TikTok (Phase 4)`);
  }
  async disconnect() {}
  status(): ConnectionStatus {
    return 'BLOCKED';
  }
  onComment() {
    return () => {};
  }
  onStatus() {
    return () => {};
  }
  async healthCheck() {
    return { ok: false, detail: LIVE_CONNECTOR_BLOCKED };
  }
}
