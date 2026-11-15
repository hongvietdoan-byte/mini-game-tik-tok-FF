import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { DEFAULT_MC_READING_MS, DEFAULT_TIMINGS } from '@quiz/contracts';
import { currentQuestionInstanceId } from '@quiz/quiz-core';
import { McVoiceCache, McVoiceProviderError, McVoiceService, buildApp, type McVoiceAudio, type McVoiceCredentialStore, type McVoiceProvider } from '@quiz/server';
import { AUTH, makeQuestions, tempDbPath, TOKEN } from './helpers';
import { testTempRootAsync } from '../support/tempRoot';

type Harness = { quiz: Awaited<ReturnType<typeof buildApp>>; store: Store; scheduler: ManualScheduler; voiceCacheDirectory: string; secret: { value: string | null }; provider: McVoiceProvider; service: McVoiceService };
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

async function harness(opts: { voice?: boolean; voiceFailure?: boolean } = {}) {
  const scheduler = new ManualScheduler();
  const store = new Store(tempDbPath());
  store.seedQuestions({ id: 'demo', name: 'Demo' }, makeQuestions(10), scheduler.now());
  const adapter = new MockAdapter();
  const voiceCacheDirectory = await testTempRootAsync('mc-voice-api-cache-');
  const secret: { value: string | null } = { value: 'test-only-secret-9876' };
  const credentials: McVoiceCredentialStore = {
    get: async () => secret.value,
    set: async (value) => { secret.value = value; },
    clear: async () => { secret.value = null; },
  };
  const synthesize = vi.fn(async () => fakeAudio());
  if (opts.voiceFailure) synthesize.mockRejectedValue(new McVoiceProviderError('TIMEOUT', 'fake timeout'));
  const provider: McVoiceProvider = { synthesize };
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
  const result = { quiz, store, scheduler, voiceCacheDirectory, secret, provider, service };
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

    const asset = await h.quiz.app.inject({ method: 'GET', url: `/api/mc-voice/assets/${tested.json().assetId}` });
    expect(asset.statusCode).toBe(200);
    expect(asset.headers['content-type']).toContain('audio/mpeg');
    expect(asset.headers['cache-control']).toContain('public');
    expect(asset.body).toBe('fake-mp3-audio');
  });

  it('tự pre-generate vòng, phát cue công khai không replay và không đọc fastestCorrectAnswer', async () => {
    const h = await harness({ voice: true });
    const getOrCreate = vi.spyOn(h.service, 'getOrCreate');
    const prepareQuestionReading = vi.spyOn(h.service, 'prepareQuestionReading');
    const created = await h.quiz.app.inject({
      method: 'POST', url: '/api/sessions', headers: AUTH,
      payload: { name: 'Phiên MC test', config: { mode: 'MOCK', allowDemoQuestions: true, seed: 42, questionsPerRound: 10,
        mcVoiceEnabled: true, timings: { ...DEFAULT_TIMINGS, prepareMs: 500, answerMs: 3_000 } } },
    });
    expect(created.statusCode).toBe(201);
    const runtime = h.quiz.runtime()!;
    const publicMessages: Array<{ type: string; payload: { mcVoiceCue?: unknown } }> = [];
    runtime.subscribe((batch) => publicMessages.push(...batch.filter((item) => item.audience === 'public').map((item) => item.message as never)));
    const send = async (command: Record<string, unknown>) => h.quiz.app.inject({
      method: 'POST', url: `/api/sessions/${runtime.id}/commands`, headers: AUTH,
      payload: { commandId: randomUUID(), expectedStateVersion: runtime.engine.stateVersion,
        operatorId: 'test', requestedAtMs: h.scheduler.now(), command },
    });
    expect((await send({ type: 'OPEN_LOBBY' })).statusCode).toBe(200);
    expect((await send({ type: 'START_ROUND' })).statusCode).toBe(200);
    for (let spent = 0; runtime.engine.state !== 'READING' && spent < 5_000; spent += 50) h.scheduler.advance(50);
    expect(runtime.engine.state).toBe('READING');
    const roundQuestionCount = h.store.roundQuestions(runtime.engine.round!.roundId).length;
    const expectedSyntheses = 8 + roundQuestionCount * 6;
    const questionReadingPromises = () => prepareQuestionReading.mock.results
      .filter((result) => result.type === 'return').map((result) => result.value as Promise<unknown>);
    const answerRevealCalls = () => getOrCreate.mock.calls
      .filter(([, request]) => request.text.startsWith('Đáp án đúng'));
    for (let i = 0; i < 2_000 && questionReadingPromises().length < roundQuestionCount; i += 1)
      await new Promise((resolve) => setTimeout(resolve, 10));
    expect(questionReadingPromises()).toHaveLength(roundQuestionCount);
    for (let i = 0; i < 2_000 && answerRevealCalls().length < roundQuestionCount; i += 1)
      await new Promise((resolve) => setTimeout(resolve, 10));
    expect(answerRevealCalls()).toHaveLength(roundQuestionCount);
    const [readingResults, assetResults] = await Promise.all([
      Promise.allSettled(questionReadingPromises()),
      Promise.allSettled(getOrCreate.mock.results.filter((result) => result.type === 'return')
        .map((result) => result.value as Promise<unknown>)),
    ]);
    expect(readingResults.filter((result) => result.status === 'rejected')).toHaveLength(0);
    expect(assetResults.filter((result) => result.status === 'rejected')).toHaveLength(0);
    expect(runtime.engine.timer?.durationMs).toBeGreaterThanOrEqual(6_000);
    expect(runtime.engine.timer?.durationMs).toBeLessThanOrEqual(20_000);
    expect(h.provider.synthesize).toHaveBeenCalledTimes(expectedSyntheses); // 8 câu chung/đếm ngược + 5 dòng READING + 1 lời công bố mỗi câu.

    h.scheduler.advance(1_500);
    const cueMessage = publicMessages.find((message) => message.type === 'STATE_SNAPSHOT' && message.payload.mcVoiceCue)!
      .payload.mcVoiceCue as { cueId: string; eventType: string; assetUrl: string; durationMs: number; startsAtServerMs: number };
    expect(cueMessage).toMatchObject({ eventType: 'QUESTION', durationMs: 1_200 });
    expect(cueMessage.assetUrl).toMatch(/^\/api\/mc-voice\/assets\/[a-f0-9]{64}$/);
    expect(cueMessage.startsAtServerMs).toBeGreaterThan(0);
    expect(runtime.publicSnapshot().mcVoiceCue).toBeNull(); // HTTP/HELLO reconnect snapshot never replays one-shot audio.
    const publicState = await h.quiz.app.inject({ method: 'GET', url: `/api/sessions/${runtime.id}/state` });
    expect(publicState.statusCode).toBe(200);
    expect(publicState.json().mcVoiceCue).toBeNull();
    const asset = await h.quiz.app.inject({ method: 'GET', url: cueMessage.assetUrl });
    expect(asset.statusCode).toBe(200);

    const questionId = currentQuestionInstanceId(runtime.engine)!;
    h.scheduler.advance(runtime.engine.timer!.remainingMs);
    expect(runtime.engine.state).toBe('ACCEPTING');
    const correctOptionId = runtime.adminSnapshot().current!.correctOptionId;
    expect(runtime.ingest({ source: 'MOCK', userId: 'private-player-id', displayName: 'Ngọc', text: correctOptionId, eventId: 'fastest-player' }).accepted).toBe(true);
    h.scheduler.advance(3_000);
    expect(runtime.publicSnapshot().fastestCorrectAnswer?.safeDisplayName).toBe('Ngọc');
    const unsafeName = await h.quiz.app.inject({ method: 'POST', url: '/api/mc-voice/test', headers: AUTH,
      payload: { confirmed: true, text: 'Xin chào Ngọc!' } });
    expect(unsafeName.statusCode).toBe(422);
    const unsafeId = await h.quiz.app.inject({ method: 'POST', url: '/api/mc-voice/test', headers: AUTH,
      payload: { confirmed: true, text: `Xin chào ${runtime.voiceIdentityValues()[0]}!` } });
    expect(unsafeId.statusCode).toBe(422);
    for (let i = 0; i < 30; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
    const spoken = JSON.stringify(vi.mocked(h.provider.synthesize).mock.calls.map(([request]) => request.text));
    expect(spoken).not.toContain('Ngọc');
    expect(spoken).not.toContain('private-player-id');
    expect(spoken).not.toContain(questionId);
  });

  it('provider timeout bỏ audio, giữ READING mặc định rồi mở đáp án đúng hạn', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const h = await harness({ voice: true, voiceFailure: true });
      const created = await h.quiz.app.inject({ method: 'POST', url: '/api/sessions', headers: AUTH,
        payload: { name: 'Phiên fallback test', config: { mode: 'MOCK', allowDemoQuestions: true, seed: 42,
          questionsPerRound: 10, mcVoiceEnabled: true, timings: { ...DEFAULT_TIMINGS, prepareMs: 500, answerMs: 3_000 } } } });
      expect(created.statusCode).toBe(201);
      const runtime = h.quiz.runtime()!;
      const send = async (command: Record<string, unknown>) => h.quiz.app.inject({
        method: 'POST', url: `/api/sessions/${runtime.id}/commands`, headers: AUTH,
        payload: { commandId: randomUUID(), expectedStateVersion: runtime.engine.stateVersion,
          operatorId: 'test', requestedAtMs: h.scheduler.now(), command },
      });
      await send({ type: 'OPEN_LOBBY' });
      await send({ type: 'START_ROUND' });
      for (let spent = 0; runtime.engine.state !== 'READING' && spent < 5_000; spent += 50) h.scheduler.advance(50);
      expect(runtime.engine.state).toBe('READING');
      expect(runtime.engine.timer?.durationMs).toBe(DEFAULT_MC_READING_MS);
      h.scheduler.advance(DEFAULT_MC_READING_MS);
      expect(runtime.engine.state).toBe('ACCEPTING');
      for (let attempt = 0; attempt < 100 && !warning.mock.calls.some(([message]) => String(message).includes('reason=TIMEOUT')); attempt += 1)
        await new Promise((resolve) => setTimeout(resolve, 0));
      expect(warning.mock.calls.some(([message]) => String(message).includes('reason=TIMEOUT'))).toBe(true);
    } finally {
      warning.mockRestore();
    }
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
