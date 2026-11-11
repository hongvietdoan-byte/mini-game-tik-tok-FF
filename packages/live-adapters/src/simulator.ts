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
  private handles = new Set<unknown>();
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
    this.opts.players.forEach((p, i) => {
      if (r() < this.opts.noiseRate) this.at(r() * q.windowMs, p, NOISE[Math.floor(r() * NOISE.length)]!);
      if (r() >= this.opts.participation) return;
      const correct = r() < this.skill[i]!;
      const wrong = OPTIONS.filter((o) => o !== q.correctOptionId);
      const option = correct ? q.correctOptionId : wrong[Math.floor(r() * wrong.length)]!;
      const late = r() < 0.03;
      const delay = late ? q.windowMs + 20 + r() * 400 : q.windowMs * (0.03 + r() * 0.94);
      const text = FORMATS[Math.floor(r() * FORMATS.length)]!(option);
      const eventId = this.at(delay, p, text);
      // phát lại cùng một event (duplicate delivery từ nguồn)
      if (r() < 0.02) this.at(delay + 1, p, text, eventId);
      if (r() < this.opts.spamRate) {
        const extra = 1 + Math.floor(r() * 3);
        for (let k = 0; k < extra; k++)
          this.at(delay + 5 + r() * Math.max(0, q.windowMs - delay), p, OPTIONS[Math.floor(r() * 4)]!);
      }
    });
  }

  private at(delayMs: number, p: SimPlayer, text: string, eventId?: string) {
    const id = eventId ?? `sim-${++this.seq}`;
    const h = this.scheduler.setTimeout(
      () => {
        this.handles.delete(h);
        if (!this.running) return;
        this.sent += 1;
        this.adapter.emit({ eventId: id, userId: p.userId, displayName: p.displayName, text });
      },
      Math.max(0, delayMs),
    );
    this.handles.add(h);
    return id;
  }

  stop() {
    this.running = false;
    for (const h of this.handles) this.scheduler.clearTimeout(h);
    this.handles.clear();
  }
}
