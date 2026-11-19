import { describe, expect, it } from 'vitest';
import { answerPercentages, characterHue, shortName, splitBubble, truncateGraphemeText, wrapMcBubbleText, wrapPromptToLines } from './arenaLogic';

describe('V3 arena logic', () => {
  it('phân bố phần trăm đáp án tổng đúng 100%, hòa theo A→D và không cộng cho ô 0', () => {
    expect(answerPercentages({ A: 1, B: 1, C: 1, D: 0 })).toEqual({ A: 34, B: 33, C: 33, D: 0 });
    expect(answerPercentages({ A: 1, B: 2, C: 0, D: 2 })).toEqual({ A: 20, B: 40, C: 0, D: 40 });
    expect(answerPercentages({ A: 2, B: 1, C: 0, D: 0 })).toEqual({ A: 67, B: 33, C: 0, D: 0 });
    expect(answerPercentages({ A: 0, B: 0, C: 0, D: 0 })).toEqual({ A: 0, B: 0, C: 0, D: 0 });
  });

  it('giữ tổng 100% với 1.000 phân bố tất định và luôn giữ ô không đáp án ở 0%', () => {
    let seed = 0x26_04_2026;
    const randomCount = () => {
      seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
      return seed % 100_000;
    };
    for (let sample = 0; sample < 1_000; sample += 1) {
      const counts = { A: randomCount(), B: randomCount(), C: randomCount(), D: randomCount() };
      const percentages = answerPercentages(counts);
      expect(Object.values(percentages).reduce((sum, value) => sum + value, 0), `sample ${sample}`).toBe(100);
      for (const id of ['A', 'B', 'C', 'D'] as const) {
        if (counts[id] === 0) expect(percentages[id], `sample ${sample}/${id}`).toBe(0);
      }
    }
  });

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

  it('cắt nội dung theo grapheme và ưu tiên ranh giới từ khi có thể', () => {
    const family = '👨‍👩‍👧‍👦';
    expect(truncateGraphemeText(`abc${family}def`, 4)).toBe(`abc${family}…`);
    expect(truncateGraphemeText('Free Fire có nhiều chiến thuật', 12, true)).toBe('Free Fire…');
    expect(truncateGraphemeText('khongcocho', 5, true)).toBe('khong…');
    expect(truncateGraphemeText('Free Fire', 9, true)).toBe('Free Fire');
  });

  it('rút gọn prompt theo chiều rộng đo được và giữ dấu ba chấm trong dòng cuối', () => {
    const measure = (value: string) => Array.from(value).length * 10;
    expect(wrapPromptToLines('Alpha beta gamma', 50, 2, measure)).toEqual({
      text: 'Alpha\nbeta…', lineCount: 2, truncated: true,
    });
    expect(wrapPromptToLines('Free Fire có 4 người', 200, 3, measure)).toEqual({
      text: 'Free Fire có 4 người', lineCount: 1, truncated: false,
    });
    expect(wrapPromptToLines('A👨‍👩‍👧‍👦BC D', 30, 1, measure).text).toBe('A…');
  });

  it('không để dấu ba chấm thành một dòng riêng khi dòng cuối bị trống', () => {
    const layout = wrapPromptToLines('Alpha\n\nbeta gamma', 60, 2, (value) => Array.from(value).length * 10);
    expect(layout).toEqual({ text: 'Alpha…', lineCount: 1, truncated: true });
    expect(layout.text.split('\n').at(-1)).toMatch(/.+…$/u);
  });

  it('giữ nguyên newline biên tập và ghép cụm MC quan trọng để text-wrap không xé đôi', () => {
    expect(wrapMcBubbleText('CHÀO MỪNG ĐẾN VỚI\r\nĐẤU TRƯỜNG BÃO TỐ!')).toBe(
      'CHÀO MỪNG ĐẾN VỚI\nĐẤU\u00a0TRƯỜNG\u00a0BÃO\u00a0TỐ!',
    );
    expect(wrapMcBubbleText('Top 10 · Free Fire · MC Kelly · 1,2 giây · A, B, C hoặc D · Hồ Anh Tuấn', ['Hồ Anh Tuấn']))
      .toBe('Top\u00a010 · Free\u00a0Fire · MC\u00a0Kelly · 1,2\u00a0giây · A,\u00a0B,\u00a0C\u00a0hoặc\u00a0D · Hồ\u00a0Anh\u00a0Tuấn');
    expect(wrapMcBubbleText('20 giây, 1.200 điểm, 2 người')).toBe('20\u00a0giây, 1.200\u00a0điểm, 2\u00a0người');
    expect(wrapMcBubbleText('Chọn đáp án ngay! Bình luận A, B, C hoặc D')).toBe(
      'Chọn đáp án ngay! Bình\u00a0luận A,\u00a0B,\u00a0C\u00a0hoặc\u00a0D',
    );
    expect(wrapMcBubbleText('Câu ngắn!\nCâu sau, vẫn giữ nhịp.')).toBe('Câu ngắn!\nCâu sau, vẫn giữ nhịp.');
  });

  it('ưu tiên ngắt sau dấu câu khi các vế vừa dòng và không ép ngắt vế quá dài', () => {
    const metrics = { maxWidth: 400, measureText: (value: string) => Array.from(value).length * 10 };
    expect(wrapMcBubbleText('Chính xác! Đáp án B. Cùng xem bảng xếp hạng nhé!', [], metrics)).toBe(
      'Chính xác! Đáp án B.\nCùng xem bảng xếp hạng nhé!',
    );
    expect(wrapMcBubbleText('Sẵn sàng nhé! Câu hỏi Free Fire sắp bắt đầu.', [], metrics)).toBe(
      'Sẵn sàng nhé!\nCâu hỏi Free\u00a0Fire sắp bắt đầu.',
    );
    expect(wrapMcBubbleText('Ngắt sau câu. Vế sau vẫn đủ ngắn.', [], { ...metrics, maxWidth: 700 })).toBe(
      'Ngắt sau câu. Vế sau vẫn đủ ngắn.',
    );
    expect(wrapMcBubbleText('Câu mở đầu. Một vế câu rất dài không thể nằm trọn trên một dòng.', [], metrics)).toBe(
      'Câu mở đầu. Một vế câu rất dài không thể nằm trọn trên một dòng.',
    );
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
