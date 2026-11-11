/** Logic thuần cho bố cục V3 (test được không cần DOM). */

/** Màu tóc giữ chỗ ổn định theo characterId (cùng id → cùng màu). */
export function characterHue(characterId: string): number {
  let h = 2166136261;
  for (let i = 0; i < characterId.length; i++) h = Math.imul(h ^ characterId.charCodeAt(i), 16777619);
  const palette = [20, 35, 280, 330, 200, 0, 45, 260, 310, 180, 15, 225];
  return palette[(h >>> 0) % palette.length]!;
}

/** Rút gọn tên theo grapheme (emoji ghép không bị cắt đôi). */
export function shortName(name: string, max = 13): string {
  const g = Array.from(new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(name.trim()), (s) => s.segment);
  return g.length <= max ? g.join('') : `${g.slice(0, max - 1).join('')}…`;
}

/** Tách lời MC để tô vàng các chữ cái đáp án A/B/C/D đứng riêng (vd "Bình luận A/B/C/D để tham gia"). */
export function splitBubble(text: string): { text: string; hl: boolean }[] {
  const out: { text: string; hl: boolean }[] = [];
  const re = /(?<![\p{L}\p{N}])([ABCD](?:\s*[/,]\s*[ABCD])*)(?![\p{L}\p{N}])/gu;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index), hl: false });
    out.push({ text: m[0], hl: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), hl: false });
  return out;
}
