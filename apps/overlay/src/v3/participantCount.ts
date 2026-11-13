const viInteger = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/** Giữ đủ dấu chấm dưới 10.000; số lớn rút gọn theo quy ước hiển thị tiếng Việt. */
export function formatParticipantCount(value: number): string {
  const count = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  if (count < 10_000) return viInteger.format(count);

  const divisor = count >= 1_000_000 ? 1_000_000 : 1_000;
  const suffix = divisor === 1_000_000 ? 'M' : 'K';
  const compact = count / divisor;
  const precision = compact < 100 ? 1 : 0;
  const factor = 10 ** precision;
  const truncated = Math.floor(compact * factor);
  const whole = Math.floor(truncated / factor);
  const fraction = truncated % factor;
  const number = fraction === 0 ? String(whole) : `${whole},${fraction}`;
  return `${number}${suffix}`;
}
