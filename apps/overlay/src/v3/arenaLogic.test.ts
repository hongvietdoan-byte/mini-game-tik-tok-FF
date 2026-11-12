import { describe, expect, it } from 'vitest';
import { characterHue, shortName, splitBubble } from './arenaLogic';

describe('V3 arena logic', () => {
  it('màu nhân vật giữ chỗ ổn định theo characterId', () => {
    expect(characterHue('chibi-01')).toBe(characterHue('chibi-01'));
    const hues = new Set(Array.from({ length: 12 }, (_, i) => characterHue(`chibi-${i + 1}`)));
    expect(hues.size).toBeGreaterThan(3);
  });

  it('rút gọn tên theo grapheme, không cắt đôi emoji ghép', () => {
    expect(shortName('StormKing', 13)).toBe('StormKing');
    expect(shortName('TEENHAYQUAYCUOPNHE', 13)).toBe('TEENHAYQUAYC…');
    expect(shortName('TênNgườiChơi'.repeat(4), 16)).toBe('TênNgườiChơiTên…');
    const family = '👨‍👩‍👧‍👦';
    expect(shortName(`abcdefghijkl${family}xyz`, 13)).toBe('abcdefghijkl…');
    expect(shortName(`abcdefghijk${family}`, 13)).toBe(`abcdefghijk${family}`);
  });

  it('tô vàng đúng các chữ cái đáp án đứng riêng, không tô chữ cái trong từ', () => {
    expect(splitBubble('Bình luận A, B, C hoặc D để tham gia')).toEqual([
      { text: 'Bình luận ', hl: false },
      { text: 'A, B, C', hl: true },
      { text: ' hoặc ', hl: false },
      { text: 'D', hl: true },
      { text: ' để tham gia', hl: false },
    ]);
    expect(splitBubble('Đáp án đúng là B!')).toEqual([
      { text: 'Đáp án đúng là ', hl: false },
      { text: 'B', hl: true },
      { text: '!', hl: false },
    ]);
    expect(splitBubble('Cùng xem bảng xếp hạng!').every((p) => !p.hl)).toBe(true);
    expect(splitBubble('ABC Arena').every((p) => !p.hl)).toBe(true);
  });
});
