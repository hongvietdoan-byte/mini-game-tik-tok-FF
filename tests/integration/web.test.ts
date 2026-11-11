import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ManualScheduler } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { buildApp, type QuizApp } from '@quiz/server';
import { TOKEN, tempDbPath } from './helpers';

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const f of cleanup.splice(0)) await f();
});

function fakeBuild(name: string) {
  const dir = mkdtempSync(join(tmpdir(), `quiz-web-${name}-`));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), `<!doctype html><title>${name}</title><script src="/${name}/assets/app.js"></script>`);
  writeFileSync(join(dir, 'assets', 'app.js'), `console.log('${name}')`);
  return dir;
}

async function bootWeb(): Promise<QuizApp> {
  const store = new Store(tempDbPath());
  const quiz = await buildApp({
    store,
    scheduler: new ManualScheduler(),
    adminToken: TOKEN,
    webRoots: { dashboard: fakeBuild('dashboard'), overlay: fakeBuild('overlay') },
  });
  cleanup.push(async () => {
    await quiz.close();
    store.close();
  });
  return quiz;
}

describe('V3.1 — phục vụ dashboard + overlay cùng một cổng (bộ cài / OBS)', () => {
  it('phục vụ SPA, asset, fallback index; chặn path traversal', async () => {
    const { app } = await bootWeb();
    expect((await app.inject({ method: 'GET', url: '/' })).headers.location).toBe('/dashboard/');
    const ov = await app.inject({ method: 'GET', url: '/overlay/' });
    expect(ov.statusCode).toBe(200);
    expect(ov.headers['content-type']).toContain('text/html');
    expect(ov.body).toContain('<title>overlay</title>');
    expect((await app.inject({ method: 'GET', url: '/overlay/preview' })).body).toContain('<title>overlay</title>');
    const js = await app.inject({ method: 'GET', url: '/overlay/assets/app.js' });
    expect(js.headers['content-type']).toContain('javascript');
    expect((await app.inject({ method: 'GET', url: '/overlay/assets/missing.js' })).statusCode).toBe(404);
    for (const evil of ['/overlay/..%2f..%2fpackage.json', '/overlay/%2e%2e/%2e%2e/package.json', '/dashboard/..%5c..%5cpackage.json'])
      expect([403, 404], evil).toContain((await app.inject({ method: 'GET', url: evil })).statusCode);
    expect((await app.inject({ method: 'GET', url: '/health' })).json().web).toEqual({ dashboard: true, overlay: true });
  });

  it('cho phép POST cùng origin loopback, chặn origin lạ và DNS rebinding', async () => {
    const { app } = await bootWeb();
    const post = (headers: Record<string, string>) =>
      app.inject({
        method: 'POST',
        url: '/api/system/selftest',
        headers: { authorization: `Bearer ${TOKEN}`, ...headers },
      });
    expect((await post({ host: '127.0.0.1:8787', origin: 'http://127.0.0.1:8787' })).statusCode).toBe(200);
    expect((await post({ host: 'localhost:8787', origin: 'http://localhost:8787' })).statusCode).toBe(200);
    expect((await post({ host: '127.0.0.1:8787', origin: 'https://evil.example' })).statusCode).toBe(403);
    // DNS rebinding: trang lạ trỏ tên miền về 127.0.0.1 → Host = tên miền lạ, Origin trùng Host
    expect((await post({ host: 'evil.example:8787', origin: 'http://evil.example:8787' })).statusCode).toBe(403);
  });
});
