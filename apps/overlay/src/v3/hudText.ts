import type { CSSProperties } from 'react';

export function fitHudTextStyle(text: string, maxWidth: number, baseSize: number, minSize = 11): CSSProperties {
  const count = Math.max(1, [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(text)].length);
  const estimatedSize = maxWidth / (count * 0.62);
  return { maxWidth: `${maxWidth}px`, fontSize: `${Math.max(minSize, Math.min(baseSize, estimatedSize)).toFixed(1)}px` };
}

export function hudImageUrl(id: string | null, fallback: string): string {
  return id ? `/hud-assets/${encodeURIComponent(id)}` : fallback;
}
