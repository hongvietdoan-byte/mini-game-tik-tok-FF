import { describe, expect, it } from 'vitest';
import { McVoiceCueScheduler } from './mc-voice';

const cue = {
  cueId: '5313b7b7-5a67-4f2d-a17e-f9406f5f4321',
  eventType: 'QUESTION',
  assetUrl: `/api/mc-voice/assets/${'a'.repeat(64)}`,
  durationMs: 5_000,
  startsAtServerMs: 100_000,
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

  it('rejects malformed cues and invalid clock values', () => {
    const scheduler = new McVoiceCueScheduler();
    expect(scheduler.consume({ ...cue, assetUrl: 'https://example.com/voice.mp3' }, 99_000)).toBeNull();
    expect(scheduler.consume(cue, Number.NaN)).toBeNull();
  });
});
