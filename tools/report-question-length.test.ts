import { describe, expect, it } from 'vitest';
import { estimateDurationMs, median, proposeShortenedPrompt, rankQuestions, renderMarkdown, type QuestionResult } from './report-question-length';

function result(id: string, groups: string[], durationMs: number | null, fontPx = 32): QuestionResult {
  const offCenter = groups.includes('Prompt chưa căn giữa');
  const metric = { fontPx, lineHeightPx: 36, lines: 2, maxLines: null, truncated: groups.includes('Prompt bị clamp'), visibleText: 'Câu hỏi?', fullText: 'Câu hỏi?', scrollWidth: 100, clientWidth: 100, scrollHeight: 40, clientHeight: 40, lineBoxOverflowPx: 0, overflowX: 'visible', overflowY: 'visible', centered: !offCenter, topGapPx: offCenter ? 12 : 20, bottomGapPx: offCenter ? 28 : 20 };
  const answer = { fontPx: 24, lineHeightPx: 27, lines: 1, maxLines: 2, truncated: groups.includes('Đáp án bị cắt'), visibleText: 'A', fullText: 'A', scrollWidth: 20, clientWidth: 20, scrollHeight: 24, clientHeight: 24, lineBoxOverflowPx: 0, overflowX: 'visible', overflowY: 'visible' };
  return {
    id, topic: 'Free Fire', prompt: `Câu hỏi ${id}?`, options: ['A', 'B', 'C', 'D'].map((letter) => ({ id: letter, text: `Đáp án ${letter}` })),
    correctOptionId: 'A', promptChars: 12, answerChars: [9, 9, 9, 9],
    metrics: {
      question: metric, reveal: { ...metric },
      answers: Object.fromEntries(['A', 'B', 'C', 'D'].map((letter) => [letter, { question: answer, reveal: { ...answer } }])),
    },
    durationMs, durationEstimated: durationMs !== null, slowRateCps: 4, groups,
  };
}

describe('question length report helpers', () => {
  it('uses the median cached speaking rate, including an even-sized sample', () => {
    expect(median([6, 2, 4, 8])).toBe(5);
    expect(median([])).toBeNull();
    expect(estimateDurationMs(21, 4)).toBe(5_250);
    expect(estimateDurationMs(20, null)).toBeNull();
  });

  it('ranks clamp before clipped answers, small fonts, and long readings', () => {
    const long = result('slow', ['Ước lượng đọc trên 20 giây'], 21_000);
    const small = result('small', ['Cỡ chữ dưới 30 px'], 10_000, 28);
    const clipped = result('cut', ['Đáp án bị cắt'], 10_000);
    const clamped = result('clamp', ['Prompt bị clamp'], 10_000);
    expect(rankQuestions([long, small, clipped, clamped]).map(({ id }) => id)).toEqual(['clamp', 'cut', 'small', 'slow']);
  });

  it('renders totals, original text, scene metrics, and clearly pending suggestions', () => {
    const item = result('q-1', ['Prompt bị clamp'], 25_000);
    const markdown = renderMarkdown([item], { approved: 1, clamp: 1, small: 0, slow: 1, answerCuts: 0 }, { 'q-1': ['Trong Free Fire, đội cần làm gì?'] }, 4.2);
    expect(markdown).toContain('Tổng câu APPROVED: **1**');
    expect(markdown).toContain('Prompt căn giữa dọc đạt: **1/1**; không đạt: **0**.');
    expect(markdown).toContain('ĐỀ XUẤT — chờ người dùng duyệt');
    expect(markdown).toContain('Câu hỏi q-1?');
    expect(markdown).toContain('32px/2 dòng');
    expect(markdown).toContain('Căn giữa QUESTION (đạt / không; mép trên / dưới)');
    expect(markdown).toContain('Đạt (20.0 / 20.0 px)');
    expect(markdown).toContain('25.0 s');
    expect(markdown).toContain('Tràn line-box chung');
    expect(markdown).toContain('0/4');
  });

  it('flags prompt centering failures in the report groups', () => {
    const markdown = renderMarkdown([result('q-off-center', ['Prompt chưa căn giữa'], null)], { approved: 1, clamp: 0, small: 0, slow: 0, answerCuts: 0 });
    expect(markdown).toContain('Prompt chưa căn giữa');
    expect(markdown).toContain('Không (12.0 / 28.0 px)');
  });

  it('does not suggest blind truncation when no safe phrase compression matches', () => {
    expect(proposeShortenedPrompt('Hãy hạ gục đối thủ bằng vũ khí yêu thích?')).toBe('Hãy hạ gục đối thủ bằng vũ khí yêu thích?');
  });
});
