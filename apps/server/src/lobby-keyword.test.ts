import { describe, expect, it } from 'vitest';
import { lobbyKeywordMatcher } from './lobby-keyword';

describe('lobby keyword', () => {
  const matches = lobbyKeywordMatcher('free fire');

  it.each([
    'free fire',
    'FreeFire',
    'free fire!!!',
    'FF FREE FIRE',
    '✨ FREE🔥FIRE ✨',
  ])('nhận biến thể %s', (text) => expect(matches(text)).toBe(true));

  it.each(['free', 'fire', 'A', 'B', 'freedom fire', 'free firearms', 'prefixfreefire', 'freefirex'])
    ('không nhận từ rời hoặc chuỗi dính chữ %s', (text) => expect(matches(text)).toBe(false));

  it('cho phép cấu hình có dấu và dấu câu mà vẫn khớp không phân biệt dấu', () => {
    expect(lobbyKeywordMatcher('Đấu-trường bão tố')('đấu trường, bão tố')).toBe(true);
  });
});
