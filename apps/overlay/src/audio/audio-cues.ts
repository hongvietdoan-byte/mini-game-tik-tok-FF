import type { PublicSnapshot } from '@quiz/contracts';

export const AUDIO_CUES = [
  'question-enter',
  'countdown-tick',
  'timeout',
  'correct-answer',
  'top10',
  'victory',
  'transition',
] as const;

export type AudioCue = typeof AUDIO_CUES[number];
export type BgmTrack = 'bgm-lobby' | 'bgm-game';
export type BgmFileSlot = BgmTrack | 'bgm';
export type VictoryMusicSlot = `victory-music-${number}`;
export type BgmFileExtension = 'mp3' | 'ogg';
export type BgmFileCandidate = { slot: BgmFileSlot; extension: BgmFileExtension };
export type AudioSlot = AudioCue | BgmFileSlot | VictoryMusicSlot;
export type VisualCue = 'question' | 'reveal' | 'top10' | 'victory' | 'transition';
export type AudioMix = { volume: number; sfx: number; bgm: number };
export type CountdownPulse = { offsetMs: number; frequency: number; duration: number };
// Hạ SFX/BGM xuống 18% khi MC nói để câu đếm ngắn vẫn nổi rõ, nhưng tick vẫn tiếp tục phát.
export const MC_VOICE_DUCKING_GAIN = 0.18;

/** The legacy loop remains the fallback for either phase-specific music file. */
export function bgmFallbackCandidates(track: BgmTrack): readonly BgmFileCandidate[] {
  return track === 'bgm-game'
    ? [
        { slot: 'bgm-game', extension: 'ogg' },
        { slot: 'bgm', extension: 'ogg' },
        { slot: 'bgm-game', extension: 'mp3' },
        { slot: 'bgm', extension: 'mp3' },
      ]
    : [
        { slot: 'bgm-lobby', extension: 'mp3' },
        { slot: 'bgm-lobby', extension: 'ogg' },
        { slot: 'bgm', extension: 'mp3' },
        { slot: 'bgm', extension: 'ogg' },
      ];
}

/** Resolves a phase to its loop; VICTORY music is managed separately as a one-shot. */
export function selectBgmTrack(snapshot: Pick<PublicSnapshot, 'state' | 'scene' | 'round'>): BgmTrack | null {
  if (snapshot.state === 'VICTORY' || snapshot.scene === 'VICTORY') return null;
  if (snapshot.state === 'IDLE' || snapshot.state === 'LOBBY' || !snapshot.round) return 'bgm-lobby';
  return 'bgm-game';
}

/** Load the phase track first and then the backward-compatible shared music slot. */
export async function loadBgmWithFallback<T>(
  track: BgmTrack,
  load: (slot: BgmFileSlot, extension: BgmFileExtension) => Promise<T | null>,
): Promise<{ slot: BgmFileSlot; extension: BgmFileExtension; value: T } | null> {
  for (const { slot, extension } of bgmFallbackCandidates(track)) {
    const value = await load(slot, extension);
    if (value !== null) return { slot, extension, value };
  }
  return null;
}

function level(params: URLSearchParams, key: string, fallback: number) {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

export function parseAudioMix(search: string): AudioMix {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return {
    volume: level(params, 'volume', 1),
    sfx: level(params, 'sfx', 0.6),
    bgm: level(params, 'bgm', 0.18),
  };
}

/** More pulses fit into each remaining second as the deadline approaches. */
export function countdownTickPattern(remainingSeconds: number): CountdownPulse[] {
  const wholeSeconds = Number.isFinite(remainingSeconds) ? Math.trunc(remainingSeconds) : 5;
  const seconds = Math.max(1, Math.min(5, wholeSeconds));
  const pulseCount = 6 - seconds;
  const intervalMs = 720 / pulseCount;
  return Array.from({ length: pulseCount }, (_, index) => ({
    offsetMs: index * intervalMs,
    frequency: 650 + (5 - seconds) * 65 + index * 24,
    duration: Math.max(0.045, 0.09 - (5 - seconds) * 0.008),
  }));
}

export type AudioCueDecision = { cues: AudioCue[]; visualCue: VisualCue | null };

export class AudioCueTracker {
  private previous: PublicSnapshot | null = null;
  private previousSecond: number | null = null;
  private lastTickKey = '';

  consume(snapshot: PublicSnapshot, remainingMs: number): AudioCueDecision {
    const second = Math.max(0, Math.ceil(remainingMs / 1_000));
    const previous = this.previous;
    this.previous = snapshot;

    // Initial/reconnected snapshots describe the current phase; they are not new events.
    if (!previous || previous.sessionId !== snapshot.sessionId) {
      this.previousSecond = second;
      return { cues: [], visualCue: null };
    }

    const cues: AudioCue[] = [];
    let visualCue: VisualCue | null = null;
    const priorQuestionId = previous.question?.questionInstanceId;
    const currentQuestionId = snapshot.question?.questionInstanceId;
    const questionChanged = !!currentQuestionId && currentQuestionId !== priorQuestionId;

    if (previous.state === 'ACCEPTING' && snapshot.state !== 'ACCEPTING' && remainingMs <= 150)
      cues.push('timeout');

    if (snapshot.scene === 'REVEAL' && previous.scene !== 'REVEAL') {
      cues.push('correct-answer');
      visualCue = 'reveal';
    } else if (snapshot.scene === 'INTERIM_TOP10' && previous.scene !== 'INTERIM_TOP10') {
      cues.push('top10');
      visualCue = 'top10';
    } else if (snapshot.scene === 'VICTORY' && previous.scene !== 'VICTORY') {
      cues.push('victory');
      visualCue = 'victory';
    } else if (questionChanged && snapshot.scene === 'QUESTION') {
      cues.push('question-enter');
      visualCue = 'question';
    } else if (snapshot.scene !== previous.scene) {
      cues.push('transition');
      visualCue = 'transition';
    }

    const questionKey = `${snapshot.sessionId}:${snapshot.round?.roundNumber ?? 0}:${currentQuestionId ?? ''}`;
    if (
      snapshot.state === 'ACCEPTING' &&
      previous.state === 'ACCEPTING' &&
      currentQuestionId === priorQuestionId &&
      second > 0 && second <= 5 &&
      this.previousSecond !== null && second < this.previousSecond
    ) {
      const tickKey = `${questionKey}:${second}`;
      if (tickKey !== this.lastTickKey) {
        cues.push('countdown-tick');
        this.lastTickKey = tickKey;
      }
    }

    this.previousSecond = second;
    return { cues, visualCue };
  }
}
