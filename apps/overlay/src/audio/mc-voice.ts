import {
  McVoiceCountdownScheduleSchema,
  McVoiceCueSchema,
  type McVoiceCue,
  type McVoiceCountdownSchedule,
} from '@quiz/contracts';

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

export type McVoiceCountdownDrop = { reason: 'TIMER_LATE' | 'CANCELLED' | 'INVALID_SCHEDULE'; timerLatenessMs?: number };
export type McVoiceCountdownPlan = {
  scheduleId: string | null;
  cues: McVoiceCue[];
  dropped: McVoiceCountdownDrop[];
  cancelCurrent: boolean;
};

/** Dedupe lịch đầy đủ, chọn riêng mốc tương lai khi overlay vừa kết nối/reconnect. */
export class McVoiceCountdownScheduler {
  private activeSchedule: McVoiceCountdownSchedule | null = null;

  consume(input: unknown, state: string, serverNowMs: number): McVoiceCountdownPlan | null {
    if (!Number.isFinite(serverNowMs)) return null;
    if (state !== 'ACCEPTING' || input === null || input === undefined) {
      if (!this.activeSchedule) return null;
      const dropped = this.activeSchedule.cues
        .filter((cue) => cue.startsAtServerMs > serverNowMs)
        .map(() => ({ reason: 'CANCELLED' as const }));
      this.activeSchedule = null;
      return { scheduleId: null, cues: [], dropped, cancelCurrent: true };
    }

    const result = McVoiceCountdownScheduleSchema.safeParse(input);
    if (!result.success) {
      const cancelled = this.activeSchedule?.cues
        .filter((cue) => cue.startsAtServerMs > serverNowMs)
        .map(() => ({ reason: 'CANCELLED' as const })) ?? [];
      const cancelCurrent = this.activeSchedule !== null;
      this.activeSchedule = null;
      return {
        scheduleId: null,
        cues: [],
        dropped: [...cancelled, { reason: 'INVALID_SCHEDULE' }],
        cancelCurrent,
      };
    }

    const schedule = result.data;
    if (this.activeSchedule?.scheduleId === schedule.scheduleId) return null;
    const previous = this.activeSchedule;
    this.activeSchedule = schedule;
    const dropped: McVoiceCountdownDrop[] = previous?.cues
      .filter((cue) => cue.startsAtServerMs > serverNowMs)
      .map(() => ({ reason: 'CANCELLED' as const })) ?? [];
    const cues: McVoiceCue[] = [];
    for (const cue of schedule.cues) {
      const timerLatenessMs = serverNowMs - cue.startsAtServerMs;
      if (timerLatenessMs >= 0) {
        dropped.push({ reason: 'TIMER_LATE', timerLatenessMs: Math.round(timerLatenessMs) });
        continue;
      }
      cues.push({
        cueId: cue.cueId,
        eventType: 'COUNTDOWN',
        assetUrl: `/api/mc-voice/assets/${cue.assetId}`,
        durationMs: cue.durationMs,
        startsAtServerMs: cue.startsAtServerMs,
      });
    }
    return {
      scheduleId: schedule.scheduleId,
      cues,
      dropped,
      cancelCurrent: previous !== null,
    };
  }
}
