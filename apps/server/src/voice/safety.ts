/** Strict runtime deny-list: speech is rejected before a provider sees text. */
/** Tên/ID ngắn hơn ngưỡng này (vd "N", "ừ", "nk.") không dùng để chặn — tránh chặn nhầm mọi câu thoại. */
export const MIN_IDENTITY_MATCH_LENGTH = 4;

const WORD_CHAR = '[\\p{L}\\p{N}\\p{M}_]';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/** Chỉ chặn khi tên/ID xuất hiện thành cụm từ trọn vẹn (không phải chuỗi con của từ khác). */
export function containsPlayerIdentity(text: string, playerNamesAndIds: Iterable<string>): boolean {
  const fold = (value: string) => value.normalize('NFKC').toLocaleLowerCase('und').replace(/\s+/gu, ' ').trim();
  const spoken = fold(text);
  for (const identity of playerNamesAndIds) {
    const candidate = fold(identity);
    // Lọc rẻ trước: regex chỉ khớp khi chuỗi con có mặt; tránh dựng hàng nghìn RegExp cho mỗi câu
    // (khôi phục phiên ~4.000 người từng làm server treo nhiều phút lúc khởi động).
    if (!candidate || !spoken.includes(candidate)) continue;
    if ([...candidate.replace(/[^\p{L}\p{N}]/gu, '')].length < MIN_IDENTITY_MATCH_LENGTH) continue;
    const pattern = new RegExp(`(?<!${WORD_CHAR})${escapeRegex(candidate)}(?!${WORD_CHAR})`, 'u');
    if (pattern.test(spoken)) return true;
  }
  return false;
}
