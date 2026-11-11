import { describe, expect, it } from 'vitest';
import { QuestionSchema, type Question } from '@quiz/contracts';
import { createPrng, isEligible, selectRound, snapshotQuestion } from './selection';

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
