import { mkdtemp, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';
import { afterEach, describe, expect, it } from 'vitest';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { buildApp, type QuizApp } from './app';

const TOKEN = 'overlay-role-test-token-only';
const AUTH = { authorization: `Bearer ${TOKEN}` };
type Harness = { root: string; quiz: QuizApp; store: Store; sockets: WebSocket[]; port: number };
const opened: Harness[] = [];

async function makeHarness(): Promise<Harness> {
  const root = await mkdtemp(join(tmpdir(), 'quiz-overlay-role-'));
  const store = new Store(join(root, 'data', 'quiz.db'));
  const quiz = await buildApp({
    store,
    scheduler: new ManualScheduler(),
    adminToken: TOKEN,
    repositoryRoot: process.cwd(),
    adapterFactory: () => new MockAdapter(),
  });
  await quiz.app.listen({ host: '127.0.0.1', port: 0 });
  const port = (quiz.app.server.address() as AddressInfo).port;
  const harness = { root, quiz, store, sockets: [] as WebSocket[], port };
  opened.push(harness);
  const created = await quiz.app.inject({
    method: 'POST', url: '/api/sessions', headers: AUTH,
    payload: { name: 'Kiểm tra role overlay', config: { mode: 'MOCK', packId: 'role-test', allowDemoQuestions: true } },
  });
  expect(created.statusCode).toBe(201);
  return harness;
}

async function connectOverlay(harness: Harness, role?: 'program' | 'preview') {
  const socket = new WebSocket(`ws://127.0.0.1:${harness.port}/ws`);
  harness.sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout chờ ACK overlay.')), 5_000);
    socket.once('error', reject);
    socket.once('open', () => socket.send(JSON.stringify({ type: 'HELLO', role: 'overlay' })));
    socket.on('message', (data) => {
      const message = JSON.parse(String(data)) as { type?: string; stateVersion?: number };
      if (message.type !== 'STATE_SNAPSHOT' || typeof message.stateVersion !== 'number') return;
      socket.send(JSON.stringify({ type: 'ACK', stateVersion: message.stateVersion, ...(role ? { role } : {}) }));
      clearTimeout(timer);
      resolve();
    });
  });
  return socket;
}

async function overlayPreflight(harness: Harness) {
  const response = await harness.quiz.app.inject({ method: 'GET', url: '/api/preflight', headers: AUTH });
  const overlayAck = (response.json().checks as { id: string; status: string; reason: string }[])
    .find((check) => check.id === 'overlayAck');
  if (!overlayAck) throw new Error('Không có check overlayAck trong preflight.');
  return overlayAck;
}

async function waitForOverlayStatus(harness: Harness, status: string) {
  let current = await overlayPreflight(harness);
  for (let attempt = 0; attempt < 50 && current.status !== status; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    current = await overlayPreflight(harness);
  }
  return current;
}

afterEach(async () => {
  for (const harness of opened.splice(0)) {
    for (const socket of harness.sockets) {
      if (socket.readyState === WebSocket.CLOSED) continue;
      await new Promise<void>((resolve) => { socket.once('close', resolve); socket.close(); });
    }
    await harness.quiz.close().catch(() => {});
    harness.store.close();
    await rm(harness.root, { recursive: true, force: true });
  }
});

describe('preflight role program/preview qua WebSocket', () => {
  it('FAIL khi vắng mặt, WARN với preview/ACK cũ, PASS với program, rồi WARN khi program đóng', async () => {
    const harness = await makeHarness();
    expect((await overlayPreflight(harness)).status).toBe('FAIL');

    const legacyPreview = await connectOverlay(harness);
    const preview = await overlayPreflight(harness);
    expect(preview.status).toBe('WARN');
    expect(preview.reason.toLowerCase()).toContain('chỉ thấy tab xem thử, chưa thấy nguồn trong live studio');

    const program = await connectOverlay(harness, 'program');
    expect((await waitForOverlayStatus(harness, 'PASS')).status).toBe('PASS');

    await new Promise<void>((resolve) => { program.once('close', resolve); program.close(); });
    const disconnected = await waitForOverlayStatus(harness, 'WARN');
    expect(disconnected.status).toBe('WARN');
    expect(disconnected.reason.toLowerCase()).toContain('chỉ thấy tab xem thử, chưa thấy nguồn trong live studio');
    legacyPreview.close();
  });
});
