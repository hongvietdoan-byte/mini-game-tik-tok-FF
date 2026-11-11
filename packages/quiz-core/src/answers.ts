import type { OptionId, RejectReason } from '@quiz/contracts';

/**
 * Chuẩn hoá NFKC → trim → uppercase, chỉ chấp nhận CHÍNH XÁC A|B|C|D.
 * Không dò chữ cái trong câu bất kỳ ("ANH" không phải là "A").
 */
export function parseAnswer(text: string): OptionId | null {
  if (typeof text !== 'string' || text.length > 16) return null;
  const n = text.normalize('NFKC').trim().toUpperCase();
  return n === 'A' || n === 'B' || n === 'C' || n === 'D' ? n : null;
}

export type AcceptWindow = {
  accepting: boolean;
  /** Bao gồm. */
  openAtMs: number;
  /** Loại trừ (end-exclusive). */
  deadlineMs: number;
};

export type WindowDecision = { ok: true; option: OptionId } | { ok: false; reason: RejectReason };

/**
 * Quyết định thuần tuý cho một comment đã được đóng dấu receivedAtMs tại biên server.
 * Thứ tự kiểm tra cố định để số liệu chẩn đoán ổn định.
 */
export function decideComment(
  input: { text: string; receivedAtMs: number; sourceTimestampMs?: number },
  window: AcceptWindow | null,
  opts: { maxSourceLagMs: number },
): WindowDecision {
  const option = parseAnswer(input.text);
  if (!option) return { ok: false, reason: 'NOT_AN_ANSWER' };
  if (!window || !window.accepting) return { ok: false, reason: 'NOT_ACCEPTING' };
  if (input.receivedAtMs < window.openAtMs) return { ok: false, reason: 'EARLY' };
  if (input.receivedAtMs >= window.deadlineMs) return { ok: false, reason: 'LATE' };
  if (input.sourceTimestampMs !== undefined) {
    // Sự kiện bị đệm từ trước khi câu hỏi mở, hoặc trễ quá ngưỡng → cách ly, không chấm.
    if (
      input.sourceTimestampMs < window.openAtMs ||
      input.receivedAtMs - input.sourceTimestampMs > opts.maxSourceLagMs
    )
      return { ok: false, reason: 'STALE_SOURCE_TIMESTAMP' };
  }
  return { ok: true, option };
}

/** Làm sạch tên hiển thị: chuỗi không tin cậy → bỏ ký tự điều khiển, gộp khoảng trắng, cắt độ dài. */
export function sanitizeDisplayName(raw: string, maxGraphemes = 24): string {
  const cleaned = String(raw ?? '')
    .normalize('NFC')
    // ký tự điều khiển, bidi override, zero-width
    .replace(/[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Người chơi';
  const graphemes = Array.from(new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(cleaned)).map(
    (s) => s.segment,
  );
  return graphemes.length <= maxGraphemes ? cleaned : graphemes.slice(0, maxGraphemes - 1).join('') + '…';
}
