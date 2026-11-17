import { McVoiceCueSchema, type McVoiceCue } from '@quiz/contracts';

export const MC_COUNTDOWN_LATE_GRACE_MS = 400;

export type McVoicePlaybackPlan = {
  cue: McVoiceCue;
  elapsedMs: number;
  remainingMs: number;
};

/** Deduplicates one-shot snapshots; countdowns get a small network/event-loop grace window. */
export class McVoiceCueScheduler {
  private readonly seenCueIds = new Set<string>();

  consume(input: unknown, serverNowMs: number): McVoicePlaybackPlan | null {
    if (!Number.isFinite(serverNowMs)) return null;
    const result = McVoiceCueSchema.safeParse(input);
    if (!result.success || this.seenCueIds.has(result.data.cueId)) return null;

    const cue = result.data;
    this.seenCueIds.add(cue.cueId);
    const lateByMs = serverNowMs - cue.startsAtServerMs;
    if (cue.eventType === 'COUNTDOWN' && lateByMs > MC_COUNTDOWN_LATE_GRACE_MS) return null;

    // Countdown speech is short and each new marker interrupts the previous one. If a snapshot
    // arrives within the grace window, start the full word on receipt instead of trimming it away.
    const playbackCue = cue.eventType === 'COUNTDOWN' && lateByMs > 0
      ? { ...cue, startsAtServerMs: serverNowMs }
      : cue;
    const elapsedMs = Math.max(0, serverNowMs - playbackCue.startsAtServerMs);
    return { cue: playbackCue, elapsedMs, remainingMs: playbackCue.durationMs - elapsedMs };
  }
}
