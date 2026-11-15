import { dirname, join } from 'node:path';
import { MC_VOICE_POLICY_VERSION } from '@quiz/contracts';
import { configuredMcVoiceRuntime } from '../apps/server/src/voice/configured-runtime';

// This script can spend credits. It is intentionally limited to one short line per invocation.
const plannedLines = 1;
const hardLimit = 12;
console.log(`[mc-voice] planned_lines=${plannedLines} hard_limit=${hardLimit}`);
if (plannedLines > hardLimit) {
  console.error('[mc-voice] real check stopped: hard limit exceeded.');
  process.exitCode = 1;
} else if (!process.argv.includes('--confirm-spend')) {
  console.error('[mc-voice] real check stopped: pass --confirm-spend to allow a provider request.');
  process.exitCode = 2;
} else {
  const databasePath = process.env.QUIZ_DB ?? join(process.env.QUIZ_DATA_DIR ?? join(process.cwd(), 'data'), 'quiz.db');
  const runtime = await configuredMcVoiceRuntime({ cacheDirectory: join(dirname(databasePath), 'mc-voice-cache') });
  if (!runtime) {
    console.error('[mc-voice] real check unavailable: local profile or credential is not configured.');
    process.exitCode = 1;
  } else {
    try {
      const text = 'Chào mừng bạn đến với phiên đố vui kiểm tra giọng đọc.';
      const result = await runtime.service.getOrCreate(
        {
          text, voicePolicyVersion: MC_VOICE_POLICY_VERSION, voiceKey: runtime.profile.voiceKey, provider: 'clipai', model: runtime.profile.model,
          voiceSettings: runtime.profile.voiceSettings, rate: runtime.profile.rate, format: 'mp3',
        },
        { text, voiceKey: runtime.profile.voiceKey, rate: runtime.profile.rate, format: 'mp3' },
      );
      console.log(`[mc-voice] real check OK durationMs=${result.asset.durationMs} cacheHit=${result.cacheHit}`);
    } catch (error) {
      const allowed = new Set(['AUTH', 'NO_CREDIT', 'RATE_LIMITED', 'FAILED', 'TIMEOUT', 'DOWNLOAD_FAILED', 'INVALID_RESPONSE', 'TOO_LONG']);
      const reason = error instanceof Error && 'code' in error && typeof error.code === 'string' && allowed.has(error.code)
        ? error.code : 'FAILED';
      console.error(`[mc-voice] real check failed reason=${reason}`);
      process.exitCode = 1;
    }
  }
}
