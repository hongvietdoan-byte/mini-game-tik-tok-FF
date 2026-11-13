import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { McVoiceCache, McVoiceService, buildApp, type McVoiceAudio, type McVoiceCredentialStore, type McVoiceProvider } from '@quiz/server';
import { AUTH, makeQuestions, tempDbPath, TOKEN } from './helpers';
import { testTempRootAsync } from '../support/tempRoot';

type Harness = { quiz: Awaited<ReturnType<typeof buildApp>>; store: Store; voiceCacheDirectory: string; secret: { value: string | null }; provider: McVoiceProvider };
const opened: Harness[] = [];

afterEach(async () => {
  for (const harness of opened.splice(0)) {
    await harness.quiz.close().catch(() => {});
    harness.store.close();
    await rm(harness.voiceCacheDirectory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

function fakeAudio(): McVoiceAudio {
  return { bytes: Buffer.from('fake-mp3-audio'), durationMs: 1_200, format: 'mp3' };
}

async function harness(opts: { voice?: boolean } = {}) {
  const scheduler = new ManualScheduler();
  const store = new Store(tempDbPath());
  store.seedQuestions({ id: 'demo', name: 'Demo' }, makeQuestions(4), scheduler.now());
  const adapter = new MockAdapter();
  const voiceCacheDirectory = await testTempRootAsync('mc-voice-api-cache-');
  const secret: { value: string | null } = { value: 'test-only-secret-9876' };
  const credentials: McVoiceCredentialStore = {
    get: async () => secret.value,
    set: async (value) => { secret.value = value; },
    clear: async () => { secret.value = null; },
  };
  const provider: McVoiceProvider = { synthesize: vi.fn(async () => fakeAudio()) };
  const service = new McVoiceService(provider, new McVoiceCache(voiceCacheDirectory), credentials, {
    normalize: async (audio) => audio,
  });
  const quiz = await buildApp({
    store,
    scheduler,
    adminToken: TOKEN,
    adapterFactory: () => adapter,
    mcVoice: opts.voice ? {
      credentials,
      service,
      cache: new McVoiceCache(voiceCacheDirectory),
      profile: { model: 'runtime-model', voiceKey: 'runtime-only', rate: 1, voiceSettings: { voiceProfile: 'runtime-only', rate: 1 } },
    } : { credentials },
  });
  const result = { quiz, store, voiceCacheDirectory, secret, provider };
  opened.push(result);
  return result;
}

describe('MC Voice server API', () => {
  it('GET settings chỉ trả cờ có token; route yêu cầu admin và chỉ đổi primary overlay sau xác nhận', async () => {
    const h = await harness();
    const unauthorized = await h.quiz.app.inject({ method: 'GET', url: '/api/mc-voice/settings' });
    expect(unauthorized.statusCode).toBe(401);

    const settings = await h.quiz.app.inject({ method: 'GET', url: '/api/mc-voice/settings', headers: AUTH });
    expect(settings.json().playerNameSpeech).toBe('UNSUPPORTED');
    expect(settings.statusCode).toBe(200);
    expect(settings.json()).toMatchObject({ hasToken: true, ready: false });
    expect(settings.body).not.toContain('test-only-secret-9876');
    expect(settings.body).not.toContain('tokenMasked');
    expect(settings.body).not.toContain('9876');

    const saved = await h.quiz.app.inject({
      method: 'PUT', url: '/api/mc-voice/settings', headers: AUTH,
      payload: { token: 'memory-only-new-token' },
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toMatchObject({ hasToken: true });
    expect(saved.body).not.toContain('memory-only-new-token');
    expect(h.secret.value).toBe('memory-only-new-token');
    const cleared = await h.quiz.app.inject({
      method: 'PUT', url: '/api/mc-voice/settings', headers: AUTH,
      payload: { clearToken: true },
    });
    expect(cleared.statusCode).toBe(200);
    expect(cleared.json()).toMatchObject({ hasToken: false });
    expect(h.secret.value).toBeNull();
    h.secret.value = 'test-only-secret-9876';

    const first = await h.quiz.app.inject({
      method: 'PUT', url: '/api/mc-voice/settings', headers: AUTH,
      payload: { primaryOverlayInstanceId: 'overlay-1' },
    });
    expect(first.statusCode).toBe(200);
    const unconfirmed = await h.quiz.app.inject({
      method: 'PUT', url: '/api/mc-voice/settings', headers: AUTH,
      payload: { primaryOverlayInstanceId: 'overlay-2' },
    });
    expect(unconfirmed.statusCode).toBe(409);
    const confirmed = await h.quiz.app.inject({
      method: 'PUT', url: '/api/mc-voice/settings', headers: AUTH,
      payload: { primaryOverlayInstanceId: 'overlay-2', confirmPrimaryOverlayChange: true },
    });
    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.json()).toMatchObject({ primaryOverlayInstanceId: 'overlay-2' });
  });

  it('chỉ test khi có xác nhận tường minh; response chỉ có asset id, không có provider URL/token', async () => {
    const h = await harness({ voice: true });
    const unconfirmed = await h.quiz.app.inject({
      method: 'POST', url: '/api/mc-voice/test', headers: AUTH,
      payload: { text: 'Đọc thử.' },
    });
    expect(unconfirmed.statusCode).toBe(422);

    const tested = await h.quiz.app.inject({
      method: 'POST', url: '/api/mc-voice/test', headers: AUTH,
      payload: { confirmed: true, text: 'Đọc thử.' },
    });
    expect(tested.statusCode).toBe(200);
    expect(tested.json()).toMatchObject({ ok: true, durationMs: 1_200, cacheHit: false });
    expect(tested.body).not.toContain('test-only-secret-9876');
    expect(tested.body).not.toContain('runtime-only');
    expect(tested.body).not.toContain('http');

    const asset = await h.quiz.app.inject({ method: 'GET', url: `/api/mc-voice/assets/${tested.json().assetId}`, headers: AUTH });
    expect(asset.statusCode).toBe(200);
    expect(asset.headers['content-type']).toContain('audio/mpeg');
    expect(asset.body).toBe('fake-mp3-audio');
  });

  it('chỉ pre-generate câu đã duyệt; progress không mang text/audio/credential', async () => {
    const h = await harness({ voice: true });
    const questionId = h.store.listQuestions('demo')[0]!.id;
    const identityAttempt = await h.quiz.app.inject({
      method: 'POST', url: '/api/mc-voice/pre-generate', headers: AUTH,
      payload: { questionIds: [questionId], playerName: 'Không được đọc', playerId: 'TIKTOK:123' },
    });
    expect(identityAttempt.statusCode).toBe(422);
    expect(h.provider.synthesize).not.toHaveBeenCalled();

    const started = await h.quiz.app.inject({
      method: 'POST', url: '/api/mc-voice/pre-generate', headers: AUTH,
      payload: { questionIds: [questionId] },
    });
    expect(started.statusCode).toBe(202);
    expect(started.body).not.toContain('Câu hỏi thử nghiệm');
    expect(started.body).not.toContain('test-only-secret-9876');
    expect(JSON.stringify(vi.mocked(h.provider.synthesize).mock.calls)).not.toContain('TIKTOK:123');

    let progress = started.json();
    for (let attempt = 0; attempt < 1_000 && !['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'].includes(progress.status); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      const response = await h.quiz.app.inject({
        method: 'GET', url: `/api/mc-voice/pre-generate/${progress.jobId}`, headers: AUTH,
      });
      expect(response.statusCode).toBe(200);
      progress = response.json();
    }
    expect(progress).toMatchObject({ status: 'COMPLETED', total: 1, completed: 1, failed: 0, tooLong: 0 });

    const invalid = await h.quiz.app.inject({
      method: 'POST', url: '/api/mc-voice/pre-generate', headers: AUTH,
      payload: { questionIds: ['not-approved'] },
    });
    expect(invalid.statusCode).toBe(400);
  });
});
