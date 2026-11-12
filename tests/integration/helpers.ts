import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CommandBody, SessionConfig } from '@quiz/contracts';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { buildApp, type QuizApp } from '@quiz/server';

export const TOKEN = 'test-admin-token-0123456789abcdef';
export const AUTH = { authorization: `Bearer ${TOKEN}` };

/** Dùng build marker hợp lệ cho app tích hợp có web roots tạm, để preflight giống bản đã build. */
export function markCurrentWebBuild(...directories: string[]) {
  let commit = 'test-build-without-git';
  try {
    commit = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], {
      cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || commit;
  } catch {
    // Preflight cảnh báo khi không có Git, nhưng vẫn cần marker để không báo thiếu dist.
  }
  for (const directory of directories) writeFileSync(join(directory, '.build-commit'), `${commit}\n`);
}

/** Câu hỏi giả tối thiểu cho test tích hợp (độc lập với fixtures của làn Codex). */
export function makeQuestions(n: number, packId = 'demo') {
  const diffs = ['EASY', 'MEDIUM', 'HARD'] as const;
  return Array.from({ length: n }, (_, i) => ({
    id: `itq-${String(i + 1).padStart(3, '0')}`,
    packId,
    subtopicId: `${packId}-chung`,
    prompt: `Câu hỏi thử nghiệm số ${i + 1}?`,
    options: [1, 2, 3, 4].map((k) => ({ id: `o${k}`, text: `Đáp án ${k} của câu ${i + 1}` })),
    correctOptionId: `o${(i % 4) + 1}`,
    explanation: '',
    difficulty: diffs[i % 3]!,
    verificationStatus: 'DEMO' as const,
    approvalStatus: 'APPROVED' as const,
  }));
}

export function tempDbPath() {
  return join(mkdtempSync(join(tmpdir(), 'quiz-it-')), 'quiz.db');
}

export type Harness = {
  scheduler: ManualScheduler;
  store: Store;
  adapter: MockAdapter;
  quiz: QuizApp;
  sessionId: string;
};

export async function boot(opts: {
  dbPath?: string;
  scheduler?: ManualScheduler;
  questions?: number;
  seedQuestions?: boolean;
}): Promise<Omit<Harness, 'sessionId'>> {
  const scheduler = opts.scheduler ?? new ManualScheduler();
  const store = new Store(opts.dbPath ?? tempDbPath());
  if (opts.seedQuestions !== false)
    store.seedQuestions({ id: 'demo', name: 'Demo' }, makeQuestions(opts.questions ?? 40), scheduler.now());
  const adapter = new MockAdapter();
  const quiz = await buildApp({ store, scheduler, adminToken: TOKEN, adapterFactory: () => adapter });
  return { scheduler, store, adapter, quiz };
}

export async function createSession(
  h: Omit<Harness, 'sessionId'>,
  config: Partial<SessionConfig> = {},
): Promise<Harness> {
  const res = await h.quiz.app.inject({
    method: 'POST',
    url: '/api/sessions',
    headers: AUTH,
    payload: { name: 'Phiên test', config: { mode: 'MOCK', allowDemoQuestions: true, seed: 42, ...config } },
  });
  if (res.statusCode !== 201) throw new Error(`Tạo phiên lỗi ${res.statusCode}: ${res.body}`);
  // MockAdapter.connect là async: chờ một vòng microtask để trạng thái CONNECTED vào engine
  await Promise.resolve();
  return { ...h, sessionId: res.json().sessionId };
}

export function rt(h: Harness) {
  const r = h.quiz.runtime();
  if (!r) throw new Error('Không có runtime');
  return r;
}

export async function command(
  h: Harness,
  command: CommandBody,
  extra: { commandId?: string; expectedStateVersion?: number; headers?: Record<string, string> } = {},
) {
  const res = await h.quiz.app.inject({
    method: 'POST',
    url: `/api/sessions/${h.sessionId}/commands`,
    headers: extra.headers ?? AUTH,
    payload: {
      commandId: extra.commandId ?? randomUUID(),
      expectedStateVersion: extra.expectedStateVersion ?? rt(h).engine.stateVersion,
      operatorId: 'tester',
      requestedAtMs: h.scheduler.now(),
      command,
    },
  });
  return { status: res.statusCode, body: res.json() };
}

/** Tua đồng hồ ảo từng bước cho tới khi điều kiện đúng. */
export function runUntil(h: Harness, pred: () => boolean, stepMs = 100, maxMs = 3_600_000) {
  let spent = 0;
  while (!pred()) {
    if (spent >= maxMs) throw new Error(`runUntil quá ${maxMs} ms (state=${rt(h).engine.state})`);
    h.scheduler.advance(stepMs);
    spent += stepMs;
  }
}

/** Bản tính THAM CHIẾU ĐỘC LẬP (không dùng quiz-core) — chỉ từ bảng answers + round_questions. */
export function referenceScores(
  store: Store,
  roundId: string,
  opts: { mode?: 'KAHOOT' | 'CLASSIC'; speedBonusMax?: number; windowMs?: number } = {},
) {
  const mode = opts.mode ?? 'KAHOOT'; // khớp mặc định của phiên
  // Mặc định khớp cấu hình phiên mặc định: thưởng tốc độ tối đa 50, cửa sổ 15 s, tốc độ ×1.
  const speedMax = opts.speedBonusMax ?? 50;
  const windowMs = opts.windowMs ?? 15_000;
  const qs = store.raw
    .prepare('SELECT id, position, correct_option_id AS c, status, opened_at_ms AS openedAt FROM round_questions WHERE round_id = ? ORDER BY position')
    .all(roundId) as { id: string; position: number; c: string; status: string; openedAt: number | null }[];
  const ans = store.raw
    .prepare('SELECT question_instance_id AS q, player_id AS p, option_id AS o, received_at_ms AS at FROM answers WHERE round_id = ? ORDER BY id')
    .all(roundId) as { q: string; p: string; o: string; at: number }[];
  const answeredAt = new Map<string, number>();
  const pos = new Map(qs.map((q) => [q.id, q.position]));
  const byQ = new Map<string, Map<string, string>>();
  const joined = new Map<string, number>();
  for (const a of ans) {
    const m = byQ.get(a.q) ?? new Map<string, string>();
    byQ.set(a.q, m);
    if (!m.has(a.p)) {
      m.set(a.p, a.o);
      answeredAt.set(`${a.q}|${a.p}`, a.at);
    }
    const at = pos.get(a.q)!;
    joined.set(a.p, Math.min(joined.get(a.p) ?? Infinity, at));
  }
  const bonus: Record<number, number> = { 3: 30, 5: 50, 10: 100 };
  const out = new Map<string, { score: number; correct: number }>();
  const streak = new Map<string, number>();
  for (const p of joined.keys()) out.set(p, { score: 0, correct: 0 });
  for (const q of qs) {
    if (q.status !== 'CLOSED') continue; // VOIDED / PENDING / OPEN không tính
    for (const [p, j] of joined) {
      if (j > q.position) continue;
      const o = byQ.get(q.id)?.get(p);
      const t = out.get(p)!;
      if (o === q.c) {
        const s = (streak.get(p) ?? 0) + 1;
        streak.set(p, s);
        // thưởng tốc độ: tối đa speedMax, giảm tuyến tính theo thời gian server nhận (viết độc lập với quiz-core)
        let speed = 0;
        const at = answeredAt.get(`${q.id}|${p}`);
        if (speedMax > 0 && q.openedAt !== null && at !== undefined) {
          const left = Math.min(windowMs, Math.max(0, windowMs - (at - q.openedAt)));
          speed = Math.floor((speedMax * left) / windowMs);
        }
        if (mode === 'KAHOOT') {
          // Kahoot (viết độc lập): round(1000 × (1 − (t/T)/2)); không biết t → 500; chuỗi +100×(n−1) ≤ 500
          let pts = 500;
          if (q.openedAt !== null && at !== undefined) {
            const el = Math.min(windowMs, Math.max(0, at - q.openedAt));
            pts = Math.round((1000 * (2 * windowMs - el)) / (2 * windowMs));
          }
          t.score += pts + Math.min(500, 100 * (s - 1));
        } else t.score += 100 + speed + (bonus[s] ?? 0);
        t.correct += 1;
      } else streak.set(p, 0);
    }
  }
  return out;
}

export function storedScores(store: Store, roundId: string) {
  const rows = store.raw
    .prepare('SELECT player_id AS p, score, correct_count AS c FROM round_players WHERE round_id = ?')
    .all(roundId) as { p: string; score: number; c: number }[];
  return new Map(rows.map((r) => [r.p, { score: r.score, correct: r.c }]));
}

export function ledgerSums(store: Store, roundId: string) {
  return store.ledgerTotals(roundId);
}
