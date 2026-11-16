import { rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TIMINGS } from '@quiz/contracts';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { McVoiceCache, McVoiceService, buildApp, type McVoiceAudio, type McVoiceCredentialStore, type McVoiceProvider } from '@quiz/server';
import { testTempRootAsync } from '../support/tempRoot';
import { AUTH, makeQuestions, tempDbPath, TOKEN } from './helpers';
import { questionVoiceScripts } from '../../apps/server/src/voice/question-script';

type Harness = {
  quiz: Awaited<ReturnType<typeof buildApp>>;
  store: Store;
  scheduler: ManualScheduler;
  voiceCacheDirectory: string;
  provider: McVoiceProvider;
  service: McVoiceService;
};
const opened: Harness[] = [];

afterEach(async () => {
  for (const harness of opened.splice(0)) {
    await harness.quiz.close().catch(() => {});
    harness.store.close();
    await rm(harness.voiceCacheDirectory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

function fakeAudio(): McVoiceAudio {
  return { bytes: Buffer.from('mock-mc-audio'), durationMs: 1_000, format: 'mp3' };
}

async function harness() {
  const scheduler = new ManualScheduler();
  const store = new Store(tempDbPath());
  store.seedQuestions({ id: 'demo', name: 'Demo' }, makeQuestions(30), scheduler.now());
  const adapter = new MockAdapter();
  const voiceCacheDirectory = await testTempRootAsync('mc-voice-preselection-');
  const credentials: McVoiceCredentialStore = {
    get: async () => 'test-only-secret',
    set: async () => {},
    clear: async () => {},
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
    mcVoice: {
      credentials,
      service,
      cache: new McVoiceCache(voiceCacheDirectory),
      profile: { model: 'mock-model', voiceKey: 'mock-voice', rate: 1, voiceSettings: { voiceProfile: 'mock', rate: 1 } },
    },
  });
  const result = { quiz, store, scheduler, voiceCacheDirectory, provider, service };
  opened.push(result);
  return result;
}

async function createVoiceSession(h: Awaited<ReturnType<typeof harness>>, opts: { mcVoiceEnabled?: boolean; seed?: number; packId?: string } = {}) {
  const response = await h.quiz.app.inject({
    method: 'POST',
    url: '/api/sessions',
    headers: AUTH,
    payload: {
      name: 'Phiên test chọn vòng sớm',
      config: {
        mode: 'MOCK',
        packId: opts.packId ?? 'demo',
        allowDemoQuestions: true,
        seed: opts.seed ?? 42,
        questionsPerRound: 10,
        mcVoiceEnabled: opts.mcVoiceEnabled ?? true,
        timings: { ...DEFAULT_TIMINGS, prepareMs: 500, answerMs: 3_000 },
      },
    },
  });
  expect(response.statusCode).toBe(201);
  const runtime = h.quiz.runtime()!;
  const send = async (command: Record<string, unknown>) => h.quiz.app.inject({
    method: 'POST',
    url: `/api/sessions/${runtime.id}/commands`,
    headers: AUTH,
    payload: {
      commandId: randomUUID(),
      expectedStateVersion: runtime.engine.stateVersion,
      operatorId: 'test',
      requestedAtMs: h.scheduler.now(),
      command,
    },
  });
  return { runtime, send };
}

function questionInstanceIdForLines(lines: readonly { gameEvent: { type: string; questionInstanceId?: string } }[]) {
  const event = lines[0]?.gameEvent;
  if (event?.type !== 'QUESTION' || !event.questionInstanceId) throw new Error('Thiếu sự kiện đọc câu hỏi.');
  return event.questionInstanceId;
}

function altPackQuestions(): ReturnType<typeof makeQuestions> {
  return makeQuestions(30, 'alternate').map((question) => ({
    ...question,
    id: `alt-${question.id}`,
    prompt: `ALT: nội dung riêng ${question.id}?`,
    options: question.options.map((option) => ({ ...option, text: `ALT ${option.text}` })),
  }));
}

describe('MC Voice lựa chọn trước trong LOBBY', () => {
  it('chọn mà chưa ghi store; ưu tiên audio câu 1 trước các câu hỏi và reveal còn lại', async () => {
    const h = await harness();
    const timeline: string[] = [];
    const assetPromises: Promise<unknown>[] = [];
    const prepareQuestionReading = h.service.prepareQuestionReading.bind(h.service);
    const getOrCreate = h.service.getOrCreate.bind(h.service);
    const readingSpy = vi.spyOn(h.service, 'prepareQuestionReading').mockImplementation((lines, signal) => {
      timeline.push(`question:${questionInstanceIdForLines(lines)}`);
      return prepareQuestionReading(lines, signal);
    });
    vi.spyOn(h.service, 'getOrCreate').mockImplementation((descriptor, request, signal) => {
      if (descriptor.text.startsWith('Đáp án đúng là')) timeline.push(`reveal:${descriptor.text}`);
      const pending = getOrCreate(descriptor, request, signal);
      assetPromises.push(pending);
      return pending;
    });
    const { runtime, send } = await createVoiceSession(h);

    const beforeLobbyVersion = runtime.engine.stateVersion;
    expect((await send({ type: 'OPEN_LOBBY' })).statusCode).toBe(200);
    const lobbyVersion = runtime.engine.stateVersion;
    expect(lobbyVersion).toBeGreaterThan(beforeLobbyVersion);
    expect(h.store.nextRoundNumber(runtime.id)).toBe(1);
    expect(h.store.roundQuestions(`${runtime.id}:r1`)).toHaveLength(0);

    await vi.waitFor(() => expect(timeline.filter((entry) => entry.startsWith('question:'))).toHaveLength(10), { timeout: 30_000, interval: 50 });
    await vi.waitFor(() => expect(timeline.filter((entry) => entry.startsWith('reveal:'))).toHaveLength(10), { timeout: 30_000, interval: 50 });
    expect(timeline[0]).toMatch(/^question:/);
    expect(timeline.slice(0, 10).every((entry) => entry.startsWith('question:'))).toBe(true);
    expect(timeline.slice(10).every((entry) => entry.startsWith('reveal:'))).toBe(true);
    expect(runtime.engine.stateVersion).toBe(lobbyVersion);
    expect(h.store.nextRoundNumber(runtime.id)).toBe(1);
    expect(h.store.roundQuestions(`${runtime.id}:r1`)).toHaveLength(0);
    await Promise.allSettled([
      ...readingSpy.mock.results.map((result) => result.value),
      ...assetPromises,
    ]);

    expect((await send({ type: 'START_ROUND' })).statusCode).toBe(200);
    const snapshots = h.store.roundQuestions(`${runtime.id}:r1`).map((row) => row.snapshot);
    expect(snapshots).toHaveLength(10);
    const preselectedIds = readingSpy.mock.calls.map(([lines]) => questionInstanceIdForLines(lines));
    expect(preselectedIds).toEqual(snapshots.map((snapshot) => snapshot.questionInstanceId));
    for (const [index, snapshot] of snapshots.entries()) {
      const lines = readingSpy.mock.calls[index]![0];
      expect(lines.map((line) => ({ lineId: line.lineId, text: line.request.text }))).toEqual(
        questionVoiceScripts(snapshot.prompt, snapshot.options),
      );
    }
    expect(readingSpy).toHaveBeenCalledTimes(10); // START_ROUND dùng đúng snapshot đã pre-generate.
  });

  it('bỏ lựa chọn cũ khi pack đổi; audio cùng questionInstanceId vẫn phải khớp snapshot mới', async () => {
    const h = await harness();
    h.store.seedQuestions({ id: 'alternate', name: 'Alternate' }, altPackQuestions(), h.scheduler.now());
    let releaseOldRequest!: () => void;
    const oldRequestGate = new Promise<void>((resolve) => { releaseOldRequest = resolve; });
    vi.mocked(h.provider.synthesize).mockImplementation(async (request) => {
      if (request.text.startsWith('Câu hỏi thử nghiệm số')) await oldRequestGate;
      return fakeAudio();
    });
    const prepareQuestionReading = h.service.prepareQuestionReading.bind(h.service);
    const getOrCreate = h.service.getOrCreate.bind(h.service);
    const assetPromises: Promise<unknown>[] = [];
    let revealCount = 0;
    const readingSpy = vi.spyOn(h.service, 'prepareQuestionReading').mockImplementation((lines, signal) =>
      prepareQuestionReading(lines, signal));
    vi.spyOn(h.service, 'getOrCreate').mockImplementation((descriptor, request, signal) => {
      if (descriptor.text.startsWith('Đáp án đúng là')) revealCount += 1;
      const pending = getOrCreate(descriptor, request, signal);
      assetPromises.push(pending);
      return pending;
    });
    const { runtime, send } = await createVoiceSession(h);
    try {
      expect((await send({ type: 'OPEN_LOBBY' })).statusCode).toBe(200);
      await vi.waitFor(() => expect(readingSpy).toHaveBeenCalledTimes(1), { timeout: 30_000, interval: 50 });
      // Không có API đổi cấu hình trong khi chạy; mô phỏng thay đổi pack trong LOBBY để xác minh
      // chữ ký bảo vệ lựa chọn trước và trường hợp qid giữ nguyên nhưng nội dung snapshot thay đổi.
      runtime.session.config.packId = 'alternate';
      expect((await send({ type: 'START_ROUND' })).statusCode).toBe(200);
      const snapshots = h.store.roundQuestions(`${runtime.id}:r1`).map((row) => row.snapshot);
      expect(snapshots).toHaveLength(10);
      expect(snapshots.every((snapshot) => snapshot.questionId.startsWith('alt-'))).toBe(true);
      await vi.waitFor(() => expect(readingSpy.mock.calls.some(([lines]) => lines[0]!.request.text.startsWith('ALT:'))).toBe(true), { timeout: 30_000, interval: 50 });
      const currentQuestionLines = readingSpy.mock.calls.find(([lines]) => lines[0]!.request.text.startsWith('ALT:'))![0];
      expect(currentQuestionLines.map((line) => line.request.text)).toEqual(
        questionVoiceScripts(snapshots[0]!.prompt, snapshots[0]!.options).map((line) => line.text),
      );
      expect(questionInstanceIdForLines(currentQuestionLines)).toBe(snapshots[0]!.questionInstanceId);
    } finally {
      releaseOldRequest();
      await vi.waitFor(() => expect(readingSpy.mock.calls.filter(([lines]) => lines[0]!.request.text.startsWith('ALT:'))).toHaveLength(10), { timeout: 30_000, interval: 50 });
      await vi.waitFor(() => expect(revealCount).toBe(10), { timeout: 30_000, interval: 50 });
      await Promise.allSettled([
        ...readingSpy.mock.results.map((result) => result.value),
        ...assetPromises,
      ]);
    }
  });

  it('giữ nguyên lựa chọn và thứ tự đáp án với seed cố định so với phiên không preselect', async () => {
    const earlyHarness = await harness();
    const normalHarness = await harness();
    const earlyReading = earlyHarness.service.prepareQuestionReading.bind(earlyHarness.service);
    const earlyGetOrCreate = earlyHarness.service.getOrCreate.bind(earlyHarness.service);
    const earlyReadingSpy = vi.spyOn(earlyHarness.service, 'prepareQuestionReading').mockImplementation((lines, signal) =>
      earlyReading(lines, signal));
    const earlyAssets: Promise<unknown>[] = [];
    let earlyRevealCount = 0;
    vi.spyOn(earlyHarness.service, 'getOrCreate').mockImplementation((descriptor, request, signal) => {
      if (descriptor.text.startsWith('Đáp án đúng là')) earlyRevealCount += 1;
      const pending = earlyGetOrCreate(descriptor, request, signal);
      earlyAssets.push(pending);
      return pending;
    });
    const early = await createVoiceSession(earlyHarness, { mcVoiceEnabled: true, seed: 9876 });
    const normal = await createVoiceSession(normalHarness, { mcVoiceEnabled: false, seed: 9876 });
    expect((await early.send({ type: 'OPEN_LOBBY' })).statusCode).toBe(200);
    expect((await normal.send({ type: 'OPEN_LOBBY' })).statusCode).toBe(200);
    expect((await early.send({ type: 'START_ROUND' })).statusCode).toBe(200);
    expect((await normal.send({ type: 'START_ROUND' })).statusCode).toBe(200);
    const earlySnapshots = earlyHarness.store.roundQuestions(`${early.runtime.id}:r1`).map((row) => row.snapshot);
    const normalSnapshots = normalHarness.store.roundQuestions(`${normal.runtime.id}:r1`).map((row) => row.snapshot);
    const selection = (snapshots: typeof earlySnapshots) => snapshots.map(({ questionId, options, correctOptionId }) => ({
      questionId,
      options,
      correctOptionId,
    }));
    expect(selection(earlySnapshots)).toEqual(selection(normalSnapshots));
    await vi.waitFor(() => expect(earlyReadingSpy).toHaveBeenCalledTimes(10), { timeout: 30_000, interval: 50 });
    await vi.waitFor(() => expect(earlyRevealCount).toBe(10), { timeout: 30_000, interval: 50 });
    await Promise.allSettled([
      ...earlyReadingSpy.mock.results.map((result) => result.value),
      ...earlyAssets,
    ]);
  });

  it('không preselect và không gọi dịch vụ khi voiceEnabled false', async () => {
    const h = await harness();
    const readingSpy = vi.spyOn(h.service, 'prepareQuestionReading');
    const assetSpy = vi.spyOn(h.service, 'getOrCreate');
    const { runtime, send } = await createVoiceSession(h, { mcVoiceEnabled: false });
    expect((await send({ type: 'OPEN_LOBBY' })).statusCode).toBe(200);
    expect((await send({ type: 'START_ROUND' })).statusCode).toBe(200);
    expect(readingSpy).not.toHaveBeenCalled();
    expect(assetSpy).not.toHaveBeenCalled();
    expect(h.provider.synthesize).not.toHaveBeenCalled();
    expect(h.store.roundQuestions(`${runtime.id}:r1`)).toHaveLength(10);
  });
});
