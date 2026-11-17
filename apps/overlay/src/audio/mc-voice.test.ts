import { describe, expect, it } from 'vitest';
import { MC_COUNTDOWN_LATE_GRACE_MS, McVoiceCountdownScheduler, McVoiceCueScheduler } from './mc-voice';

const cue = {
  cueId: '5313b7b7-5a67-4f2d-a17e-f9406f5f4321',
  eventType: 'QUESTION',
  assetUrl: `/api/mc-voice/assets/${'a'.repeat(64)}`,
  durationMs: 5_000,
  startsAtServerMs: 100_000,
};

const countdownOffsets = [10_000, 15_000, 16_000, 17_000, 18_000, 19_000] as const;
const countdownSeconds = [10, 5, 4, 3, 2, 1] as const;
const countdownSchedule = {
  scheduleId: 'd86d4887-e146-4c45-8eb3-465ce0d72cb8',
  questionInstanceId: 'question-1',
  cues: countdownSeconds.map((secondsRemaining, index) => ({
    cueId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    secondsRemaining,
    assetId: 'a'.repeat(64),
    durationMs: 340,
    startsAtServerMs: 100_000 + countdownOffsets[index]!,
  })),
};

describe('MC voice cue scheduler', () => {
  it('accepts a future cue once and suppresses duplicate snapshots', () => {
    const scheduler = new McVoiceCueScheduler();
    expect(scheduler.consume(cue, 99_000)).toEqual({ cue, elapsedMs: 0, remainingMs: 5_000 });
    expect(scheduler.consume({ ...cue }, 99_500)).toBeNull();
  });

  it('reports elapsed time for late arrival and marks an expired cue for dropping', () => {
    const scheduler = new McVoiceCueScheduler();
    expect(scheduler.consume(cue, 101_250)).toEqual({ cue, elapsedMs: 1_250, remainingMs: 3_750 });
    const expired = scheduler.consume({ ...cue, cueId: '694a9b45-252b-4eba-8d3b-7108e729142b' }, 105_000);
    expect(expired?.remainingMs).toBe(0);
    expect(expired?.elapsedMs).toBe(5_000);
  });

  it('keeps a late countdown audible within 400 ms and drops it after the grace window', () => {
    const scheduler = new McVoiceCueScheduler();
    const countdown = { ...cue, eventType: 'COUNTDOWN' as const, durationMs: 329 };
    const late = scheduler.consume(countdown, countdown.startsAtServerMs + MC_COUNTDOWN_LATE_GRACE_MS);
    expect(late).toMatchObject({
      elapsedMs: 0,
      remainingMs: 329,
      cue: { startsAtServerMs: countdown.startsAtServerMs + MC_COUNTDOWN_LATE_GRACE_MS },
    });

    expect(scheduler.consume({ ...countdown, cueId: '694a9b45-252b-4eba-8d3b-7108e729142b' },
      countdown.startsAtServerMs + MC_COUNTDOWN_LATE_GRACE_MS + 1)).toBeNull();
  });

  it('rejects malformed cues and invalid clock values', () => {
    const scheduler = new McVoiceCueScheduler();
    expect(scheduler.consume({ ...cue, assetUrl: 'https://example.com/voice.mp3' }, 99_000)).toBeNull();
    expect(scheduler.consume(cue, Number.NaN)).toBeNull();
  });
});

describe('MC voice countdown schedule', () => {
  it('retains all six server-clock markers after 1–2 s server jitter and dedupes snapshots', () => {
    const scheduler = new McVoiceCountdownScheduler();
    // Assets/schedule reach the overlay 1.5 s after ACCEPTING; every marker is still future.
    const plan = scheduler.consume(countdownSchedule, 'ACCEPTING', 101_500);
    expect(plan?.cues).toHaveLength(6);
    expect(plan?.cues.map((item) => item.startsAtServerMs)).toEqual(countdownSchedule.cues.map((item) => item.startsAtServerMs));
    expect(plan?.cues[0]?.assetUrl).toBe(`/api/mc-voice/assets/${'a'.repeat(64)}`);
    expect(scheduler.consume(countdownSchedule, 'ACCEPTING', 102_000)).toBeNull();
  });

  it('cancels future markers on pause and reconnects with only markers still in the future', () => {
    const live = new McVoiceCountdownScheduler();
    expect(live.consume(countdownSchedule, 'ACCEPTING', 102_000)?.cues).toHaveLength(6);
    expect(live.consume(countdownSchedule, 'PAUSED', 111_000)).toMatchObject({
      scheduleId: null,
      cues: [],
      cancelCurrent: true,
      dropped: Array.from({ length: 5 }, () => ({ reason: 'CANCELLED' })),
    });

    const reconnected = new McVoiceCountdownScheduler();
    const reconnectPlan = reconnected.consume(countdownSchedule, 'ACCEPTING', 115_999);
    expect(reconnectPlan?.cues.map((item) => item.startsAtServerMs)).toEqual(
      countdownSchedule.cues.slice(2).map((item) => item.startsAtServerMs),
    );
  });

  it('reports per-marker lateness instead of trying to replay markers in the past', () => {
    const scheduler = new McVoiceCountdownScheduler();
    const plan = scheduler.consume(countdownSchedule, 'ACCEPTING', 111_000);
    expect(plan?.cues).toHaveLength(5);
    expect(plan?.dropped).toEqual([{ reason: 'TIMER_LATE', timerLatenessMs: 1_000 }]);
  });
});
