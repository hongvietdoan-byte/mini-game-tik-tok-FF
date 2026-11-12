import { describe, expect, it } from 'vitest';
import { makeMockSnapshot } from '../mock/snapshots';
import { AudioCueTracker, countdownTickPattern, mcDuckingGain, parseAudioMix } from './audio-cues';

function mock(name: string) {
  const snapshot = makeMockSnapshot(name);
  if (!snapshot) throw new Error(`Unknown mock: ${name}`);
  return snapshot;
}

describe('overlay audio cues', () => {
  it('parses bounded levels and uses quiet, muted-music defaults', () => {
    expect(parseAudioMix('')).toEqual({ volume: 1, sfx: 0.6, bgm: 0 });
    expect(parseAudioMix('?volume=0.5&sfx=2&bgm=-1')).toEqual({ volume: 0.5, sfx: 1, bgm: 0 });
    expect(parseAudioMix('?sfx=nope&bgm=0.25').sfx).toBe(0.6);
  });

  it('accelerates the synthetic tick pattern toward zero', () => {
    const fiveSeconds = countdownTickPattern(5);
    const fourSeconds = countdownTickPattern(4);
    const oneSecond = countdownTickPattern(1);
    expect(fiveSeconds).toHaveLength(1);
    expect(fourSeconds).toHaveLength(2);
    expect(oneSecond).toHaveLength(5);
    const oneSecondInterval = oneSecond[1]!.offsetMs - oneSecond[0]!.offsetMs;
    const fourSecondInterval = fourSeconds[1]!.offsetMs - fourSeconds[0]!.offsetMs;
    expect(oneSecondInterval).toBeLessThan(fourSecondInterval);
    expect(oneSecond[0]!.frequency).toBeGreaterThan(fiveSeconds[0]!.frequency);
  });
  it('plays a question-entry cue once across repeated snapshots and reading phase', () => {
    const tracker = new AudioCueTracker();
    expect(tracker.consume(mock('lobby'), 30_000).cues).toEqual([]);
    expect(tracker.consume(mock('prepare'), 3_000).cues).toEqual(['question-enter']);
    expect(tracker.consume(mock('prepare'), 3_000).cues).toEqual([]);
    expect(tracker.consume(mock('reading'), 19_000).cues).toEqual([]);
  });

  it('plays one tick on each final-second transition, despite repeated renders', () => {
    const tracker = new AudioCueTracker();
    const accepting = mock('question');
    tracker.consume(accepting, 6_000);
    expect(tracker.consume(accepting, 5_000).cues).toEqual(['countdown-tick']);
    expect(tracker.consume(accepting, 4_950).cues).toEqual([]);
    expect(tracker.consume(accepting, 4_000).cues).toEqual(['countdown-tick']);
  });

  it('maps reveal, Top 10, and victory to distinct one-shot cues', () => {
    const tracker = new AudioCueTracker();
    tracker.consume(mock('question'), 12_000);
    expect(tracker.consume(mock('reveal'), 0).cues).toEqual(['timeout', 'correct-answer']);
    expect(tracker.consume(mock('reveal'), 0).cues).toEqual([]);
    expect(tracker.consume(mock('top10'), 0).cues).toEqual(['top10']);
    expect(tracker.consume(mock('victory'), 0).cues).toEqual(['victory']);
  });

  it('ducks SFX only while Kelly reads the question', () => {
    const reading = mock('reading');
    expect(mcDuckingGain(reading)).toBe(0.22);
    expect(mcDuckingGain(mock('question'))).toBe(1);
  });
});
