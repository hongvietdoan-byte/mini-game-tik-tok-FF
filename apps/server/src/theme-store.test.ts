import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Store } from '@quiz/persistence';
import { ManualScheduler } from '@quiz/live-adapters';
import WebSocket from 'ws';
import { buildApp } from './app';
import { ThemeStore } from './theme-store';
import { exportDefaultTheme } from '../../../tools/theme-cli';

const roots: string[] = [];
function temp() {
  const root = mkdtempSync(join(tmpdir(), 'quiz-theme-'));
  roots.push(root);
  return root;
}

function writeTheme(root: string, id = 'halloween', manifestExtra: Record<string, unknown> = {}) {
  const directory = join(root, id);
  mkdirSync(join(directory, 'assets'), { recursive: true });
  writeFileSync(join(directory, 'assets', 'logo.png'), Buffer.from([137, 80, 78, 71]));
  writeFileSync(join(directory, 'theme.json'), JSON.stringify({
    schemaVersion: 1, id, name: 'Theme Halloween', tokens: { deep: '#101010' }, fonts: [],
    assets: { 'brand.logo': 'assets/logo.png' }, ...manifestExtra,
  }));
  return directory;
}

afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('ThemeStore', () => {
  it('CLI xuất gói default từ fixture, bỏ asset thiếu và không ghi đè khi chưa có --force', () => {
    const root = temp();
    const out = join(root, 'default');
    const assets = join(process.cwd(), 'fixtures', 'assets-placeholder');
    const exported = exportDefaultTheme({ out, assets });
    expect(exported.manifest.id).toBe('default');
    expect(exported.manifest.tokens).toMatchObject({ deep: '#2D387F', 'font-body': '"Segoe UI", "Be Vietnam Pro", Roboto, Arial, sans-serif' });
    expect(exported.manifest.assets).toHaveProperty('brand.logo');
    expect(exported.warnings).toEqual(expect.arrayContaining([expect.stringContaining('arena.flag.0')]));
    expect(ThemeStore.validateDirectory(out).success).toBe(true);
    expect(() => exportDefaultTheme({ out, assets })).toThrow(/đã tồn tại/u);
    expect(exportDefaultTheme({ out, assets, force: true }).manifest.id).toBe('default');
  });

  it('fallback an toàn, liệt kê gói lỗi, lưu lựa chọn và tăng version khi reload', () => {
    const root = temp();
    const themes = join(root, 'themes');
    writeTheme(themes);
    mkdirSync(join(themes, 'broken'));
    writeFileSync(join(themes, 'broken', 'theme.json'), '{bad json');
    const store = new ThemeStore(themes, root);
    expect(store.resolveActive()).toMatchObject({ id: 'default', tokens: {}, version: 1 });
    expect(store.list()).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'broken', valid: false, error: expect.any(String) })]));
    expect(store.setActive('halloween')).toBe(true);
    expect(store.resolveActive()).toMatchObject({ id: 'halloween', version: 2, assets: { 'brand.logo': '/themes/halloween/assets/logo.png?v=2' } });
    expect(store.reload()).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'halloween', active: true, valid: true })]));
    expect(store.version).toBe(3);
    expect(new ThemeStore(themes, root).resolveActive()).toMatchObject({ id: 'halloween', version: 3 });
  });

  it('không áp dụng theme bị sửa thành hỏng và từ chối symlink/path traversal khi phục vụ file', () => {
    const root = temp();
    const themes = join(root, 'themes');
    const directory = writeTheme(themes);
    const store = new ThemeStore(themes, root);
    expect(store.resolveFile('halloween', 'assets/logo.png')?.mimeType).toBe('image/png');
    expect(store.resolveFile('halloween', '../outside.png')).toBeNull();
    writeFileSync(join(directory, 'theme.json'), JSON.stringify({ schemaVersion: 1, id: 'halloween', name: 'x', tokens: { deep: 'red; color: blue' }, assets: {} }));
    store.reload();
    expect(store.resolveActive()).toMatchObject({ id: 'default', tokens: {}, version: 2 });
    expect(store.list()).toContainEqual(expect.objectContaining({ id: 'halloween', valid: false }));
  });

  it('chỉ phục vụ manifest JSON được tham chiếu bởi slot sequence MC', () => {
    const root = temp();
    const themes = join(root, 'themes');
    const directory = writeTheme(themes, 'halloween', { assets: { 'mc.sequenceDir': 'assets/sequence' } });
    mkdirSync(join(directory, 'assets', 'sequence'), { recursive: true });
    writeFileSync(join(directory, 'assets', 'sequence', 'manifest.json'), JSON.stringify({ animations: {} }));
    writeFileSync(join(directory, 'assets', 'sequence', 'extra.json'), '{}');
    const store = new ThemeStore(themes, root);
    expect(store.resolveFile('halloween', 'assets/sequence/manifest.json')?.mimeType).toBe('application/json; charset=utf-8');
    expect(store.resolveFile('halloween', 'assets/sequence/extra.json')).toBeNull();
  });

  it('API admin đổi theme/reload tăng phiên bản, snapshot có themeVersion, static trả MIME đúng', async () => {
    const root = temp();
    const themesDir = join(root, 'themes');
    writeTheme(themesDir);
    const dbPath = join(root, 'quiz.db');
    const db = new Store(dbPath);
    const scheduler = new ManualScheduler();
    db.seedQuestions({ id: 'demo', name: 'Demo' }, Array.from({ length: 40 }, (_, index) => ({
      id: `theme-q-${index}`, packId: 'demo', subtopicId: 'demo-chung', prompt: `Câu hỏi theme ${index}?`,
      options: [1, 2, 3, 4].map((number) => ({ id: `o${number}`, text: `Đáp án ${number}` })),
      correctOptionId: 'o1', explanation: '', difficulty: (['EASY', 'MEDIUM', 'HARD'] as const)[index % 3]!,
      verificationStatus: 'DEMO' as const, approvalStatus: 'APPROVED' as const,
    })), scheduler.now());
    const quiz = await buildApp({ store: db, scheduler, adminToken: 'test-admin-token-0123456789abcdef', themesDir });
    const auth = { authorization: 'Bearer test-admin-token-0123456789abcdef' };
    let socket: WebSocket | null = null;
    try {
      expect((await quiz.app.inject('/api/theme')).json()).toMatchObject({ id: 'default', version: 1 });
      expect((await quiz.app.inject('/api/admin/themes')).statusCode).toBe(401);
      expect((await quiz.app.inject({ method: 'PUT', url: '/api/admin/themes/active', headers: auth, payload: { themeId: 'halloween' } })).json())
        .toMatchObject({ activeThemeId: 'halloween', themeVersion: 2, theme: { id: 'halloween', version: 2 } });
      const file = await quiz.app.inject('/themes/halloween/assets/logo.png');
      expect(file.statusCode).toBe(200);
      expect(file.headers['content-type']).toContain('image/png');
      expect(file.headers['x-content-type-options']).toBe('nosniff');
      expect((await quiz.app.inject('/themes/halloween/%2e%2e%2fsecret.png')).statusCode).toBeGreaterThanOrEqual(400);
      const reloaded = await quiz.app.inject({ method: 'POST', url: '/api/admin/themes/reload', headers: auth });
      expect(reloaded.json()).toMatchObject({ activeThemeId: 'halloween', themeVersion: 3 });
      expect((await quiz.app.inject({ url: '/api/admin/themes', headers: auth })).json().themes).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'halloween', active: true, valid: true }),
      ]));
      const created = await quiz.app.inject({ method: 'POST', url: '/api/sessions', headers: auth, payload: {
        name: 'Theme test', config: { mode: 'MOCK', allowDemoQuestions: true, seed: 42 },
      } });
      expect(created.statusCode).toBe(201);
      const sessionId = created.json().sessionId as string;
      expect((await quiz.app.inject(`/api/sessions/${sessionId}/state`)).json()).toMatchObject({ themeVersion: 3 });

      await quiz.app.listen({ host: '127.0.0.1', port: 0 });
      const port = (quiz.app.server.address() as { port: number }).port;
      socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      const initialMessage = new Promise<unknown>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WebSocket không gửi snapshot theme ban đầu.')), 3000);
        socket!.once('message', (data) => { clearTimeout(timeout); resolve(JSON.parse(String(data))); });
      });
      socket.once('open', () => socket!.send(JSON.stringify({ type: 'HELLO', role: 'overlay' })));
      expect(await initialMessage).toMatchObject({ type: 'STATE_SNAPSHOT', payload: { themeVersion: 3 } });

      const pushedMessage = new Promise<unknown>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WebSocket không nhận snapshot sau khi reload theme.')), 3000);
        socket!.once('message', (data) => { clearTimeout(timeout); resolve(JSON.parse(String(data))); });
      });
      const reloadedTheme = await quiz.app.inject({ method: 'POST', url: '/api/admin/themes/reload', headers: auth });
      expect(reloadedTheme.json()).toMatchObject({ themeVersion: 4 });
      expect(await pushedMessage).toMatchObject({ type: 'STATE_SNAPSHOT', payload: { themeVersion: 4 } });
    } finally {
      socket?.terminate();
      await quiz.close();
      db.close();
    }
    expect(readFileSync(join(root, 'theme-settings.json'), 'utf8')).toContain('halloween');
    const restartedDb = new Store(dbPath);
    const restarted = await buildApp({ store: restartedDb, scheduler: new ManualScheduler(), adminToken: 'test-admin-token-0123456789abcdef', themesDir });
    try { expect((await restarted.app.inject('/api/theme')).json()).toMatchObject({ id: 'halloween', version: 4 }); }
    finally { await restarted.close(); restartedDb.close(); }
  });
});
