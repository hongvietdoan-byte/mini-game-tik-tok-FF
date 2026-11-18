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

function fakeAudio(durationMs = 1_200): McVoiceAudio {
  return { bytes: Buffer.from('fake-mp3-audio'), durationMs, format: 'mp3' };
}

async function harness(opts: { voice?: boolean; voiceFailure?: boolean; questionCount?: number; audioDurationMs?: number; prompt?: string } = {}) {
  const scheduler = new ManualScheduler();
  const store = new Store(tempDbPath());
  const questions = makeQuestions(opts.questionCount ?? 10).map((question) => ({
    ...question, ...(opts.prompt ? { prompt: opts.prompt } : {}),
  }));
  store.seedQuestions({ id: 'demo', name: 'Demo' }, questions, scheduler.now());
  const adapter = new MockAdapter();
  const voiceCacheDirectory = await testTempRootAsync('mc-voice-api-cache-');
  const secret: { value: string | null } = { value: 'test-only-secret-9876' };
  const credentials: McVoiceCredentialStore = {
    get: async () => secret.value,
    set: async (value) => { secret.value = value; },
    clear: async () => { secret.value = null; },
  };
  const synthesize = vi.fn(async () => fakeAudio(opts.audioDurationMs));
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
  it('cấu hình độ trễ AUTO/MANUAL qua admin API và ghi lại config an toàn', async () => {
    const h = await harness({ questionCount: 15 });
    const created = await h.quiz.app.inject({
      method: 'POST', url: '/api/sessions', headers: AUTH,
      payload: { name: 'Stream delay test', config: { mode: 'MOCK', allowDemoQuestions: true, questionsPerRound: 15 } },
    });
    expect(created.statusCode).toBe(201);
    const sessionId = created.json().sessionId as string;
    expect(created.json().snapshot.streamDelay).toMatchObject({ mode: 'AUTO', nextQuestionDelayMs: 2_000, activeQuestionDelayMs: null });

    const unauthorized = await h.quiz.app.inject({
      method: 'PATCH', url: `/api/sessions/${sessionId}/stream-delay`, payload: { mode: 'MANUAL', manualDelayMs: 4_500 },
    });
    expect(unauthorized.statusCode).toBe(401);
    const invalid = await h.quiz.app.inject({
      method: 'PATCH', url: `/api/sessions/${sessionId}/stream-delay`, headers: AUTH,
      payload: { mode: 'MANUAL', manualDelayMs: 6_001 },
    });
    expect(invalid.statusCode).toBe(422);

    const manual = await h.quiz.app.inject({
      method: 'PATCH', url: `/api/sessions/${sessionId}/stream-delay`, headers: AUTH,
      payload: { mode: 'MANUAL', manualDelayMs: 4_500 },
    });
    expect(manual.statusCode).toBe(200);
    expect(manual.json().streamDelay).toMatchObject({ mode: 'MANUAL', nextQuestionDelayMs: 4_500, manualDelayMs: 4_500 });
    expect(h.store.getSession(sessionId)?.config).toMatchObject({ streamDelayMode: 'MANUAL', streamDelayManualMs: 4_500 });
    const state = await h.quiz.app.inject({
      method: 'GET', url: `/api/sessions/${sessionId}/state`, headers: AUTH,
    });
    expect(state.json().streamDelay).toMatchObject({ mode: 'MANUAL', nextQuestionDelayMs: 4_500 });
  });

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
    const h = await harness({ voice: true, questionCount: 15 });
    const getOrCreate = vi.spyOn(h.service, 'getOrCreate');
    const prepareQuestionReading = vi.spyOn(h.service, 'prepareQuestionReading');
    const created = await h.quiz.app.inject({
      method: 'POST', url: '/api/sessions', headers: AUTH,
      payload: { name: 'Phiên MC test', config: { mode: 'MOCK', allowDemoQuestions: true, seed: 42, questionsPerRound: 15,
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
    await vi.waitFor(() => expect(publicMessages.some((message) => message.payload.mcVoiceCue &&
      (message.payload.mcVoiceCue as { eventType?: string }).eventType === 'WELCOME')).toBe(true), { timeout: 15_000 });
    const start = await send({ type: 'START_ROUND' });
    expect([200, 202]).toContain(start.statusCode);
    if (start.statusCode === 202)
      await vi.waitFor(() => expect(runtime.engine.state).toBe('PREPARE'), { timeout: 15_000 });
    for (let spent = 0; runtime.engine.state !== 'READING' && spent < 5_000; spent += 50) h.scheduler.advance(50);
    expect(runtime.engine.state).toBe('READING');
    const roundQuestionCount = h.store.roundQuestions(runtime.engine.round!.roundId).length;
    const expectedSyntheses = 18 + roundQuestionCount * 6;
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
    expect(runtime.engine.timer?.durationMs).toBeLessThanOrEqual(120_000);
    // Lời dẫn chung xếp sau reveal trong hàng đợi (C-0227) nên chờ tới khi đủ lượt thay vì đọc ngay.
    await vi.waitFor(() => expect(h.provider.synthesize).toHaveBeenCalledTimes(expectedSyntheses), { timeout: 5_000 });
    expect(vi.mocked(h.provider.synthesize).mock.calls.some(([request]) =>
      request.text === 'Đã xong tất cả các câu hỏi! Cùng xem ai là nhà vô địch nhé!')).toBe(true);

    h.scheduler.advance(1_500);
    const cueMessage = publicMessages.find((message) => message.type === 'STATE_SNAPSHOT' && message.payload.mcVoiceCue &&
      (message.payload.mcVoiceCue as { eventType?: string }).eventType === 'QUESTION')!
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
      const start = await send({ type: 'START_ROUND' });
      expect([200, 202]).toContain(start.statusCode);
      await vi.waitFor(() => expect(runtime.engine.state).toBe('PREPARE'), { timeout: 15_000 });
      for (let spent = 0; runtime.engine.state !== 'READING' && spent < 5_000; spent += 50) h.scheduler.advance(50);
      expect(runtime.engine.state).toBe('READING');
      await vi.waitFor(() => expect(runtime.engine.timer?.durationMs).toBe(DEFAULT_MC_READING_MS), { timeout: 2_000 });
      expect(runtime.adminSnapshot().error?.code).toBe('MC_VOICE_QUESTION_SKIPPED');
      h.scheduler.advance(DEFAULT_MC_READING_MS);
      expect(runtime.engine.state).toBe('ACCEPTING');
      for (let attempt = 0; attempt < 100 && !warning.mock.calls.some(([message]) => String(message).includes('reason=TIMEOUT')); attempt += 1)
        await new Promise((resolve) => setTimeout(resolve, 0));
      expect(warning.mock.calls.some(([message]) => String(message).includes('reason=TIMEOUT'))).toBe(true);
    } finally {
      warning.mockRestore();
    }
  });

  it('vẫn đọc câu đã duyệt có chữ trùng tên người chơi và bundle dài hơn 20 giây', async () => {
    const h = await harness({ voice: true, audioDurationMs: 4_100, prompt: 'Hành trang nào cần thiết cho chuyến đi?' });
    const created = await h.quiz.app.inject({ method: 'POST', url: '/api/sessions', headers: AUTH,
      payload: { name: 'Câu dài đã duyệt', config: { mode: 'MOCK', allowDemoQuestions: true, seed: 42,
        questionsPerRound: 10, mcVoiceEnabled: true, timings: { ...DEFAULT_TIMINGS, prepareMs: 500, answerMs: 3_000 } } } });
    expect(created.statusCode).toBe(201);
    const runtime = h.quiz.runtime()!;
    const identityValues = vi.spyOn(runtime, 'voiceIdentityValues').mockReturnValue(['Trang']);
    const publicMessages: Array<{ type: string; payload: { mcVoiceCue?: { eventType?: string; startsAtServerMs?: number } | null } }> = [];
    runtime.subscribe((batch) => publicMessages.push(...batch.filter((item) => item.audience === 'public').map((item) => item.message as never)));
    const send = async (type: string) => h.quiz.app.inject({ method: 'POST', url: `/api/sessions/${runtime.id}/commands`, headers: AUTH,
      payload: { commandId: randomUUID(), expectedStateVersion: runtime.engine.stateVersion, operatorId: 'test',
        requestedAtMs: h.scheduler.now(), command: { type } } });
    await send('OPEN_LOBBY');
    await send('START_ROUND');
    await vi.waitFor(() => expect(runtime.engine.state).toBe('PREPARE'), { timeout: 5_000 });
    const preparation = (runtime as unknown as { roundVoicePreparation: { promise: Promise<void> } | null }).roundVoicePreparation;
    await preparation?.promise;
    const remaining = runtime.engine.timer?.remainingMs ?? 500;
    h.scheduler.advance(remaining);
    expect(runtime.engine.state).toBe('READING');
    await vi.waitFor(() => expect(runtime.engine.timer?.durationMs).toBeGreaterThan(20_000), { timeout: 2_000 });
    expect(runtime.engine.timer?.durationMs).toBeLessThanOrEqual(120_000);
    h.scheduler.advance(80);
    expect(publicMessages.some((message) => message.payload.mcVoiceCue?.eventType === 'QUESTION')).toBe(true);
    expect(vi.mocked(h.provider.synthesize).mock.calls.some(([request]) => request.text.includes('Hành trang'))).toBe(true);
    expect(identityValues).not.toHaveBeenCalled();
  });

  it('chờ audio câu hỏi về muộn 3 giây trong READING rồi mới phát', async () => {
    const h = await harness({ voice: true });
    const created = await h.quiz.app.inject({ method: 'POST', url: '/api/sessions', headers: AUTH,
      payload: { name: 'Audio về muộn', config: { mode: 'MOCK', allowDemoQuestions: true, seed: 42,
        questionsPerRound: 10, mcVoiceEnabled: true, timings: { ...DEFAULT_TIMINGS, prepareMs: 500, answerMs: 3_000 } } } });
    expect(created.statusCode).toBe(201);
    const runtime = h.quiz.runtime()!;
    const publicMessages: Array<{ type: string; payload: { mcVoiceCue?: { eventType?: string; startsAtServerMs?: number } | null } }> = [];
    runtime.subscribe((batch) => publicMessages.push(...batch.filter((item) => item.audience === 'public').map((item) => item.message as never)));
    const send = async (type: string) => h.quiz.app.inject({ method: 'POST', url: `/api/sessions/${runtime.id}/commands`, headers: AUTH,
      payload: { commandId: randomUUID(), expectedStateVersion: runtime.engine.stateVersion, operatorId: 'test',
        requestedAtMs: h.scheduler.now(), command: { type } } });
    await send('OPEN_LOBBY');
    await send('START_ROUND');
    await vi.waitFor(() => expect(runtime.engine.state).toBe('PREPARE'), { timeout: 5_000 });
    await (runtime as unknown as { roundVoicePreparation: { promise: Promise<void> } }).roundVoicePreparation.promise;
    const privateRuntime = runtime as unknown as { questionVoiceBundles: Map<string, unknown> };
    privateRuntime.questionVoiceBundles.clear();
    const originalPrepare = h.service.prepareQuestionReading.bind(h.service);
    const delayedPrepare = vi.spyOn(h.service, 'prepareQuestionReading').mockImplementation(async (lines) => {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      h.scheduler.advance(3_000);
      return originalPrepare(lines);
    });
    const prepareRemaining = runtime.engine.timer?.remainingMs ?? 500;
    h.scheduler.advance(prepareRemaining);
    expect(runtime.engine.state).toBe('READING');
    expect(runtime.engine.timer?.durationMs).toBe(15_000);
    await vi.waitFor(() => expect(delayedPrepare).toHaveBeenCalled(), { timeout: 1_000 });
    await vi.waitFor(() => expect(runtime.engine.timer?.durationMs).not.toBe(15_000), { timeout: 5_000 });
    expect(runtime.engine.timer?.durationMs).toBeGreaterThan(DEFAULT_MC_READING_MS);
    expect(runtime.engine.state).toBe('READING');
    expect(runtime.engine.timer?.durationMs).toBeLessThan(15_000);
    h.scheduler.advance(80);
    expect(publicMessages.some((message) => message.payload.mcVoiceCue?.eventType === 'QUESTION')).toBe(true);
  });

  it('cắt cue reveal đã vào hàng đợi khi vào READING để QUESTION bắt đầu ngay', async () => {
    const h = await harness({ voice: true });
    const created = await h.quiz.app.inject({ method: 'POST', url: '/api/sessions', headers: AUTH,
      payload: { name: 'Cắt cue trước câu hỏi', config: { mode: 'MOCK', allowDemoQuestions: true, seed: 42,
        questionsPerRound: 10, mcVoiceEnabled: true, timings: { ...DEFAULT_TIMINGS, prepareMs: 500, answerMs: 3_000 } } } });
    expect(created.statusCode).toBe(201);
    const runtime = h.quiz.runtime()!;
    const publicMessages: Array<{ type: string; payload: { mcVoiceCue?: { eventType?: string; startsAtServerMs?: number } | null } }> = [];
    runtime.subscribe((batch) => publicMessages.push(...batch.filter((item) => item.audience === 'public').map((item) => item.message as never)));
    const send = async (type: string) => h.quiz.app.inject({ method: 'POST', url: `/api/sessions/${runtime.id}/commands`, headers: AUTH,
      payload: { commandId: randomUUID(), expectedStateVersion: runtime.engine.stateVersion, operatorId: 'test',
        requestedAtMs: h.scheduler.now(), command: { type } } });
    await send('OPEN_LOBBY');
    await send('START_ROUND');
    await vi.waitFor(() => expect(runtime.engine.state).toBe('PREPARE'), { timeout: 5_000 });
    await (runtime as unknown as { roundVoicePreparation: { promise: Promise<void> } }).roundVoicePreparation.promise;
    const privateRuntime = runtime as unknown as { scheduleVoiceCue: (...args: unknown[]) => unknown; voiceTailAtMs: number };
    privateRuntime.voiceTailAtMs = h.scheduler.now();
    privateRuntime.scheduleVoiceCue('ANSWER_REVEAL', 'a'.repeat(64), 5_000, () => true);
    h.scheduler.advance(80);
    expect(publicMessages.some((message) => message.payload.mcVoiceCue?.eventType === 'ANSWER_REVEAL')).toBe(true);
    privateRuntime.scheduleVoiceCue('LEADERBOARD_GENERIC', 'b'.repeat(64), 5_000, () => true);
    const prepareRemaining = runtime.engine.timer?.remainingMs ?? 500;
    h.scheduler.advance(prepareRemaining);
    expect(runtime.engine.state).toBe('READING');
    await vi.waitFor(() => expect(runtime.engine.timer?.durationMs).toBeGreaterThan(DEFAULT_MC_READING_MS), { timeout: 2_000 });
    const beforeQuestion = publicMessages.length;
    h.scheduler.advance(80);
    const newCues = publicMessages.slice(beforeQuestion).flatMap((message) => message.payload.mcVoiceCue ? [message.payload.mcVoiceCue] : []);
    expect(newCues.some((cue) => cue.eventType === 'QUESTION')).toBe(true);
    expect(newCues.some((cue) => cue.eventType === 'ANSWER_REVEAL')).toBe(false);
    expect(newCues.some((cue) => cue.eventType === 'LEADERBOARD_GENERIC')).toBe(false);
    expect(newCues.find((cue) => cue.eventType === 'QUESTION')?.startsAtServerMs).toBeLessThanOrEqual(h.scheduler.now());
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
