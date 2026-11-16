import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { CreateSessionRequestSchema } from '@quiz/contracts';
import { Store } from '@quiz/persistence';
import { SessionRuntime } from '../runtime';
import { McVoiceCache } from './cache';
import { McVoiceService } from './service';
import type { McVoiceAudio, McVoiceCredentialStore, McVoiceProvider } from './types';
import { testTempRootAsync } from '../../../../tests/support/tempRoot';

const opened: Array<{ root: string; runtime: SessionRuntime; store: Store }> = [];

afterEach(async () => {
  for (const item of opened.splice(0)) {
    item.runtime.dispose();
    item.store.close();
    await rm(item.root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

describe('lời chào MC ở sảnh', () => {
  it('đợi audio sẵn sàng rồi phát WELCOME sau khi listener đã gắn', async () => {
    const root = await testTempRootAsync('mc-voice-welcome-');
    const store = new Store(join(root, 'quiz.db'));
    const scheduler = new ManualScheduler();
    const credentials: McVoiceCredentialStore = { get: async () => 'fake-token', set: async () => {}, clear: async () => {} };
    const audio: McVoiceAudio = { bytes: Buffer.from('fake-welcome'), durationMs: 800, format: 'mp3' };
    const provider: McVoiceProvider = { synthesize: async () => audio };
    const cache = new McVoiceCache(join(root, 'cache'));
    const service = new McVoiceService(provider, cache, credentials, { normalize: async (input) => input });
    const runtime = await SessionRuntime.create({
      store, scheduler, adapter: new MockAdapter(),
      mcVoice: { service, profile: { model: 'fake-model', voiceKey: 'fake-voice-key', rate: 1, voiceSettings: { style: 'neutral' } } },
    }, CreateSessionRequestSchema.parse({ name: 'Welcome test', config: { mode: 'MOCK', allowDemoQuestions: true, mcVoiceEnabled: true } }));
    opened.push({ root, runtime, store });
    const messages: Array<{ eventType?: string }> = [];
    runtime.subscribe((batch) => {
      for (const item of batch) {
        if (item.audience === 'public' && item.message.type === 'STATE_SNAPSHOT' && item.message.payload.mcVoiceCue)
          messages.push(item.message.payload.mcVoiceCue);
      }
    });

    runtime.dispatch({ commandId: randomUUID(), expectedStateVersion: runtime.engine.stateVersion, operatorId: 'test',
      requestedAtMs: scheduler.now(), command: { type: 'OPEN_LOBBY' } });
    await vi.waitFor(() => expect(messages).toHaveLength(1));
    expect(messages[0]?.eventType).toBe('WELCOME');
  });
});
