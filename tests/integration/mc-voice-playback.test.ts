import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TIMINGS, type McVoiceLeasePayload, type McVoicePlayPayload, type WsMessage } from '@quiz/contracts';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import {
  McVoiceCache,
  McVoiceService,
  buildApp,
  mcVoiceCacheKey,
  type McVoiceAudio,
  type McVoiceCredentialStore,
  type McVoiceProvider,
} from '@quiz/server';
import { AUTH, makeQuestions, tempDbPath, TOKEN } from './helpers';

const OWNER = 'c7b7a3bc-5d67-4e85-a4bf-2d46b747c01a';
const SECONDARY = '4f541bc0-1f98-4b18-bc42-9e193f719a8b';
const CACHE_TOKEN = 'test-only-cache-token';

type TestHarness = { quiz: Awaited<ReturnType<typeof buildApp>>; store: Store; cacheDir: string; scheduler: ManualScheduler; sockets: WebSocket[]; port: number };
const opened: TestHarness[] = [];

function fakeAudio(): McVoiceAudio {
  return { bytes: Buffer.from('fake-mp3-voice'), durationMs: 700, format: 'mp3' };
}

async function makeHarness(): Promise<TestHarness> {
  const scheduler = new ManualScheduler();
  const store = new Store(tempDbPath());
  const questions = makeQuestions(40);
  store.seedQuestions({ id: 'demo', name: 'Demo' }, questions, scheduler.now());
  const cacheDir = await mkdtemp(join(tmpdir(), 'mc-voice-playback-cache-'));
  const cache = new McVoiceCache(cacheDir);
  const profile = { model: 'runtime-model', voiceKey: 'runtime-voice', rate: 1, voiceSettings: { voiceProfile: 'runtime-voice', rate: 1 } };
  for (const question of questions) {
    const lines = [question.prompt, ...question.options.map((option) => option.text)];
    for (const text of lines) {
      const assetId = mcVoiceCacheKey({
        text, provider: 'clipai', model: profile.model, voiceKey: profile.voiceKey,
        voiceSettings: profile.voiceSettings, rate: profile.rate, format: 'mp3',
      });
      await cache.put(assetId, fakeAudio());
    }
  }
  const credentials: McVoiceCredentialStore = {
    get: async () => CACHE_TOKEN,
    set: async () => {},
    clear: async () => {},
  };
  const provider: McVoiceProvider = { synthesize: async () => { throw new Error('Không được gọi provider trong test phát cache.'); } };
  const service = new McVoiceService(provider, cache, credentials, { normalize: async (audio) => audio });
  const adapter = new MockAdapter();
  const quiz = await buildApp({
    store, scheduler, adminToken: TOKEN, adapterFactory: () => adapter,
    mcVoice: { credentials, service, profile, cache },
  });
  await quiz.app.listen({ host: '127.0.0.1', port: 0 });
  const address = quiz.app.server.address() as AddressInfo;
  const harness = { quiz, store, cacheDir, scheduler, sockets: [], port: address.port };
  opened.push(harness);
  return harness;
}

async function connectOverlay(h: TestHarness, overlayInstanceId: string) {
  const socket = new WebSocket(`ws://127.0.0.1:${h.port}/ws`);
  h.sockets.push(socket);
  const messages: Array<Record<string, unknown>> = [];
  const waiters: Array<{ predicate: (message: Record<string, unknown>) => boolean; resolve: (message: Record<string, unknown>) => void }> = [];
  socket.on('message', (data) => {
    let value: unknown;
    try { value = JSON.parse(String(data)); } catch { return; }
    if (!value || typeof value !== 'object') return;
    const message = value as Record<string, unknown>;
    messages.push(message);
    for (let i = waiters.length - 1; i >= 0; i -= 1) {
      const waiter = waiters[i]!;
      if (waiter.predicate(message)) {
        waiters.splice(i, 1);
        waiter.resolve(message);
      }
    }
  });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout kết nối WebSocket overlay.')), 5_000);
    socket.once('error', reject);
    socket.once('open', () => {
      clearTimeout(timeout);
      socket.send(JSON.stringify({ type: 'HELLO', role: 'overlay', overlayInstanceId }));
      resolve();
    });
  });
  return {
    socket,
    messages,
    waitFor: (predicate: (message: Record<string, unknown>) => boolean) => {
      const existing = messages.find(predicate);
      if (existing) return Promise.resolve(existing);
      return new Promise<Record<string, unknown>>((resolve) => waiters.push({ predicate, resolve }));
    },
  };
}

async function closeSocket(socket: WebSocket) {
  if (socket.readyState === WebSocket.CLOSED) return;
  await new Promise<void>((resolve) => {
    socket.once('close', () => resolve());
    socket.close();
  });
}

async function callCommand(h: TestHarness, sessionId: string, type: 'OPEN_LOBBY' | 'START_ROUND') {
  const runtime = h.quiz.runtime();
  if (!runtime) throw new Error('Runtime chưa khởi tạo.');
  return h.quiz.app.inject({
    method: 'POST',
    url: `/api/sessions/${sessionId}/commands`,
    headers: AUTH,
    payload: {
      commandId: randomUUID(), expectedStateVersion: runtime.engine.stateVersion,
      operatorId: 'test', requestedAtMs: h.scheduler.now(), command: { type },
    },
  });
}

afterEach(async () => {
  for (const h of opened.splice(0)) {
    for (const socket of h.sockets) await closeSocket(socket).catch(() => {});
    await h.quiz.close().catch(() => {});
    h.store.close();
    await rm(h.cacheDir, { recursive: true, force: true });
  }
});

describe('MC Voice owner lease và playback API', () => {
  it('chỉ gửi sequence cho primary, fetch audio và ACK hoàn tất bằng lease; đổi owner cần xác nhận', async () => {
    const h = await makeHarness();
    const selected = await h.quiz.app.inject({
      method: 'PUT', url: '/api/mc-voice/settings', headers: AUTH,
      payload: { primaryOverlayInstanceId: OWNER },
    });
    expect(selected.statusCode).toBe(200);
    const overlays = await h.quiz.app.inject({ method: 'GET', url: '/api/mc-voice/overlays', headers: AUTH });
    expect(overlays.json()).toEqual({ primaryOverlayInstanceId: OWNER, activeOverlayInstanceIds: [] });

    const owner = await connectOverlay(h, OWNER);
    const secondary = await connectOverlay(h, SECONDARY);
    const grantedMessage = await owner.waitFor((message) => message.type === 'MC_VOICE_LEASE' &&
      (message.payload as McVoiceLeasePayload).status === 'GRANTED');
    const granted = grantedMessage.payload as McVoiceLeasePayload;
    const leaseToken = granted.leaseToken!;
    expect(leaseToken).toBeTruthy();
    const nonOwnerMessage = await secondary.waitFor((message) => message.type === 'MC_VOICE_LEASE');
    expect(nonOwnerMessage.payload).toMatchObject({ status: 'NOT_OWNER', overlayInstanceId: SECONDARY });
    expect(JSON.stringify(nonOwnerMessage)).not.toContain('leaseToken');

    const created = await h.quiz.app.inject({
      method: 'POST', url: '/api/sessions', headers: AUTH,
      payload: {
        name: 'Phiên voice test',
        config: {
          mode: 'MOCK', packId: 'demo', questionsPerRound: 10, seed: 42, allowDemoQuestions: true,
          mcVoiceEnabled: true,
          timings: { ...DEFAULT_TIMINGS, lobbyMs: 60_000, prepareMs: 500, answerMs: 3_000 },
        },
      },
    });
    expect(created.statusCode).toBe(201);
    const sessionId = created.json().sessionId as string;
    expect((await callCommand(h, sessionId, 'OPEN_LOBBY')).statusCode).toBe(200);
    expect((await callCommand(h, sessionId, 'START_ROUND')).statusCode).toBe(200);
    h.scheduler.advance(500);
    expect(h.quiz.runtime()?.engine.state).toBe('READING');

    const playMessage = await owner.waitFor((message) => message.type === 'MC_VOICE_PLAY');
    const play = playMessage.payload as McVoicePlayPayload;
    expect(play.lines).toHaveLength(5);
    expect(play.lines.map((line) => line.lineId)).toEqual(['prompt', 'option-A', 'option-B', 'option-C', 'option-D']);
    expect(JSON.stringify(playMessage)).not.toContain(leaseToken);
    expect(secondary.messages.some((message) => message.type === 'MC_VOICE_PLAY')).toBe(false);

    const unauthenticatedAsset = await h.quiz.app.inject({ method: 'GET', url: `/api/mc-voice/assets/${play.lines[0]!.assetId}` });
    expect(unauthenticatedAsset.statusCode).toBe(401);
    const unauthorizedCompletion = await h.quiz.app.inject({
      method: 'POST', url: '/api/mc-voice/playback/complete',
      payload: { questionInstanceId: play.questionInstanceId, expectedStateVersion: playMessage.stateVersion, result: 'FINISHED' },
    });
    expect(unauthorizedCompletion.statusCode).toBe(401);

    const headers = { origin: `http://127.0.0.1:${h.port}`, host: `127.0.0.1:${h.port}`, 'x-mc-voice-lease': leaseToken };
    const asset = await h.quiz.app.inject({ method: 'GET', url: `/api/mc-voice/assets/${play.lines[0]!.assetId}`, headers });
    expect(asset.statusCode).toBe(200);
    expect(asset.headers['content-type']).toContain('audio/mpeg');
    expect(asset.body).toBe('fake-mp3-voice');

    const changeWithoutConfirmation = await h.quiz.app.inject({
      method: 'PUT', url: '/api/mc-voice/settings', headers: AUTH,
      payload: { primaryOverlayInstanceId: SECONDARY },
    });
    expect(changeWithoutConfirmation.statusCode).toBe(409);
    const changed = await h.quiz.app.inject({
      method: 'PUT', url: '/api/mc-voice/settings', headers: AUTH,
      payload: { primaryOverlayInstanceId: SECONDARY, confirmPrimaryOverlayChange: true },
    });
    expect(changed.statusCode).toBe(200);
    const revoked = await owner.waitFor((message) => message.type === 'MC_VOICE_LEASE' &&
      (message.payload as McVoiceLeasePayload).status === 'REVOKED');
    expect(revoked.payload).toMatchObject({ overlayInstanceId: OWNER, status: 'REVOKED' });
    const newGrant = await secondary.waitFor((message) => message.type === 'MC_VOICE_LEASE' &&
      (message.payload as McVoiceLeasePayload).status === 'GRANTED');
    const newToken = (newGrant.payload as McVoiceLeasePayload).leaseToken!;
    expect(newToken).not.toBe(leaseToken);
    expect((await h.quiz.app.inject({ method: 'GET', url: `/api/mc-voice/assets/${play.lines[0]!.assetId}`, headers })).statusCode).toBe(401);

    const completeHeaders = { origin: `http://127.0.0.1:${h.port}`, host: `127.0.0.1:${h.port}`, 'x-mc-voice-lease': newToken };
    const completed = await h.quiz.app.inject({
      method: 'POST', url: '/api/mc-voice/playback/complete', headers: completeHeaders,
      payload: { questionInstanceId: play.questionInstanceId, expectedStateVersion: playMessage.stateVersion, result: 'FINISHED' },
    });
    expect(completed.statusCode).toBe(200);
    expect(completed.json()).toMatchObject({ ok: true, state: 'ACCEPTING' });
    expect(h.quiz.runtime()?.engine.state).toBe('ACCEPTING');

    await closeSocket(owner.socket);
    await closeSocket(secondary.socket);
  });

  it('không kẹt ở READING khi chưa chọn hoặc chưa kết nối owner', async () => {
    const h = await makeHarness();
    const created = await h.quiz.app.inject({
      method: 'POST', url: '/api/sessions', headers: AUTH,
      payload: { name: 'Phiên fallback', config: { mode: 'MOCK', packId: 'demo', questionsPerRound: 10, seed: 42, allowDemoQuestions: true,
        mcVoiceEnabled: true, timings: { ...DEFAULT_TIMINGS, lobbyMs: 60_000, prepareMs: 500, answerMs: 3_000 } } },
    });
    const sessionId = created.json().sessionId as string;
    expect((await callCommand(h, sessionId, 'OPEN_LOBBY')).statusCode).toBe(200);
    expect((await callCommand(h, sessionId, 'START_ROUND')).statusCode).toBe(200);
    h.scheduler.advance(500);
    await vi.waitFor(() => expect(h.quiz.runtime()?.engine.state).toBe('ACCEPTING'));
  });
});
