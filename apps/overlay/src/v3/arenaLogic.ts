/** Logic thuần cho bố cục V3 (test được không cần DOM). */

export const ANSWER_OPTION_IDS = ['A', 'B', 'C', 'D'] as const;
export type AnswerOptionId = typeof ANSWER_OPTION_IDS[number];

/** Làm tròn phân bố đáp án theo phần dư lớn nhất; hòa điểm theo A → D. */
export function answerPercentages(counts: Record<AnswerOptionId, number>): Record<AnswerOptionId, number> {
  const normalized = ANSWER_OPTION_IDS.map((id) => Math.max(0, Number.isFinite(counts[id]) ? counts[id] : 0));
  const total = normalized.reduce((sum, count) => sum + count, 0);
  const percentages = { A: 0, B: 0, C: 0, D: 0 };
  if (total <= 0) return percentages;

  const exact = normalized.map((count) => count ? (count / total) * 100 : 0);
  const whole = exact.map(Math.floor);
  for (let index = 0; index < ANSWER_OPTION_IDS.length; index += 1)
    percentages[ANSWER_OPTION_IDS[index]!] = whole[index]!;

  const remainder = 100 - whole.reduce((sum, value) => sum + value, 0);
  const tieOrder = ANSWER_OPTION_IDS.map((id, index) => ({ id, index, fraction: exact[index]! - whole[index]! }))
    .filter(({ index }) => normalized[index]! > 0)
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
  for (const { id } of tieOrder.slice(0, remainder)) percentages[id] += 1;
  return percentages;
}

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

const UNBREAKABLE_MC_PHRASES = [
  /Đấu\s+Trường\s+Bão\s+Tố/giu,
  /Đấu\s+Trường/giu,
  /Bão\s+Tố/giu,
  /Top\s+10/giu,
  /Free\s+Fire/giu,
  /MC\s+Kelly/giu,
  /Bình\s+luận/giu,
  /A\s*,\s*B\s*,\s*C\s+hoặc\s+D/giu,
] as const;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

export type McBubbleTextMetrics = {
  maxWidth: number;
  measureText: (text: string) => number;
};

function wrapSentenceGroups(line: string, metrics?: McBubbleTextMetrics): string {
  if (!metrics || metrics.maxWidth <= 0) return line;

  const sentences = line.split(/(?<=[.!?])\s+(?=\p{Lu})/u);
  if (sentences.length < 2 || sentences.some((sentence) => metrics.measureText(sentence) > metrics.maxWidth)) return line;

  const wrapped: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (current && metrics.measureText(candidate) > metrics.maxWidth) {
      wrapped.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }
  if (current) wrapped.push(current);
  return wrapped.join('\n');
}

/**
 * Chuẩn bị lời MC cho text-wrap: balance: chuẩn hoá khoảng trắng nhưng giữ newline đã biên tập,
 * ghép cụm quan trọng bằng NBSP và, khi có số đo thật, gom câu theo ranh giới dấu câu vừa khung.
 */
export function wrapMcBubbleText(
  text: string,
  playerNames: readonly string[] = [],
  metrics?: McBubbleTextMetrics,
): string {
  let output = text
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t ]+/gu, ' ').trim())
    .join('\n')
    .trim();

  for (const phrase of UNBREAKABLE_MC_PHRASES)
    output = output.replace(phrase, (match) => match.replace(/\s+/gu, '\u00a0'));

  output = output.replace(
    /(\d+(?:[.,]\d+)?)\s+(giây|phút|giờ|điểm|người|câu|vòng|lượt|ngày|tuần|tháng|năm|phần trăm)/giu,
    (_match, amount: string, unit: string) => `${amount}\u00a0${unit}`,
  );

  const names = [...new Set(playerNames.map((name) => name.trim()).filter(Boolean))]
    .filter((name) => /\s/u.test(name))
    .sort((left, right) => right.length - left.length);
  for (const name of names) {
    const words = name.split(/\s+/u).map(escapeRegExp);
    const phrase = new RegExp(`(?<![\\p{L}\\p{N}])${words.join('\\s+')}(?![\\p{L}\\p{N}])`, 'giu');
    output = output.replace(phrase, (match) => match.replace(/\s+/gu, '\u00a0'));
  }

  return output
    .split('\n')
    .map((line) => wrapSentenceGroups(line, metrics))
    .join('\n');
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
