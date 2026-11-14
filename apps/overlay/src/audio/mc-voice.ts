import { McVoiceCueSchema, type McVoiceCue } from '@quiz/contracts';

export type McVoicePlaybackPlan = {
  cue: McVoiceCue;
  elapsedMs: number;
  remainingMs: number;
};

/** Deduplicates one-shot snapshot cues and drops cues whose declared audio window elapsed. */
export class McVoiceCueScheduler {
  private readonly seenCueIds = new Set<string>();

  consume(input: unknown, serverNowMs: number): McVoicePlaybackPlan | null {
    if (!Number.isFinite(serverNowMs)) return null;
    const result = McVoiceCueSchema.safeParse(input);
    if (!result.success || this.seenCueIds.has(result.data.cueId)) return null;

    const cue = result.data;
    this.seenCueIds.add(cue.cueId);
    const elapsedMs = Math.max(0, serverNowMs - cue.startsAtServerMs);
    return { cue, elapsedMs, remainingMs: cue.durationMs - elapsedMs };
  }
}
