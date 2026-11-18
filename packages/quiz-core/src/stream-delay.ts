/** Safe initial estimate before enough accepted answers exist in a TikTok LIVE. */
export const DEFAULT_STREAM_DELAY_MS = 2_000;
export const MAX_STREAM_DELAY_MS = 6_000;
export const MIN_DISPLAY_MS = 500;
export const STREAM_DELAY_SAMPLE_LIMIT = 5;
export const STREAM_DELAY_SAFETY_MARGIN_MS = 1_000;

export function clampStreamDelayMs(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_STREAM_DELAY_MS;
  return Math.min(MAX_STREAM_DELAY_MS, Math.max(0, Math.round(value)));
}

/**
 * Estimate stream lag from the most recent correct first answers. The caller
 * provides newest-first samples; using the second-lowest value rejects one
 * implausibly fast guess. An empty sample set means there is no new estimate.
 */
export function estimateStreamDelayMs(rawElapsedSamples: readonly number[]): number | null {
  const samples = rawElapsedSamples
    .slice(0, STREAM_DELAY_SAMPLE_LIMIT)
    .filter((sample) => Number.isFinite(sample) && sample >= 0)
    .map(Math.round)
    .sort((a, b) => a - b);
  if (samples.length === 0) return null;
  const baseline = samples[samples.length === 1 ? 0 : 1]!;
  return clampStreamDelayMs(baseline - STREAM_DELAY_SAFETY_MARGIN_MS);
}

/** Display/scoring time; ranking order continues to use the raw server receipt time. */
export function effectiveElapsedMs(rawElapsedMs: number, streamDelayMs: number): number {
  const raw = Number.isFinite(rawElapsedMs) ? Math.round(rawElapsedMs) : 0;
  return Math.max(MIN_DISPLAY_MS, raw - clampStreamDelayMs(streamDelayMs));
}
