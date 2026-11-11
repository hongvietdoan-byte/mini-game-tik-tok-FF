import { describe, expect, it } from 'vitest';
import { decideComment, parseAnswer, sanitizeDisplayName } from './answers';

describe('parseAnswer', () => {
  it.each([
    ['A', 'A'], ['b', 'B'], ['  c ', 'C'], ['D\n', 'D'],
    ['Ａ', 'A'], ['Ｂ', 'B'], ['Ｃ', 'C'], ['Ｄ', 'D'],
  ])('chấp nhận chính xác %j → %s', (input, expected) => {
    expect(parseAnswer(input)).toBe(expected);
  });

  it.each(['đáp án A', 'AA', 'A B', '!A', 'B.', 'E', '', '😀', 'A'.repeat(17)])(
    'từ chối %j vì không phải một đáp án chính xác',
    (input) => expect(parseAnswer(input)).toBeNull(),
  );
});

describe('decideComment', () => {
  const accepting = { accepting: true, openAtMs: 100, deadlineMs: 200 } as const;

  it('xét thứ tự từ chối NOT_AN_ANSWER → NOT_ACCEPTING → EARLY → LATE → STALE', () => {
    expect(decideComment({ text: 'x', receivedAtMs: 50 }, null, { maxSourceLagMs: 5 })).toEqual({ ok: false, reason: 'NOT_AN_ANSWER' });
    expect(decideComment({ text: 'A', receivedAtMs: 50 }, null, { maxSourceLagMs: 5 })).toEqual({ ok: false, reason: 'NOT_ACCEPTING' });
    expect(decideComment({ text: 'A', receivedAtMs: 50 }, accepting, { maxSourceLagMs: 5 })).toEqual({ ok: false, reason: 'EARLY' });
    expect(decideComment({ text: 'A', receivedAtMs: 200 }, accepting, { maxSourceLagMs: 5 })).toEqual({ ok: false, reason: 'LATE' });
    expect(decideComment({ text: 'A', receivedAtMs: 120, sourceTimestampMs: 99 }, accepting, { maxSourceLagMs: 5 })).toEqual({ ok: false, reason: 'STALE_SOURCE_TIMESTAMP' });
  });

  it('chấp nhận openAtMs, từ chối deadlineMs và chấp nhận deadlineMs - 1', () => {
    expect(decideComment({ text: 'A', receivedAtMs: 100 }, accepting, { maxSourceLagMs: 10 })).toEqual({ ok: true, option: 'A' });
    expect(decideComment({ text: 'B', receivedAtMs: 199 }, accepting, { maxSourceLagMs: 10 })).toEqual({ ok: true, option: 'B' });
    expect(decideComment({ text: 'C', receivedAtMs: 200 }, accepting, { maxSourceLagMs: 10 })).toEqual({ ok: false, reason: 'LATE' });
  });

  it('chặn timestamp trước open và quá trễ, nhưng nhận đúng ngưỡng trễ tối đa', () => {
    expect(decideComment({ text: 'A', receivedAtMs: 120, sourceTimestampMs: 99 }, accepting, { maxSourceLagMs: 10 })).toEqual({ ok: false, reason: 'STALE_SOURCE_TIMESTAMP' });
    expect(decideComment({ text: 'A', receivedAtMs: 120, sourceTimestampMs: 109 }, accepting, { maxSourceLagMs: 10 })).toEqual({ ok: false, reason: 'STALE_SOURCE_TIMESTAMP' });
    expect(decideComment({ text: 'A', receivedAtMs: 120, sourceTimestampMs: 110 }, accepting, { maxSourceLagMs: 10 })).toEqual({ ok: true, option: 'A' });
  });
});

describe('sanitizeDisplayName', () => {
  it('bỏ control, bidi, zero-width space và gộp khoảng trắng', () => {
    expect(sanitizeDisplayName('  An\u0000\u202e\u200b   Bình  ')).toBe('An Bình');
    expect(sanitizeDisplayName(' \n\t ')).toBe('Người chơi');
  });

  it('cắt theo grapheme và thêm dấu ba chấm, không tách emoji ZWJ', () => {
    expect(sanitizeDisplayName('A'.repeat(30), 8)).toBe('AAAAAAA…');
  });

  it('bỏ ZWJ đứng lẻ nhưng giữ ZWJ nối emoji có tông da / VS16', () => {
    expect(sanitizeDisplayName('a\u200Db')).toBe('ab');
    expect(sanitizeDisplayName('\u200D\u200DAn')).toBe('An');
    const coder = '\u{1F469}\u{1F3FD}\u200D\u{1F4BB}';
    expect(sanitizeDisplayName(coder)).toBe(coder);
    const heartFire = '\u2764\uFE0F\u200D\u{1F525}';
    expect(sanitizeDisplayName(heartFire)).toBe(heartFire);
  });

  // Hồi quy X-0008: trước đây sanitizer xoá U+200D làm vỡ emoji gia đình (đã sửa).
  it('giữ nguyên emoji gia đình ZWJ khi chuỗi bị cắt', () => {
    expect(sanitizeDisplayName('12345👨‍👩‍👧‍👦XYZ', 7)).toBe('12345👨‍👩‍👧‍👦…');
  });
});
