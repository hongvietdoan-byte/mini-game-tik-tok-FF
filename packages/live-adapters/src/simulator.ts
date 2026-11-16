import { randomUUID } from 'node:crypto';
import type { OptionId } from '@quiz/contracts';
import type { MockAdapter } from './adapter';
import type { Scheduler } from './scheduler';

export type SimPlayer = { userId: string; displayName: string };

export type SimulatorOptions = {
  players: SimPlayer[];
  /** Xác suất trung bình trả lời đúng. */
  accuracy: number;
  /** Xác suất một người chơi tham gia một câu. */
  participation: number;
  /** Xác suất spam thêm đáp án sau đáp án đầu. */
  spamRate: number;
  /** Xác suất gửi chat không phải đáp án. */
  noiseRate: number;
  seed: number;
};

type ScheduledComment = { dueAtMs: number; originalDueAtMs: number; order: number; eventId: string; player: SimPlayer; text: string };
type CommentBatch = { dueAtMs: number; comments: ScheduledComment[] };

/** Gom comment cùng nhịp để simulator chỉ giữ một timer thay vì một timer/người chơi. */
const SIMULATOR_TICK_MS = 25;

function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const OPTIONS: OptionId[] = ['A', 'B', 'C', 'D'];
const NOISE = ['xin chào', 'hay quá', 'A B', 'đáp án A', 'AA', 'câu này khó', '!A', 'B.', '🔥🔥🔥', 'ABCD'];
/** Các biến thể định dạng HỢP LỆ sau chuẩn hoá NFKC + trim + uppercase. */
const FORMATS: ((o: OptionId) => string)[] = [
  (o) => o,
  (o) => o.toLowerCase(),
  (o) => `  ${o} `,
  (o) => String.fromCharCode(o.charCodeAt(0) + 0xfee0), // chữ full-width Ａ..Ｄ
  (o) => `${o.toLowerCase()}\n`,
];

/**
 * Trình mô phỏng người chơi cho chế độ MOCK. Lựa chọn (ai trả lời gì, lúc nào) hoàn toàn tất định
 * theo seed + questionInstanceId; thời điểm phát do Scheduler quyết định.
 */
export class MockSimulator {
  private handle: unknown = null;
  private scheduledAtMs: number | null = null;
  private batches: CommentBatch[] = [];
  private nextBatch = 0;
  private order = 0;
  private readonly runId = randomUUID();
  private seq = 0;
  private skill: number[];
  running = true;
  sent = 0;

  constructor(
    private adapter: MockAdapter,
    private scheduler: Scheduler,
    readonly opts: SimulatorOptions,
  ) {
    const r = prng(opts.seed);
    this.skill = opts.players.map(() => Math.min(0.98, Math.max(0.05, opts.accuracy + (r() - 0.5) * 0.5)));
  }

  /** Gọi khi một câu hỏi mở (chỉ tầng admin/mock biết đáp án đúng). */
  onQuestionOpened(q: { questionInstanceId: string; correctOptionId: OptionId; windowMs: number }) {
    if (!this.running) return;
    const r = prng(this.opts.seed ^ hash(q.questionInstanceId));
    const openedAtMs = this.scheduler.now();
    const buckets = new Map<number, ScheduledComment[]>();
    const at = (delayMs: number, player: SimPlayer, text: string, eventId?: string) => {
      const id = eventId ?? `sim-${this.runId}-${++this.seq}`;
      // Đáp án hợp lệ không bị đẩy qua deadline; sự kiện đã muộn không bị làm sớm thành hợp lệ.
      const ticks = Math.max(0, delayMs) / SIMULATOR_TICK_MS;
      const dueAtMs = openedAtMs + (delayMs > q.windowMs ? Math.ceil(ticks) : Math.floor(ticks)) * SIMULATOR_TICK_MS;
      let bucket = buckets.get(dueAtMs);
      if (!bucket) buckets.set(dueAtMs, (bucket = []));
      bucket.push({ dueAtMs, originalDueAtMs: openedAtMs + Math.max(0, delayMs), order: ++this.order, eventId: id, player, text });
      return id;
    };

    this.opts.players.forEach((p, i) => {
      if (r() < this.opts.noiseRate) at(r() * q.windowMs, p, NOISE[Math.floor(r() * NOISE.length)]!);
      if (r() >= this.opts.participation) return;
      const correct = r() < this.skill[i]!;
      const wrong = OPTIONS.filter((o) => o !== q.correctOptionId);
      const option = correct ? q.correctOptionId : wrong[Math.floor(r() * wrong.length)]!;
      const late = r() < 0.03;
      const delay = late ? q.windowMs + 20 + r() * 400 : q.windowMs * (0.03 + r() * 0.94);
      const text = FORMATS[Math.floor(r() * FORMATS.length)]!(option);
      const eventId = at(delay, p, text);
      // phát lại cùng một event (duplicate delivery từ nguồn)
      if (r() < 0.02) at(delay + 1, p, text, eventId);
      if (r() < this.opts.spamRate) {
        const extra = 1 + Math.floor(r() * 3);
        for (let k = 0; k < extra; k++)
          at(delay + 5 + r() * Math.max(0, q.windowMs - delay), p, OPTIONS[Math.floor(r() * 4)]!);
      }
    });

    const added = [...buckets.entries()]
      .map(([dueAtMs, comments]) => ({
        dueAtMs,
        comments: comments.sort((a, b) => a.originalDueAtMs - b.originalDueAtMs || a.order - b.order),
      }))
      .sort((a, b) => a.dueAtMs - b.dueAtMs);
    if (added.length) {
      const pending = this.batches.slice(this.nextBatch);
      this.batches = mergeBatches(pending, added);
      this.nextBatch = 0;
      if (this.handle !== null && this.scheduledAtMs !== null && this.batches[0]!.dueAtMs < this.scheduledAtMs) {
        this.scheduler.clearTimeout(this.handle);
        this.handle = null;
        this.scheduledAtMs = null;
      }
      this.scheduleNextBatch();
    }
  }

  private scheduleNextBatch() {
    if (!this.running || this.handle !== null) return;
    const batch = this.batches[this.nextBatch];
    if (!batch) {
      this.batches = [];
      this.nextBatch = 0;
      return;
    }
    this.scheduledAtMs = batch.dueAtMs;
    this.handle = this.scheduler.setTimeout(() => {
      this.handle = null;
      this.scheduledAtMs = null;
      const current = this.batches[this.nextBatch++];
      if (this.running && current) {
        const comments = [];
        for (const comment of current.comments) {
          if (!this.running) break;
          this.sent += 1;
          comments.push({
            eventId: comment.eventId,
            userId: comment.player.userId,
            displayName: comment.player.displayName,
            text: comment.text,
          });
        }
        this.adapter.emitBatch(comments);
      }
      if (this.nextBatch > 128 && this.nextBatch * 2 >= this.batches.length) {
        this.batches = this.batches.slice(this.nextBatch);
        this.nextBatch = 0;
      }
      this.scheduleNextBatch();
    }, Math.max(0, batch.dueAtMs - this.scheduler.now()));
  }

  stop() {
    this.running = false;
    if (this.handle !== null) this.scheduler.clearTimeout(this.handle);
    this.handle = null;
    this.scheduledAtMs = null;
    this.batches = [];
    this.nextBatch = 0;
  }
}

function mergeBatches(a: CommentBatch[], b: CommentBatch[]): CommentBatch[] {
  const merged: CommentBatch[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i]!.dueAtMs < b[j]!.dueAtMs) merged.push(a[i++]!);
    else if (a[i]!.dueAtMs > b[j]!.dueAtMs) merged.push(b[j++]!);
    else {
      const dueAtMs = a[i]!.dueAtMs;
      const comments = [...a[i++]!.comments, ...b[j++]!.comments];
      comments.sort((left, right) => left.originalDueAtMs - right.originalDueAtMs || left.order - right.order);
      merged.push({ dueAtMs, comments });
    }
  }
  while (i < a.length) merged.push(a[i++]!);
  while (j < b.length) merged.push(b[j++]!);
  return merged;
}
