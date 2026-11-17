import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
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

  it('bỏ qua tài liệu không hỗ trợ trong thư mục asset sequence và vẫn xuất theme hợp lệ', () => {
    const root = temp();
    const assets = join(root, 'assets-local');
    const sequence = join(assets, 'mc', 'kelly');
    mkdirSync(sequence, { recursive: true });
    writeFileSync(join(sequence, 'frame-001.png'), Buffer.from([137, 80, 78, 71]));
    writeFileSync(join(sequence, 'HUONG_DAN.txt'), 'Tài liệu hướng dẫn');
    const out = join(root, 'default');

    const exported = exportDefaultTheme({ out, assets });

    expect(exported.warnings).toContainEqual(expect.stringContaining('HUONG_DAN.txt'));
    expect(exported.copied).toContainEqual(expect.stringContaining('frame-001.png'));
    expect(existsSync(join(out, 'assets', 'mc', 'kelly', 'frame-001.png'))).toBe(true);
    expect(existsSync(join(out, 'assets', 'mc', 'kelly', 'HUONG_DAN.txt'))).toBe(false);
    expect(ThemeStore.validateDirectory(out).success).toBe(true);
  });

  it('bỏ slot thư mục nếu bên trong chỉ có tài liệu không được hỗ trợ', () => {
    const root = temp();
    const assets = join(root, 'assets-local');
    const sequence = join(assets, 'mc', 'kelly');
    mkdirSync(sequence, { recursive: true });
    writeFileSync(join(sequence, 'HUONG_DAN.txt'), 'Tài liệu hướng dẫn');
    const out = join(root, 'default');

    const exported = exportDefaultTheme({ out, assets });

    expect(exported.manifest.assets['mc.sequenceDir']).toBeUndefined();
    expect(exported.warnings).toContainEqual(expect.stringContaining('HUONG_DAN.txt'));
    expect(exported.warnings).toContainEqual(expect.stringContaining('chưa có asset được hỗ trợ'));
    expect(existsSync(join(out, 'assets', 'mc', 'kelly'))).toBe(false);
    expect(ThemeStore.validateDirectory(out).success).toBe(true);
  });

  it('giữ phần mở rộng nguồn khi xuất asset âm thanh', () => {
    const root = temp();
    const assets = join(root, 'assets-local');
    mkdirSync(join(assets, 'audio'), { recursive: true });
    writeFileSync(join(assets, 'audio', 'victory.wav'), Buffer.from([1, 2, 3]));
    const out = join(root, 'default');

    const exported = exportDefaultTheme({ out, assets });

    expect(exported.manifest.assets['audio.victory']).toBe('assets/audio/victory.wav');
    expect(ThemeStore.validateDirectory(out).success).toBe(true);
  });

  it('dọn staging khi lỗi giữa chừng và giữ nguyên theme cũ khi --force', () => {
    const root = temp();
    const assets = join(root, 'assets-local');
    mkdirSync(join(assets, 'arena'), { recursive: true });
    writeFileSync(join(assets, 'arena', 'bg.jpg'), Buffer.from([1, 2, 3]));
    mkdirSync(join(assets, 'chibi'), { recursive: true });
    const oversized = join(assets, 'chibi', 'oversized.png');
    writeFileSync(oversized, Buffer.alloc(0));
    truncateSync(oversized, 50 * 1024 * 1024 + 1);

    const parent = join(root, 'themes');
    const out = join(parent, 'default');
    expect(() => exportDefaultTheme({ out, assets })).toThrow(/lớn hơn 50 MB/u);
    expect(existsSync(out)).toBe(false);
    expect(readdirSync(parent)).toEqual([]);

    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'keep.txt'), 'theme cũ');
    expect(() => exportDefaultTheme({ out, assets, force: true })).toThrow(/lớn hơn 50 MB/u);
    expect(readFileSync(join(out, 'keep.txt'), 'utf8')).toBe('theme cũ');
    expect(readdirSync(parent)).toEqual(['default']);
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
    expect(store.resolve('halloween')).toMatchObject({ id: 'halloween', version: 1, assets: { 'brand.logo': '/themes/halloween/assets/logo.png?v=1' } });
    expect(store.resolve('broken')).toBeNull();
    expect(store.resolve('missing')).toBeNull();
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
    mkdirSync(join(themesDir, 'broken'));
    writeFileSync(join(themesDir, 'broken', 'theme.json'), '{bad json');
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
      expect((await quiz.app.inject('/api/admin/themes/halloween/resolved')).statusCode).toBe(401);
      const preview = await quiz.app.inject({ url: '/api/admin/themes/halloween/resolved', headers: auth });
      expect(preview.statusCode).toBe(200);
      expect(preview.json()).toMatchObject({ id: 'halloween', version: 1, tokens: { deep: '#101010' }, assets: { 'brand.logo': '/themes/halloween/assets/logo.png?v=1' } });
      const invalidPreview = await quiz.app.inject({ url: '/api/admin/themes/broken/resolved', headers: auth });
      expect(invalidPreview.statusCode).toBe(422);
      expect(invalidPreview.json()).toMatchObject({ code: 'THEME_INVALID', message: expect.any(String) });
      expect((await quiz.app.inject({ url: '/api/admin/themes/missing/resolved', headers: auth })).statusCode).toBe(404);
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
