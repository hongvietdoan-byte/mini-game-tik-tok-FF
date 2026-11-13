import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { DEFAULT_HUD_CONFIG } from '@quiz/contracts';
import { AUTH, boot, createSession, type Harness } from './helpers';

const sessions: Harness[] = [];
const roots: string[] = [];
const sockets: WebSocket[] = [];

function png(width = 9, height = 16) {
  const bytes = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

async function session() {
  const root = mkdtempSync(join(tmpdir(), 'quiz-hud-integration-'));
  roots.push(root);
  const h = await createSession(await boot({ dbPath: join(root, 'quiz.sqlite'), seedQuestions: false }));
  sessions.push(h);
  return h;
}

function nextMessage(socket: WebSocket) {
  return new Promise<Record<string, any>>((resolve, reject) => {
    socket.once('message', (data) => resolve(JSON.parse(String(data)) as Record<string, any>));
    socket.once('error', reject);
  });
}

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.close();
  for (const h of sessions.splice(0)) {
    await h.quiz.close().catch(() => {});
    h.store.close();
  }
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('API cấu hình HUD', () => {
  it('đọc mặc định công khai, bảo vệ thao tác ghi, lưu ảnh và reset', async () => {
    const h = await session();
    expect((await h.quiz.app.inject({ method: 'GET', url: '/api/hud' })).json()).toEqual(DEFAULT_HUD_CONFIG);

    const update = { texts: { ...DEFAULT_HUD_CONFIG.texts, kicker: 'BÃO TỐ LIVE' }, images: DEFAULT_HUD_CONFIG.images };
    expect((await h.quiz.app.inject({ method: 'PUT', url: '/api/hud', payload: update })).statusCode).toBe(401);
    expect((await h.quiz.app.inject({ method: 'POST', url: '/api/hud/reset' })).statusCode).toBe(401);
    expect((await h.quiz.app.inject({
      method: 'POST', url: '/api/hud/images?slot=logo', headers: { 'content-type': 'image/png' }, payload: png(),
    })).statusCode).toBe(401);

    const saved = await h.quiz.app.inject({ method: 'PUT', url: '/api/hud', headers: AUTH, payload: update });
    expect(saved.statusCode, saved.body).toBe(200);
    expect(saved.json()).toMatchObject({ version: 1, texts: { kicker: 'BÃO TỐ LIVE' } });

    const bytes = png();
    const uploaded = await h.quiz.app.inject({
      method: 'POST', url: '/api/hud/images?slot=bgQuestion', headers: { ...AUTH, 'content-type': 'image/png' }, payload: bytes,
    });
    expect(uploaded.statusCode, uploaded.body).toBe(201);
    const { image, config } = uploaded.json();
    expect(image).toMatchObject({ width: 9, height: 16, mimeType: 'image/png' });
    expect(config).toMatchObject({ version: 2, images: { bgQuestion: image.id } });

    const served = await h.quiz.app.inject({ method: 'GET', url: `/hud-assets/${image.id}` });
    expect(served.statusCode).toBe(200);
    expect(served.headers['content-type']).toContain('image/png');
    expect(served.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(served.headers['x-content-type-options']).toBe('nosniff');
    expect(served.rawPayload).toEqual(bytes);
    expect((await h.quiz.app.inject({ method: 'GET', url: '/hud-assets/../../hud.json' })).statusCode).toBe(404);

    const reset = await h.quiz.app.inject({ method: 'POST', url: '/api/hud/reset', headers: AUTH });
    expect(reset.statusCode).toBe(200);
    expect(reset.json()).toEqual({ ...DEFAULT_HUD_CONFIG, version: 3 });
  });

  it('đẩy hudVersion mới vào snapshot WebSocket ngay khi nội dung đổi', async () => {
    const h = await session();
    await h.quiz.app.listen({ host: '127.0.0.1', port: 0 });
    const port = (h.quiz.app.server.address() as { port: number }).port;
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    sockets.push(socket);

    const initialPromise = nextMessage(socket);
    socket.once('open', () => socket.send(JSON.stringify({ type: 'HELLO', role: 'overlay' })));
    const initial = await initialPromise;
    expect(initial).toMatchObject({ type: 'STATE_SNAPSHOT', payload: { hudVersion: 0 } });

    const updatedPromise = nextMessage(socket);
    const update = { texts: { ...DEFAULT_HUD_CONFIG.texts, arenaTitle: 'GIẢI ĐẤU LIVE' }, images: DEFAULT_HUD_CONFIG.images };
    const response = await h.quiz.app.inject({ method: 'PUT', url: '/api/hud', headers: AUTH, payload: update });
    expect(response.statusCode).toBe(200);
    expect(await updatedPromise).toMatchObject({ type: 'STATE_SNAPSHOT', payload: { hudVersion: 1 } });
  });
});
