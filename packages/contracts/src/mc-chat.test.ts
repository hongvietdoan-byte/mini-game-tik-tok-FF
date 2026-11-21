import { describe, expect, it } from 'vitest';
import {
  MAX_MC_CHAT_TEXT_CHARS,
  MAX_MC_CHAT_VOICE_ASSET_MS,
  MAX_MC_VOICE_ASSET_MS,
  McChatRequestSchema,
  McVoiceCueSchema,
} from './index';

describe('MC chat limits', () => {
  it('accepts 400 characters and rejects 401', () => {
    expect(MAX_MC_CHAT_TEXT_CHARS).toBe(400);
    expect(McChatRequestSchema.safeParse({ text: 'a'.repeat(400), speak: false }).success).toBe(true);
    expect(McChatRequestSchema.safeParse({ text: 'a'.repeat(401), speak: false }).success).toBe(false);
  });

  it('allows operator voice up to 35 seconds while question and countdown cues stay at 20', () => {
    const cue = {
      cueId: '7d9c86bb-8c37-45b2-bb06-9f2dbcc359ea',
      assetUrl: `/api/mc-voice/assets/${'a'.repeat(64)}`,
      startsAtServerMs: 1,
    };
    expect(MAX_MC_CHAT_VOICE_ASSET_MS).toBe(35_000);
    expect(MAX_MC_VOICE_ASSET_MS).toBe(20_000);
    expect(McVoiceCueSchema.safeParse({ ...cue, eventType: 'OPERATOR_CHAT', durationMs: 34_000, bubbleText: 'MC' }).success).toBe(true);
    expect(McVoiceCueSchema.safeParse({ ...cue, eventType: 'OPERATOR_CHAT', durationMs: 36_000, bubbleText: 'MC' }).success).toBe(false);
    expect(McVoiceCueSchema.safeParse({ ...cue, eventType: 'QUESTION', durationMs: 20_000 }).success).toBe(true);
    expect(McVoiceCueSchema.safeParse({ ...cue, eventType: 'QUESTION', durationMs: 20_001 }).success).toBe(false);
    expect(McVoiceCueSchema.safeParse({ ...cue, eventType: 'COUNTDOWN', durationMs: 20_001, secondsRemaining: 3 }).success).toBe(false);
  });
});
