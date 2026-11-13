/** Logic thuần cho bố cục V3 (test được không cần DOM). */

/** Màu tóc giữ chỗ ổn định theo characterId (cùng id → cùng màu). */
export function characterHue(characterId: string): number {
  let h = 2166136261;
  for (let i = 0; i < characterId.length; i++) h = Math.imul(h ^ characterId.charCodeAt(i), 16777619);
  const palette = [20, 35, 280, 330, 200, 0, 45, 260, 310, 180, 15, 225];
  return palette[(h >>> 0) % palette.length]!;
}

function graphemes(text: string): string[] {
  return Array.from(new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(text), (part) => part.segment);
}

function truncatedText(parts: string[], maxGraphemes: number, preferWordBoundary: boolean): string {
  let visible = parts.slice(0, Math.max(0, maxGraphemes)).join('');
  if (preferWordBoundary) {
    const lastWord = visible.match(/\s+\S*$/u);
    if (lastWord && lastWord.index! > 0) visible = visible.slice(0, lastWord.index);
  }
  return `${visible.trimEnd()}…`;
}

/** Cắt nội dung theo grapheme; tùy chọn lùi về ranh giới từ trước dấu ba chấm. */
export function truncateGraphemeText(text: string, maxGraphemes: number, preferWordBoundary = false): string {
  const parts = graphemes(text);
  return parts.length <= maxGraphemes ? text : truncatedText(parts, maxGraphemes, preferWordBoundary);
}

/** Rút gọn tên theo grapheme (emoji ghép không bị cắt đôi). */
export function shortName(name: string, max = 13): string {
  const trimmed = name.trim();
  const parts = graphemes(trimmed);
  return parts.length <= max ? parts.join('') : truncatedText(parts, max - 1, false);
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
