import { randomUUID } from 'node:crypto';
import { createServer as createNetServer } from 'node:net';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createServer, type ViteDevServer } from '../../apps/dashboard/node_modules/vite/dist/node/index.js';
import { removeTestTempRoot, testTempRoot } from '../support/repoTemp';
import { ManualScheduler, MockAdapter, TikTokLiveAdapter, type TikTokConnectionLike } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { buildApp, type QuizApp } from '@quiz/server';
import type { CommandBody, PublicSnapshot } from '@quiz/contracts';
import { expect, test, type Page } from '@playwright/test';
import { makeQuestions, TOKEN } from '../integration/helpers';
import { getE2eAssetDirectory, usesE2ePlaceholderAssets } from './assets';

type Replay = {
  questionsPerRound: 10;
  primaryPlayer: { userId: string; nicknames: string[] };
  beforeOpen: { userId: string; nickname: string; eventId: string; text: string };
  afterClose: { userId: string; nickname: string; eventId: string; text: string };
  changeOfMind: {
    userId: string;
    nickname: string;
    firstEventId: string;
    secondEventId: string;
    firstText: string;
    secondText: string;
  };
  duplicateMessage: { userId: string; nickname: string; text: string };
  invalidTexts: string[];
  staleComment: { userId: string; nickname: string; eventId: string; sourceLagMs: number; text: string };
  roundComments: { eventId: string; text: string }[];
};

type SnapshotFrame = {
  seq: number;
  stateVersion: number;
  payload: PublicSnapshot;
};

const replay = JSON.parse(readFileSync(
  new URL('../../fixtures/replay/tiktok-comments-round.json', import.meta.url),
  'utf8',
)) as Replay;
const assetDirectory = getE2eAssetDirectory();
const kellyManifest = join(assetDirectory, 'mc', 'kelly', 'manifest.json');
const adminToken = TOKEN;
const cleanup: (() => Promise<void>)[] = [];

class ReplayConnection implements TikTokConnectionLike {
  private readonly handlers = new Map<string, ((data: any) => void)[]>();

  async connect() {
    return { roomId: 'c0062-synthetic-live' };
  }

  async disconnect() {}

  on(event: string, callback: (data: any) => void) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), callback]);
  }

  removeAllListeners(event?: string) {
    if (event) this.handlers.delete(event);
    else this.handlers.clear();
  }

  emit(event: string, data: unknown) {
    for (const callback of this.handlers.get(event) ?? []) callback(data);
  }
}

type RunningQuiz = {
  app: QuizApp;
  store: Store;
  scheduler: ManualScheduler;
  connection: ReplayConnection;
  backendUrl: string;
  dashboardUrl: string;
  overlayUrl: string;
  dashboardVite: ViteDevServer;
  overlayVite: ViteDevServer;
  dbPath: string;
};

async function freePort() {
  const listener = createNetServer();
  await new Promise<void>((resolvePromise, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolvePromise);
  });
  const address = listener.address();
  if (!address || typeof address === 'string') throw new Error('Không lấy được cổng tạm.');
  const { port } = address;
  await new Promise<void>((resolvePromise, reject) => listener.close((error) => error ? reject(error) : resolvePromise()));
  return port;
}

async function startVite(
  appRoot: string,
  configFile: string,
  port: number,
  backendUrl: string,
  withAssets: boolean,
) {
  const proxy = {
    '/api': backendUrl,
    ...(withAssets ? { '/assets': backendUrl } : {}),
    '/ws': { target: backendUrl.replace(/^http/, 'ws'), ws: true },
  };
  const vite = await createServer({
    root: appRoot,
    configFile,
    server: { host: '127.0.0.1', port, strictPort: true, proxy },
  });
  try {
    await vite.listen();
    return vite;
  } catch (error) {
    await vite.close().catch(() => {});
    throw error;
  }
}

async function closeResources(closers: (() => Promise<void>)[]) {
  const errors: unknown[] = [];
  for (const close of [...closers].reverse()) {
    try {
      await close();
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
}

async function boot(): Promise<RunningQuiz> {
  const closers: (() => Promise<void>)[] = [];
  let scratchDirectory = '';
  try {
    scratchDirectory = testTempRoot('playwright-c0062-');
    const dbPath = join(scratchDirectory, 'quiz.sqlite');
    const [backendPort, dashboardPort, overlayPort] = await Promise.all([freePort(), freePort(), freePort()]);
    const backendUrl = 'http://127.0.0.1:' + backendPort;
    const dashboardOrigin = 'http://127.0.0.1:' + dashboardPort;
    const overlayOrigin = 'http://127.0.0.1:' + overlayPort;
    const dashboardRoot = resolve(process.cwd(), 'apps/dashboard');
    const overlayRoot = resolve(process.cwd(), 'apps/overlay');
    const dashboardVite = await startVite(dashboardRoot, resolve(dashboardRoot, 'vite.config.ts'), dashboardPort, backendUrl, false);
    closers.push(() => dashboardVite.close());
    const overlayVite = await startVite(overlayRoot, resolve(overlayRoot, 'vite.config.ts'), overlayPort, backendUrl, true);
    closers.push(() => overlayVite.close());
    const scheduler = new ManualScheduler(Date.now());
    const store = new Store(dbPath);
    closers.push(async () => { store.close(); });
    store.seedQuestions({ id: 'demo', name: 'C-0062 replay' }, makeQuestions(replay.questionsPerRound), scheduler.now());
    for (const question of store.listQuestions('demo'))
      store.reviewQuestion(question.id, 'APPROVE', 'c0062-e2e', scheduler.now());

    const connection = new ReplayConnection();
    const characterManifestPath = join(assetDirectory, 'chibi', 'manifest.json');
    const characterPool = existsSync(characterManifestPath)
      ? (JSON.parse(readFileSync(characterManifestPath, 'utf8')) as { characters?: { id: string }[] }).characters?.map((item) => item.id)
      : undefined;
    const app = await buildApp({
      store,
      scheduler,
      adminToken,
      allowedOrigins: [dashboardOrigin, overlayOrigin],
      webRoots: { assets: assetDirectory },
      ...(characterPool?.length ? { characterPool } : {}),
      adapterFactory: (mode, config) => mode === 'MOCK'
        ? new MockAdapter()
        : new TikTokLiveAdapter({
          username: config.tiktokUsername ?? 'synthetic_live',
          scheduler,
          createConnection: () => connection,
          reconnect: { baseMs: 1_000, maxMs: 4_000, maxAttempts: 4 },
        }),
    });
    closers.push(async () => { await app.close(); });
    await app.app.listen({ host: '127.0.0.1', port: backendPort });

    const running: RunningQuiz = {
      app,
      store,
      scheduler,
      connection,
      backendUrl,
      dashboardUrl: dashboardOrigin,
      overlayUrl: overlayOrigin + '/overlay/',
      dashboardVite,
      overlayVite,
      dbPath,
    };
    cleanup.push(async () => {
      const errors = await closeResources(closers);
      removeTestTempRoot(scratchDirectory);
      if (errors.length) throw new AggregateError(errors, 'Không đóng sạch được stack live-round.');
    });
    return running;
  } catch (error) {
    await closeResources(closers);
    if (scratchDirectory) removeTestTempRoot(scratchDirectory);
    throw error;
  }
}
test.afterEach(async () => {
  const errors = await closeResources(cleanup.splice(0));
  if (errors.length) throw new AggregateError(errors, 'Lỗi khi dọn E2E sau test.');
});

test('C-0203: fastestCorrectAnswer từ server MOCK hiện trên overlay; mcVoiceEnabled không tự phát giọng', async ({ page }) => {
  test.setTimeout(90_000);
  const running = await boot();
  const created = await running.app.app.inject({
    method: 'POST',
    url: '/api/sessions',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      name: 'C-0203 kiểm tra overlay MOCK',
      config: {
        mode: 'MOCK',
        packId: 'demo',
        questionsPerRound: 10,
        allowDemoQuestions: true,
        seed: 42,
        mcVoiceEnabled: true,
        timings: { lobbyMs: 0, prepareMs: 500, answerMs: 20_000, revealMs: 500 },
      },
    },
  });
  expect(created.statusCode).toBe(201);
  const sessionId = (created.json() as { sessionId: string }).sessionId;
  const runtime = currentRuntime(running.app);
  expect(runtime.config.mcVoiceEnabled).toBe(true);
  await expect.poll(() => runtime.liveHealth().status).toBe('CONNECTED');

  const overlay = await page.context().newPage();
  await overlay.setViewportSize({ width: 1080, height: 1920 });
  const voiceRequests: string[] = [];
  overlay.on('request', (request) => {
    const pathname = new URL(request.url()).pathname;
    if (/\/(?:api\/mc-voice|assets\/mc\/voice)(?:\/|$)/.test(pathname)) voiceRequests.push(pathname);
  });
  await overlay.goto(running.overlayUrl);
  const stage = overlay.getByTestId('stage');
  await expect(stage).toBeVisible();

  await commandMockRound(running, sessionId, { type: 'OPEN_LOBBY' });
  await expect(stage).toHaveAttribute('data-scene', 'LOBBY');
  await commandMockRound(running, sessionId, { type: 'START_ROUND', questionCount: 10 });
  let sawReading = runtime.engine.state === 'READING';
  runUntil(running, () => {
    if (runtime.engine.state === 'READING') sawReading = true;
    return runtime.engine.state === 'ACCEPTING';
  });
  expect(sawReading).toBe(true);
  await expect(stage).toHaveAttribute('data-state', 'ACCEPTING');

  const correctOptionId = runtime.adminSnapshot().current!.correctOptionId;
  expect(runtime.mockComment({
    userId: 'c0203-synthetic-player',
    displayName: 'StormKing',
    text: correctOptionId,
    eventId: 'c0203-fastest-correct',
  }).ok).toBe(true);
  running.scheduler.advance(runtime.config.timings.answerMs);
  expect(runtime.engine.state).toBe('REVEAL');
  await expect(stage).toHaveAttribute('data-scene', 'REVEAL');

  const fastest = runtime.adminSnapshot().public.fastestCorrectAnswer;
  expect(fastest).toMatchObject({ safeDisplayName: 'StormKing', responseMs: expect.any(Number) });
  const callout = stage.getByTestId('fastest-callout');
  await expect(callout).toContainText('StormKing');
  await expect(callout).toContainText('NHANH NHẤT');
  await expect(stage.locator('.v3-seat-name.is-fastest')).toHaveCount(1);
  expect(JSON.stringify(runtime.adminSnapshot().public.fastestCorrectAnswer)).not.toContain('c0203-synthetic-player');

  const reviewDirectory = join(process.cwd(), '.claude', 'review', 'C0203');
  mkdirSync(reviewDirectory, { recursive: true });
  const screenshotPath = join(reviewDirectory, 'mock-server-fastest-overlay.png');
  await stage.screenshot({ path: screenshotPath, animations: 'disabled' });
  expect(voiceRequests).toEqual([]);
  await expect(overlay.locator('audio')).toHaveCount(0);
  console.log(`C-0203 MOCK server round: mcVoiceEnabled=true; fastest shown for StormKing; MC Voice requests=0; audio elements=0; screenshot=${screenshotPath}`);
});

function watchPage(
  page: Page,
  consoleErrors: string[],
  resource404Messages: string[],
  response404s: string[],
  asset404s: Set<string>,
  assetManifestRequests: string[],
) {
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (message.text().startsWith('Failed to load resource:')) resource404Messages.push(message.text());
    else consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    const url = new URL(response.url());
    const requestUrl = `${url.origin}${url.pathname}`;
    if (url.pathname === '/assets/mc/kelly/manifest.json') assetManifestRequests.push(requestUrl);
    if (response.status() !== 404) return;
    response404s.push(requestUrl);
    if (url.pathname.startsWith('/assets/')) asset404s.add(`${url.origin}${url.pathname}`);
  });
}

function observeOverlay(page: Page, frames: SnapshotFrame[]) {
  page.on('websocket', (socket) => {
    if (new URL(socket.url()).pathname !== '/ws') return;
    socket.on('framereceived', (frame) => {
      try {
        const message = JSON.parse(String(frame.payload)) as {
          type?: string; seq?: number; stateVersion?: number; payload?: PublicSnapshot;
        };
        if (
          message.type === 'STATE_SNAPSHOT' &&
          Number.isSafeInteger(message.seq) &&
          Number.isSafeInteger(message.stateVersion) &&
          message.payload
        ) frames.push({ seq: message.seq!, stateVersion: message.stateVersion!, payload: message.payload });
      } catch {
        // Bỏ qua frame không phải JSON STATE_SNAPSHOT (ví dụ ping/HMR).
      }
    });
  });
}

function currentRuntime(app: QuizApp) {
  const runtime = app.runtime();
  if (!runtime) throw new Error('Server chưa tạo runtime phiên TikTok.');
  return runtime;
}

function runUntil(
  running: RunningQuiz,
  condition: () => boolean,
  maxMs = 180_000,
) {
  let spent = 0;
  while (!condition()) {
    if (spent >= maxMs) throw new Error(`Quá thời gian tua trạng thái (state=${currentRuntime(running.app).engine.state}).`);
    running.scheduler.advance(100);
    spent += 100;
  }
}

function emitComment(
  running: RunningQuiz,
  input: { userId: string; nickname: string; text: string; eventId?: string; sourceLagMs?: number },
) {
  running.connection.emit('chat', {
    common: {
      ...(input.eventId ? { msgId: input.eventId } : {}),
      createTime: String(running.scheduler.now() - (input.sourceLagMs ?? 0)),
    },
    user: { id: input.userId, nickname: input.nickname },
    content: input.text,
  });
}

async function commandMockRound(running: RunningQuiz, sessionId: string, command: CommandBody) {
  const runtime = currentRuntime(running.app);
  const response = await running.app.app.inject({
    method: 'POST',
    url: `/api/sessions/${encodeURIComponent(sessionId)}/commands`,
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      commandId: randomUUID(),
      expectedStateVersion: runtime.engine.stateVersion,
      operatorId: 'c0203-e2e',
      requestedAtMs: running.scheduler.now(),
      command,
    },
  });
  if (response.statusCode !== 200) throw new Error(`Lệnh MOCK lỗi ${response.statusCode}: ${response.body}`);
}

function acceptedAnswerCount(running: RunningQuiz) {
  const counts = currentRuntime(running.app).adminSnapshot().current?.optionCounts;
  if (!counts) throw new Error('Chưa có câu hỏi mở để đọc số câu trả lời.');
  return counts.A + counts.B + counts.C + counts.D;
}

async function measureTenSecondFps(page: Page) {
  return page.evaluate(() => new Promise<{ elapsedMs: number; frameCount: number; averageFps: number; secondBuckets: number[] }>((resolvePromise) => {
    const start = performance.now();
    let frameCount = 0;
    let bucket = 0;
    let bucketFrames = 0;
    const secondBuckets: number[] = [];
    const tick = (now: number) => {
      frameCount += 1;
      bucketFrames += 1;
      const elapsed = now - start;
      const nextBucket = Math.floor(elapsed / 1_000);
      if (nextBucket > bucket) {
        if (bucketFrames > 0) secondBuckets.push(bucketFrames);
        bucketFrames = 0;
        bucket = nextBucket;
      }
      if (elapsed >= 10_000) {
        if (bucketFrames > 0) secondBuckets.push(bucketFrames);
        resolvePromise({
          elapsedMs: elapsed,
          frameCount,
          averageFps: frameCount * 1_000 / elapsed,
          secondBuckets,
        });
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
}

function normalized(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function overlayDisplayName(name: string) {
  const graphemes = Array.from(
    new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(name),
    ({ segment }) => segment,
  );
  return graphemes.length <= 16 ? name : `${graphemes.slice(0, 15).join('')}…`;
}

test('C-0062: trình duyệt chạy đủ vòng TikTok bằng server thật và replay giả', async ({ page }) => {
  test.skip(usesE2ePlaceholderAssets(), 'TIKTOK cần assets-local thật; bộ giữ chỗ chỉ dùng cho UI/CI MOCK.');
  test.setTimeout(240_000);
  const running = await boot();
  const frames: SnapshotFrame[] = [];
  const consoleErrors: string[] = [];
  const resource404Messages: string[] = [];
  const response404s: string[] = [];
  const asset404s = new Set<string>();
  const assetManifestRequests: string[] = [];
  const overlay = await page.context().newPage();
  watchPage(page, consoleErrors, resource404Messages, response404s, asset404s, assetManifestRequests);
  watchPage(overlay, consoleErrors, resource404Messages, response404s, asset404s, assetManifestRequests);
  observeOverlay(overlay, frames);

  await page.addInitScript(() => localStorage.setItem('quiz.setupDone', '1'));
  await page.goto(`${running.dashboardUrl}/dashboard/`);
  await page.getByLabel('Mã quản trị').fill(adminToken);
  await page.getByRole('button', { name: 'Kết nối', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tạo phiên MOCK' })).toBeVisible();
  await page.getByRole('button', { name: 'TikTok LIVE', exact: true }).click();
  await page.getByLabel('Số câu mỗi vòng').selectOption(String(replay.questionsPerRound));
  await page.getByLabel('TikTok username').fill('@synthetic_live');
  const createButton = page.getByRole('button', { name: 'Tạo phiên và mở Live Control' });
  await expect(createButton).toBeEnabled();
  await createButton.click();
  await expect(page.getByTestId('connection-manager')).toContainText('@synthetic_live');
  const runtime = currentRuntime(running.app);
  await expect.poll(() => runtime.liveHealth().status).toBe('CONNECTED');

  const sessionId = runtime.id;
  const beforeIdCount = runtime.metrics.accepted;
  emitComment(running, replay.beforeOpen);
  expect(runtime.metrics.accepted).toBe(beforeIdCount);
  expect(runtime.metrics.rejected.NOT_ACCEPTING).toBe(1);

  await overlay.setViewportSize({ width: 1080, height: 1920 });
  await overlay.goto(running.overlayUrl);
  const stage = overlay.getByTestId('stage');
  await expect(stage).toHaveAttribute('data-scene', 'LOBBY');
  await expect(overlay.getByTestId('brand-logo')).toBeVisible();

  await page.getByRole('button', { name: 'Mở sảnh', exact: true }).click();
  await expect(stage).toHaveAttribute('data-scene', 'LOBBY');
  await page.getByRole('button', { name: 'Bắt đầu vòng', exact: true }).click();
  runUntil(running, () => runtime.engine.state === 'ACCEPTING' && runtime.engine.round?.questionIndex === 0);
  await expect(stage).toHaveAttribute('data-scene', 'QUESTION');

  const firstCorrect = runtime.adminSnapshot().current!.correctOptionId;
  const firstRoundComment = replay.roundComments[0]!;
  const correctLower = firstCorrect.toLocaleLowerCase('en');
  emitComment(running, {
    userId: replay.primaryPlayer.userId,
    nickname: replay.primaryPlayer.nicknames[0]!,
    text: firstRoundComment.text.replace('{correctLower}', correctLower),
    eventId: firstRoundComment.eventId,
  });
  emitComment(running, {
    ...replay.duplicateMessage,
    text: replay.duplicateMessage.text.replace('{correct}', firstCorrect),
    eventId: firstRoundComment.eventId,
  });
  emitComment(running, {
    userId: replay.changeOfMind.userId,
    nickname: replay.changeOfMind.nickname,
    text: replay.changeOfMind.firstText,
    eventId: replay.changeOfMind.firstEventId,
  });
  emitComment(running, {
    userId: replay.changeOfMind.userId,
    nickname: replay.changeOfMind.nickname,
    text: replay.changeOfMind.secondText,
    eventId: replay.changeOfMind.secondEventId,
  });
  for (const [index, text] of replay.invalidTexts.entries())
    emitComment(running, {
      userId: `replay-invalid-${String(index + 1).padStart(3, '0')}`,
      nickname: 'Người Xem Giả',
      text,
      eventId: `replay-invalid-${String(index + 1).padStart(3, '0')}`,
    });
  for (let index = 0; index < 33; index += 1)
    emitComment(running, {
      userId: `replay-crowd-${String(index + 1).padStart(2, '0')}`,
      nickname: `Khán giả tổng hợp ${String(index + 1).padStart(2, '0')}`,
      text: firstCorrect,
      eventId: `replay-crowd-answer-${String(index + 1).padStart(2, '0')}`,
    });
  emitComment(running, {
    ...replay.staleComment,
    text: replay.staleComment.text.replace('{correct}', firstCorrect),
  });
  expect(acceptedAnswerCount(running)).toBe(35);
  expect(runtime.metrics.accepted).toBe(35);
  running.scheduler.advance(300);
  await expect(overlay.getByTestId('answer-count')).toHaveCount(0);
  expect(acceptedAnswerCount(running)).toBe(35);

  const firstAcceptingSnapshot = [...frames].reverse().find((frame) => frame.payload.state === 'ACCEPTING');
  expect(firstAcceptingSnapshot).toBeDefined();
  expect(JSON.stringify(firstAcceptingSnapshot?.payload)).not.toContain('correctOptionId');
  const concealed = await stage.evaluate((element) => ({ html: element.innerHTML, text: element.textContent ?? '' }));
  expect(concealed.html).not.toMatch(/correctOptionId|data-correct|is-correct/i);
  expect(concealed.text).not.toMatch(/đáp án đúng/i);

  const disconnectVersion = runtime.engine.stateVersion;
  const disconnectSeq = frames.at(-1)?.seq ?? 0;
  await overlay.goto('about:blank');
  await expect.poll(() => runtime.adminSnapshot().overlay.clients).toBe(0);
  const firstReopenedFrameIndex = frames.length;
  await overlay.goto(running.overlayUrl);
  await expect(overlay.getByTestId('stage')).toHaveAttribute('data-scene', 'QUESTION');
  await expect.poll(() => frames.length > firstReopenedFrameIndex).toBe(true);
  const freshSnapshot = frames[firstReopenedFrameIndex]!;
  expect(freshSnapshot.seq).toBeGreaterThan(disconnectSeq);
  expect(freshSnapshot.stateVersion).toBeGreaterThanOrEqual(disconnectVersion);
  expect(freshSnapshot.payload.stateVersion).toBe(runtime.engine.stateVersion);
  expect(freshSnapshot.payload.scene).toBe(runtime.adminSnapshot().public.scene);
  await expect(overlay.getByTestId('audience-seat')).toHaveCount(35);
  await expect(overlay.getByTestId('audience-seat').locator('img')).toHaveCount(35);
  const frameSeqs = frames.map((frame) => frame.seq);
  expect(frameSeqs.every((seq, index) => index === 0 || seq > frameSeqs[index - 1]!)).toBe(true);
  const stateVersions = frames.map((frame) => frame.payload.stateVersion);
  expect(stateVersions.every((version, index) => index === 0 || version >= stateVersions[index - 1]!)).toBe(true);

  const fps = await measureTenSecondFps(overlay);
  expect(fps.elapsedMs).toBeGreaterThanOrEqual(10_000);
  expect(fps.frameCount).toBeGreaterThan(0);
  console.log(`C-0062 FPS QUESTION / 35 ghế: ${fps.averageFps.toFixed(1)} FPS trung bình; ${fps.frameCount} frame / ${fps.elapsedMs.toFixed(0)} ms; từng giây=${fps.secondBuckets.join(',')}.`);

  running.scheduler.advance(runtime.config.timings.answerMs);
  await expect.poll(() => runtime.engine.state).toBe('REVEAL');
  await expect(overlay.getByTestId('stage')).toHaveAttribute('data-scene', 'REVEAL');
  const revealed = runtime.adminSnapshot().current!;
  const revealSnapshot = [...frames].reverse().find((frame) => frame.payload.state === 'REVEAL');
  expect(revealSnapshot?.payload.reveal?.correctOptionId).toBe(revealed.correctOptionId);
  await expect(overlay.getByTestId('option-list')).toContainText('%');
  const acceptedBeforeClosedComment = runtime.metrics.accepted;
  emitComment(running, replay.afterClose);
  expect(runtime.metrics.accepted).toBe(acceptedBeforeClosedComment);
  expect(runtime.metrics.rejected.NOT_ACCEPTING).toBe(2);

  for (let questionIndex = 1; questionIndex < replay.questionsPerRound; questionIndex += 1) {
    runUntil(running, () => runtime.engine.state === 'ACCEPTING' && runtime.engine.round?.questionIndex === questionIndex);
    await expect(overlay.getByTestId('stage')).toHaveAttribute('data-scene', 'QUESTION');
    const correct = runtime.adminSnapshot().current!.correctOptionId;
    const entry = replay.roundComments[questionIndex]!;
    emitComment(running, {
      userId: replay.primaryPlayer.userId,
      nickname: replay.primaryPlayer.nicknames[questionIndex % replay.primaryPlayer.nicknames.length]!,
      text: entry.text.replace('{correctLower}', correct.toLocaleLowerCase('en')),
      eventId: entry.eventId,
    });
    expect(acceptedAnswerCount(running)).toBe(1);
    running.scheduler.advance(300);
    await expect(overlay.getByTestId('answer-count')).toHaveCount(0);
    running.scheduler.advance(runtime.config.timings.answerMs);
    await expect.poll(() => runtime.engine.state).toBe('REVEAL');
    await expect(overlay.getByTestId('stage')).toHaveAttribute('data-scene', 'REVEAL');

    if (questionIndex === 4) {
      runUntil(running, () => runtime.engine.state === 'LEADERBOARD' && runtime.adminSnapshot().public.scene === 'INTERIM_TOP10');
      await expect(overlay.getByTestId('stage')).toHaveAttribute('data-scene', 'INTERIM_TOP10');
      const publicResponse = await fetch(`${running.backendUrl}/api/sessions/${sessionId}/state`);
      expect(publicResponse.status).toBe(200);
      const publicState = await publicResponse.json() as PublicSnapshot;
      const entries = publicState.leaderboard?.entries ?? [];
      expect(entries).toHaveLength(10);

      const overlayRows = overlay.getByTestId('v3-top10-large').getByTestId('leaderboard-row');
      await expect(overlayRows).toHaveCount(entries.length);
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index]!;
        const row = overlayRows.nth(index);
        const rowText = normalized(await row.innerText());
        const overlayName = row.locator('.v3-full-name-text');
        const displayName = overlayDisplayName(entry.safeDisplayName);
        expect(rowText).toContain(String(entry.rank));
        await expect(overlayName).toHaveAttribute('title', entry.safeDisplayName);
        await expect(overlayName).toHaveText(displayName);
        expect(rowText).toContain(displayName);
        expect(rowText).toContain(entry.score.toLocaleString('vi-VN'));
      }

      const dashboardRows = page.locator('.dashboard-leaderboard-row');
      await expect(dashboardRows).toHaveCount(entries.length);
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index]!;
        const dashboardRow = normalized(await dashboardRows.nth(index).innerText());
        expect(dashboardRow).toContain(String(entry.rank));
        expect(dashboardRow).toContain(entry.safeDisplayName);
        expect(dashboardRow).toContain(entry.score.toLocaleString('vi-VN'));
      }
      await expect(page.getByRole('heading', { name: 'Top 10' })).toBeVisible();
    }
  }

  runUntil(running, () => runtime.engine.state === 'VICTORY', 180_000);
  await expect(overlay.getByTestId('stage')).toHaveAttribute('data-scene', 'VICTORY');
  await expect(overlay.getByTestId('podium-slot-1')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vinh danh', exact: true })).toBeVisible();

  const observedStates = new Set(frames.map((frame) => frame.payload.state));
  const observedScenes = new Set(frames.map((frame) => frame.payload.scene));
  for (const state of ['LOBBY', 'PREPARE', 'ACCEPTING', 'REVEAL', 'LEADERBOARD', 'VICTORY'])
    expect(observedStates, `Thiếu state ${state} trong WebSocket overlay`).toContain(state);
  for (const scene of ['LOBBY', 'QUESTION', 'REVEAL', 'INTERIM_TOP10', 'VICTORY'])
    expect(observedScenes, `Thiếu scene ${scene} trong WebSocket overlay`).toContain(scene);

  expect(consoleErrors).toEqual([]);
  const missingKellyManifestUrl = `${new URL(running.overlayUrl).origin}/assets/mc/kelly/manifest.json`;
  const optionalManifest404s = response404s.filter((url) => url === missingKellyManifestUrl);
  const optionalAudio404s = response404s.filter((url) => {
    const pathname = new URL(url).pathname;
    return /^\/assets\/audio\/(question-enter|countdown-tick|timeout|correct-answer|top10|victory|transition|bgm)\.(mp3|ogg)$/.test(pathname);
  });
  const optionalVideo404s = response404s.filter((url) => /^\/assets\/arena\/bg-loop\.(webm|mp4)$/.test(new URL(url).pathname));
  const unexpected404s = response404s.filter((url) => url !== missingKellyManifestUrl && !optionalAudio404s.includes(url) && !optionalVideo404s.includes(url));
  const uniqueAsset404s = [...asset404s].sort();
  const expected404Assets = [...new Set([...(optionalManifest404s.length ? [missingKellyManifestUrl] : []), ...optionalAudio404s, ...optionalVideo404s])].sort();
  // Có hai document overlay vì bài test ngắt rồi mở lại page; mỗi module/document chỉ tải manifest một lần.
  expect(assetManifestRequests, 'Mỗi document overlay chỉ được yêu cầu manifest MC một lần').toHaveLength(2);
  expect(unexpected404s, 'Chỉ chấp nhận 404 cho manifest MC, các khe audio và video loop tuỳ chọn không có file').toEqual([]);
  expect(optionalManifest404s.length).toBe(asset404s.has(missingKellyManifestUrl) ? assetManifestRequests.length : 0);
  expect(resource404Messages, 'Mỗi resource 404 tuỳ chọn có một console resource error').toHaveLength(optionalManifest404s.length + optionalAudio404s.length + optionalVideo404s.length);
  expect(uniqueAsset404s).toEqual(expected404Assets);
  console.log(`C-0062 hoàn tất vòng 10 câu; FPS trung bình=${fps.averageFps.toFixed(1)}; manifestRequests=${assetManifestRequests.length}; asset404=${JSON.stringify(uniqueAsset404s)}; DB scratch=${running.dbPath}.`);
});
