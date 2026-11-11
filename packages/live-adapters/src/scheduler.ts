import { performance } from 'node:perf_hooks';

/** Đồng hồ + hẹn giờ có thể tiêm (inject) — cho phép test tất định bằng ManualScheduler. */
export interface Scheduler {
  /** Mili-giây đơn điệu (không lùi khi đồng hồ hệ thống bị chỉnh). */
  now(): number;
  setTimeout(fn: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

/** Thời gian đơn điệu neo vào epoch lúc khởi động: now = epoch@boot + Δperformance.now(). */
export class RealScheduler implements Scheduler {
  private readonly epoch = Date.now();
  private readonly perf0 = performance.now();
  now() {
    return this.epoch + (performance.now() - this.perf0);
  }
  setTimeout(fn: () => void, delayMs: number) {
    return setTimeout(fn, Math.max(0, delayMs));
  }
  clearTimeout(handle: unknown) {
    clearTimeout(handle as NodeJS.Timeout);
  }
}

/** Đồng hồ ảo: thời gian chỉ trôi khi gọi advance(); timer chạy đúng thứ tự (thời điểm, thứ tự đăng ký). */
export class ManualScheduler implements Scheduler {
  private t: number;
  private seq = 0;
  private timers = new Map<number, { at: number; seq: number; fn: () => void }>();
  constructor(startMs = 1_800_000_000_000) {
    this.t = startMs;
  }
  now() {
    return this.t;
  }
  setTimeout(fn: () => void, delayMs: number) {
    const id = ++this.seq;
    this.timers.set(id, { at: this.t + Math.max(0, delayMs), seq: id, fn });
    return id;
  }
  clearTimeout(handle: unknown) {
    this.timers.delete(handle as number);
  }
  get pending() {
    return this.timers.size;
  }
  /** Tua thời gian, chạy mọi timer đến hạn (kể cả timer mới được đăng ký trong lúc chạy). */
  advance(ms: number) {
    const target = this.t + ms;
    for (;;) {
      let next: { id: number; at: number; seq: number; fn: () => void } | null = null;
      for (const [id, tm] of this.timers) {
        if (tm.at > target) continue;
        if (!next || tm.at < next.at || (tm.at === next.at && tm.seq < next.seq)) next = { id, ...tm };
      }
      if (!next) break;
      this.timers.delete(next.id);
      this.t = Math.max(this.t, next.at);
      next.fn();
    }
    this.t = target;
  }
}
