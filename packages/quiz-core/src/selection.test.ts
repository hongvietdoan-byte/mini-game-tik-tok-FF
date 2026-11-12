import { describe, expect, it, vi } from 'vitest';
import { QuestionSchema, type Question } from '@quiz/contracts';
import { createPrng, isEligible, planPreferredDifficultyCounts, selectRound, snapshotQuestion } from './selection';

function question(index: number, overrides: Record<string, unknown> = {}): Question {
  return QuestionSchema.parse({
    id: `q${String(index).padStart(3, '0')}`,
    packId: 'demo',
    subtopicId: 'general',
    prompt: `Câu hỏi ${index}?`,
    options: [
      { id: 'o1', text: 'Đáp án một' }, { id: 'o2', text: 'Đáp án hai' },
      { id: 'o3', text: 'Đáp án ba' }, { id: 'o4', text: 'Đáp án bốn' },
    ],
    correctOptionId: 'o2',
    explanation: 'Giải thích ngắn.',
    difficulty: 'EASY',
    tags: [],
    sourceRefs: [],
    verificationStatus: 'VERIFIED',
    approvalStatus: 'APPROVED',
    ...overrides,
  });
}

function request(pool: Question[], overrides: Partial<Parameters<typeof selectRound>[0]> = {}) {
  return {
    roundId: 'round-7', seed: 42, count: 4, pool, usedInSession: new Set<string>(),
    allowDemo: false, allowReuse: false, nowMs: 100,
    ...overrides,
  };
}

describe('createPrng', () => {
  it('cùng seed tạo cùng chuỗi trong [0,1)', () => {
    const a = createPrng(1234);
    const b = createPrng(1234);
    const c = createPrng(1235);
    const valuesA = Array.from({ length: 100 }, () => a());
    expect(Array.from({ length: 100 }, () => b())).toEqual(valuesA);
    expect(valuesA.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(valuesA).not.toEqual(Array.from({ length: 100 }, () => c()));
  });
});

describe('isEligible', () => {
  it('chỉ cho APPROVED cùng VERIFIED hoặc OPERATOR_VERIFIED; DEMO cần allowDemo', () => {
    expect(isEligible(question(1), { allowDemo: false, nowMs: 10 })).toBe(true);
    expect(isEligible(question(2, { verificationStatus: 'OPERATOR_VERIFIED' }), { allowDemo: false, nowMs: 10 })).toBe(true);
    expect(isEligible(question(3, { verificationStatus: 'DEMO' }), { allowDemo: false, nowMs: 10 })).toBe(false);
    expect(isEligible(question(4, { verificationStatus: 'DEMO' }), { allowDemo: true, nowMs: 10 })).toBe(true);
    expect(isEligible(question(5, { verificationStatus: 'UNVERIFIED' }), { allowDemo: true, nowMs: 10 })).toBe(false);
    expect(isEligible(question(6, { approvalStatus: 'PENDING_REVIEW' }), { allowDemo: true, nowMs: 10 })).toBe(false);
  });

  it('validFrom bao gồm biên; validUntil loại trừ biên', () => {
    const q = question(1, { validFrom: 10, validUntil: 20 });
    expect(isEligible(q, { allowDemo: false, nowMs: 9 })).toBe(false);
    expect(isEligible(q, { allowDemo: false, nowMs: 10 })).toBe(true);
    expect(isEligible(q, { allowDemo: false, nowMs: 19 })).toBe(true);
    expect(isEligible(q, { allowDemo: false, nowMs: 20 })).toBe(false);
  });
});

describe('selectRound', () => {
  it('cùng seed/pool cho cùng snapshots dù đảo thứ tự pool; seed khác đổi thứ tự chọn', () => {
    const pool = Array.from({ length: 12 }, (_, index) => question(index + 1));
    const result = selectRound(request(pool));
    const reversed = selectRound(request([...pool].reverse()));
    const otherSeed = selectRound(request(pool, { seed: 43 }));
    expect(result.ok).toBe(true);
    expect(reversed).toEqual(result);
    expect(otherSeed.ok).toBe(true);
    if (result.ok && otherSeed.ok) expect(otherSeed.snapshots.map((item) => item.questionId)).not.toEqual(result.snapshots.map((item) => item.questionId));
  });

  it('không lặp câu trong vòng và ưu tiên câu chưa dùng trong phiên', () => {
    const pool = Array.from({ length: 8 }, (_, index) => question(index + 1));
    const result = selectRound(request(pool, { count: 4, usedInSession: new Set(['q001', 'q002', 'q003', 'q004']) }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(new Set(result.snapshots.map((item) => item.questionId)).size).toBe(4);
      expect(result.snapshots.every((item) => !['q001', 'q002', 'q003', 'q004'].includes(item.questionId))).toBe(true);
    }
  });

  it('ưu tiên câu trong ngưỡng và cảnh báo TOO_LONG khi phải lấy câu dài', () => {
    const pool = [
      question(1),
      question(2),
      question(3, { prompt: 'x'.repeat(111) }),
      question(4, { options: [
        { id: 'o1', text: 'y'.repeat(29) },
        { id: 'o2', text: 'Đáp án hai' },
        { id: 'o3', text: 'Đáp án ba' },
        { id: 'o4', text: 'Đáp án bốn' },
      ] }),
    ];
    const onWarning = vi.fn();
    const result = selectRound(request(pool, { count: 3, onWarning }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      const ids = result.snapshots.map((snapshot) => snapshot.questionId);
      expect(ids).toContain('q001');
      expect(ids).toContain('q002');
      const selectedLong = ids.filter((id) => id === 'q003' || id === 'q004');
      expect(selectedLong).toHaveLength(1);
      expect(onWarning).toHaveBeenCalledWith({ code: 'TOO_LONG', questionIds: selectedLong });
    }
  });

  it('không dùng câu dài khi đã đủ câu ngắn', () => {
    const pool = [question(1), question(2), question(3), question(4, { prompt: 'x'.repeat(111) })];
    const onWarning = vi.fn();
    const result = selectRound(request(pool, { count: 3, onWarning }));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.snapshots.every((snapshot) => snapshot.questionId !== 'q004')).toBe(true);
    expect(onWarning).not.toHaveBeenCalled();
  });

  it('trả đủ eligible/unused/required khi thiếu câu và reuse không được phép', () => {
    const pool = Array.from({ length: 5 }, (_, index) => question(index + 1));
    expect(selectRound(request(pool, { count: 4, usedInSession: new Set(['q001', 'q002', 'q003']) }))).toEqual({
      ok: false, code: 'INSUFFICIENT_QUESTIONS', eligible: 5, unused: 2, required: 4,
    });
  });

  it('cho phép reuse có chủ đích, chọn câu đã dùng ít gần đây trước và báo đúng ids', () => {
    const pool = [
      question(1, { lastUsedAt: 100 }), question(2, { lastUsedAt: 50 }),
      question(3, { lastUsedAt: 10 }), question(4, { lastUsedAt: 20 }),
    ];
    const result = selectRound(request(pool, { count: 3, usedInSession: new Set(['q001', 'q002', 'q003']), allowReuse: true }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reusedQuestionIds).toEqual(['q003', 'q002']);
      expect(result.snapshots).toHaveLength(3);
      expect(result.snapshots.some((snapshot) => snapshot.questionId === 'q004')).toBe(true);
    }
  });

  it('co giãn mục tiêu 7/5/3 theo số câu và chọn đủ mục tiêu khi kho có đủ ba mức', () => {
    const pool = [
      ...Array.from({ length: 20 }, (_, index) => question(index + 1, { difficulty: 'EASY' })),
      ...Array.from({ length: 20 }, (_, index) => question(index + 21, { difficulty: 'MEDIUM' })),
      ...Array.from({ length: 20 }, (_, index) => question(index + 41, { difficulty: 'HARD' })),
    ];
    const ten = selectRound(request(pool, { count: 10, selectionMode: 'DIFFICULTY' }));
    const fifteen = selectRound(request(pool, { count: 15, selectionMode: 'DIFFICULTY' }));
    const twenty = selectRound(request(pool, { count: 20, selectionMode: 'DIFFICULTY' }));

    expect(ten).toMatchObject({ ok: true, targetDifficultyCounts: { EASY: 5, MEDIUM: 3, HARD: 2 } });
    expect(fifteen).toMatchObject({ ok: true, targetDifficultyCounts: { EASY: 7, MEDIUM: 5, HARD: 3 } });
    expect(twenty).toMatchObject({ ok: true, targetDifficultyCounts: { EASY: 9, MEDIUM: 7, HARD: 4 } });
    if (fifteen.ok) {
      expect(fifteen.difficultyCounts).toEqual({ EASY: 7, MEDIUM: 5, HARD: 3 });
      expect(fifteen.snapshots.map((snapshot) => snapshot.difficulty)).toEqual([
        ...Array(7).fill('EASY'), ...Array(5).fill('MEDIUM'), ...Array(3).fill('HARD'),
      ]);
    }
  });

  it('bù mức thiếu từ mức gần nhất, luôn đủ tổng nếu kho chưa dùng còn đủ', () => {
    const pool = [
      ...Array.from({ length: 2 }, (_, index) => question(index + 1, { difficulty: 'EASY' })),
      ...Array.from({ length: 30 }, (_, index) => question(index + 3, { difficulty: 'MEDIUM' })),
    ];
    const result = selectRound(request(pool, { count: 15, selectionMode: 'DIFFICULTY' }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshots).toHaveLength(15);
      expect(result.difficultyCounts).toEqual({ EASY: 2, MEDIUM: 13, HARD: 0 });
      expect(result.snapshots.every((snapshot) => snapshot.difficulty !== 'HARD')).toBe(true);
    }
  });

  it('chỉ từ chối khi tổng câu chưa dùng không đủ; thiếu một mức không tự gây lỗi', () => {
    const pool = Array.from({ length: 3 }, (_, index) => question(index + 1, { difficulty: 'MEDIUM' }));
    expect(selectRound(request(pool, { count: 4, selectionMode: 'DIFFICULTY' }))).toMatchObject({
      ok: false, code: 'INSUFFICIENT_QUESTIONS', eligible: 3, unused: 3, required: 4,
    });
  });

  it('giữ thứ tự dễ → vừa → khó, ưu tiên câu ngắn, seed lặp lại cho cùng lựa chọn', () => {
    const pool = [
      ...Array.from({ length: 12 }, (_, index) => question(index + 1, { difficulty: 'EASY' })),
      question(13, { difficulty: 'EASY', prompt: 'x'.repeat(111) }),
      ...Array.from({ length: 12 }, (_, index) => question(index + 14, { difficulty: 'MEDIUM' })),
      ...Array.from({ length: 12 }, (_, index) => question(index + 26, { difficulty: 'HARD' })),
    ];
    const options = { count: 15, selectionMode: 'DIFFICULTY' as const };
    const first = selectRound(request(pool, options));
    const repeated = selectRound(request(pool, options));
    const otherSeed = selectRound(request(pool, { ...options, seed: 43 }));

    expect(repeated).toEqual(first);
    expect(otherSeed).not.toEqual(first);
    if (first.ok) {
      expect(first.snapshots.map((snapshot) => snapshot.difficulty)).toEqual([
        ...Array(7).fill('EASY'), ...Array(5).fill('MEDIUM'), ...Array(3).fill('HARD'),
      ]);
      expect(first.snapshots.some((snapshot) => snapshot.questionId === 'q013')).toBe(false);
    }
  });

  it('không chọn câu dài nếu câu ngắn ở mức khác đã đủ tổng vòng', () => {
    const pool = [
      ...Array.from({ length: 20 }, (_, index) => question(index + 1, {
        difficulty: 'EASY', prompt: `Câu dài ${index + 1}: ${'nội dung '.repeat(15)}`,
      })),
      ...Array.from({ length: 10 }, (_, index) => question(index + 21, { difficulty: 'MEDIUM' })),
      ...Array.from({ length: 10 }, (_, index) => question(index + 31, { difficulty: 'HARD' })),
    ];
    const onWarning = vi.fn();
    const result = selectRound(request(pool, { count: 15, selectionMode: 'DIFFICULTY', onWarning }));
    const preview = planPreferredDifficultyCounts(pool, 15);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshots.every((snapshot) => snapshot.difficulty !== 'EASY')).toBe(true);
      expect(result.difficultyCounts).toEqual(preview.counts);
    }
    expect(onWarning).not.toHaveBeenCalled();
  });

  it('không lặp câu trong sáu vòng 15 câu khi kho có đủ 90 câu', () => {
    const pool = [
      ...Array.from({ length: 42 }, (_, index) => question(index + 1, { difficulty: 'EASY' })),
      ...Array.from({ length: 30 }, (_, index) => question(index + 43, { difficulty: 'MEDIUM' })),
      ...Array.from({ length: 18 }, (_, index) => question(index + 73, { difficulty: 'HARD' })),
    ];
    const used = new Set<string>();

    for (let round = 0; round < 6; round += 1) {
      const result = selectRound(request(pool, {
        count: 15,
        seed: 100 + round,
        roundId: `round-${round + 1}`,
        selectionMode: 'DIFFICULTY',
        usedInSession: used,
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.snapshots).toHaveLength(15);
      for (const snapshot of result.snapshots) {
        expect(used.has(snapshot.questionId)).toBe(false);
        used.add(snapshot.questionId);
      }
    }
    expect(used.size).toBe(90);
  });

  it('ánh xạ đáp án đúng qua hoán vị trong 500 seed, id A..D và demo metadata', () => {
    const q = question(1, { verificationStatus: 'DEMO' });
    const correctIds = [];
    for (let seed = 0; seed < 500; seed += 1) {
      const snapshot = snapshotQuestion(q, 0, 'r', createPrng(seed));
      expect(snapshot.options.map((option) => option.id)).toEqual(['A', 'B', 'C', 'D']);
      const correct = snapshot.options.find((option) => option.id === snapshot.correctOptionId);
      expect(correct?.originalOptionId).toBe(q.correctOptionId);
      expect(snapshot.isDemo).toBe(true);
      expect(snapshot.questionInstanceId).toBe('r:q01');
      correctIds.push(snapshot.correctOptionId);
    }
    expect(new Set(correctIds).size).toBeGreaterThan(1);
  });
});
