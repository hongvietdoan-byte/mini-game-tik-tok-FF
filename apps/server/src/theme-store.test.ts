import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Store } from '@quiz/persistence';
import { ManualScheduler } from '@quiz/live-adapters';
import { THEME_DEFAULT_ACHIEVEMENTS } from '@quiz/contracts';
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
  it('CLI xuất gói default từ fixture, bỏ asset thiếu và không ghi đè khi chưa có --force', async () => {
    const root = temp();
    const out = join(root, 'default');
    const assets = join(process.cwd(), 'fixtures', 'assets-placeholder');
    const exported = await exportDefaultTheme({ out, assets, createMap: false, createSkinAssets: false });
    expect(exported.manifest.id).toBe('default');
    expect(exported.manifest.achievements).toMatchObject({
      LONGEST_STREAK: THEME_DEFAULT_ACHIEVEMENTS.LONGEST_STREAK,
      MOST_CORRECT: THEME_DEFAULT_ACHIEVEMENTS.MOST_CORRECT,
    });
    expect(exported.manifest.tokens).toMatchObject({ deep: '#2D387F', 'font-body': '"Segoe UI", "Be Vietnam Pro", Roboto, Arial, sans-serif' });
    expect(exported.manifest.assets).toHaveProperty('brand.logo');
    expect(exported.warnings).toEqual(expect.arrayContaining([expect.stringContaining('arena.flag.0')]));
    expect(ThemeStore.validateDirectory(out).success).toBe(true);
    await expect(exportDefaultTheme({ out, assets })).rejects.toThrow(/đã tồn tại/u);
    expect((await exportDefaultTheme({ out, assets, force: true, createMap: false })).manifest.id).toBe('default');
  });

  it('bỏ qua tài liệu không hỗ trợ trong thư mục asset sequence và vẫn xuất theme hợp lệ', async () => {
    const root = temp();
    const assets = join(root, 'assets-local');
    const sequence = join(assets, 'mc', 'kelly');
    mkdirSync(sequence, { recursive: true });
    writeFileSync(join(sequence, 'frame-001.png'), Buffer.from([137, 80, 78, 71]));
    writeFileSync(join(sequence, 'HUONG_DAN.txt'), 'Tài liệu hướng dẫn');
    const out = join(root, 'default');

    const exported = await exportDefaultTheme({ out, assets, createMap: false });

    expect(exported.warnings).toContainEqual(expect.stringContaining('HUONG_DAN.txt'));
    expect(exported.copied).toContainEqual(expect.stringContaining('frame-001.png'));
    expect(existsSync(join(out, 'assets', 'V-nhan-vat', 'V05-mc-chuoi-dong-tac', 'kelly', 'frame-001.png'))).toBe(true);
    expect(existsSync(join(out, 'assets', 'V-nhan-vat', 'V05-mc-chuoi-dong-tac', 'kelly', 'HUONG_DAN.txt'))).toBe(false);
    expect(existsSync(join(out, 'assets', 'V-nhan-vat', 'V05-mc-chuoi-dong-tac', 'DOC-TOI.txt'))).toBe(true);
    expect(ThemeStore.validateDirectory(out).success).toBe(true);
  });

  it('không đưa thư mục _nhap vào gói ảnh Top 2/Top 3', async () => {
    const root = temp();
    const podium = join(root, 'assets-local', 'chibi', 'dang-top2-top3');
    const draft = join(podium, '_nhap', 'top2');
    mkdirSync(join(podium, 'top2'), { recursive: true });
    mkdirSync(join(podium, 'top3'), { recursive: true });
    mkdirSync(draft, { recursive: true });
    writeFileSync(join(podium, 'top2', 'top2-char.png'), Buffer.from([137, 80, 78, 71]));
    writeFileSync(join(podium, 'top3', 'top3-char.png'), Buffer.from([137, 80, 78, 71]));
    writeFileSync(join(draft, 'top2-char-ban-nhap.png'), Buffer.from([137, 80, 78, 71]));
    const out = join(root, 'default');

    await exportDefaultTheme({ out, assets: join(root, 'assets-local'), createMap: false });

    expect(existsSync(join(out, 'assets', 'V-nhan-vat', 'V02-chibi-top2-top3', 'top2', 'top2-char.png'))).toBe(true);
    expect(existsSync(join(out, 'assets', 'V-nhan-vat', 'V02-chibi-top2-top3', '_nhap'))).toBe(false);
    expect(existsSync(join(out, 'assets', 'V-nhan-vat', 'V02-chibi-top2-top3', 'DOC-TOI.txt'))).toBe(true);
  });

  it('bỏ slot thư mục nếu bên trong chỉ có tài liệu không được hỗ trợ', async () => {
    const root = temp();
    const assets = join(root, 'assets-local');
    const sequence = join(assets, 'mc', 'kelly');
    mkdirSync(sequence, { recursive: true });
    writeFileSync(join(sequence, 'HUONG_DAN.txt'), 'Tài liệu hướng dẫn');
    const out = join(root, 'default');

    const exported = await exportDefaultTheme({ out, assets, createMap: false });

    expect(exported.manifest.assets['mc.sequenceDir']).toBeUndefined();
    expect(exported.warnings).toContainEqual(expect.stringContaining('HUONG_DAN.txt'));
    expect(exported.warnings).toContainEqual(expect.stringContaining('chưa có asset được hỗ trợ'));
    expect(existsSync(join(out, 'assets', 'mc', 'kelly'))).toBe(false);
    expect(ThemeStore.validateDirectory(out).success).toBe(true);
  });

  it('giữ phần mở rộng nguồn khi xuất asset âm thanh', async () => {
    const root = temp();
    const assets = join(root, 'assets-local');
    mkdirSync(join(assets, 'audio'), { recursive: true });
    writeFileSync(join(assets, 'audio', 'victory.wav'), Buffer.from([1, 2, 3]));
    const out = join(root, 'default');

    const exported = await exportDefaultTheme({ out, assets, createMap: false });

    expect(exported.manifest.assets['audio.victory']).toBe('assets/A-am-thanh/A06-chien-thang/victory.wav');
    expect(ThemeStore.validateDirectory(out).success).toBe(true);
  });

  it('dọn staging khi lỗi giữa chừng và giữ nguyên theme cũ khi --force', async () => {
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
    await expect(exportDefaultTheme({ out, assets, createMap: false })).rejects.toThrow(/lớn hơn 50 MB/u);
    expect(existsSync(out)).toBe(false);
    expect(readdirSync(parent)).toEqual([]);

    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'keep.txt'), 'theme cũ');
    await expect(exportDefaultTheme({ out, assets, force: true, createMap: false })).rejects.toThrow(/lớn hơn 50 MB/u);
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

  it('gộp fallback ứng dụng < theme < event và phân giải icon thành URL asset an toàn', () => {
    const root = temp();
    const themes = join(root, 'themes');
    const directory = writeTheme(themes, 'halloween', { achievements: {
      LONGEST_STREAK: { title: 'Chuỗi Halloween', icon: 'assets/streak.png', accentColor: '#123456' },
      MOST_CORRECT: { enabled: false },
      eventOverrides: { 'ba-vuong-dai-chien-2026': {
        LONGEST_STREAK: { title: 'Chuỗi Bão Tố', icon: 'assets/event-streak.png' },
        MOST_CORRECT: { enabled: true },
      } },
    } });
    writeFileSync(join(directory, 'assets', 'streak.png'), Buffer.from([137, 80, 78, 71]));
    writeFileSync(join(directory, 'assets', 'event-streak.png'), Buffer.from([137, 80, 78, 71]));
    const store = new ThemeStore(themes, root);

    expect(store.resolveActive().achievements?.LONGEST_STREAK).toMatchObject(THEME_DEFAULT_ACHIEVEMENTS.LONGEST_STREAK);
    expect(store.setActive('halloween')).toBe(true);
    expect(store.resolveActive().achievements).toMatchObject({
      LONGEST_STREAK: {
        title: 'Chuỗi Halloween', accentColor: '#123456', icon: '/themes/halloween/assets/streak.png?v=2',
        subtitle: THEME_DEFAULT_ACHIEVEMENTS.LONGEST_STREAK.subtitle,
      },
      MOST_CORRECT: { enabled: false, title: THEME_DEFAULT_ACHIEVEMENTS.MOST_CORRECT.title },
    });
    expect(store.resolveActive('ba-vuong-dai-chien-2026').achievements).toMatchObject({
      LONGEST_STREAK: {
        title: 'Chuỗi Bão Tố', accentColor: '#123456', icon: '/themes/halloween/assets/event-streak.png?v=2',
        subtitle: THEME_DEFAULT_ACHIEVEMENTS.LONGEST_STREAK.subtitle,
      },
      MOST_CORRECT: { enabled: true, title: THEME_DEFAULT_ACHIEVEMENTS.MOST_CORRECT.title },
    });
    expect(store.resolveAchievementPresentations('ba-vuong-dai-chien-2026').LONGEST_STREAK.title).toBe('Chuỗi Bão Tố');
    expect(store.decorateAchievementSnapshots([{
      achievementId: 'LONGEST_STREAK', scope: 'ROUND', scopeId: 'round-1', metricKey: 'longestStreak',
      entries: [], totalQualified: 1, tiedOverflowCount: 0, revision: 1,
    }], 'ba-vuong-dai-chien-2026')[0]).toMatchObject({
      achievementId: 'LONGEST_STREAK', revision: 1,
      presentation: { title: 'Chuỗi Bão Tố', icon: '/themes/halloween/assets/event-streak.png?v=2' },
    });
  });

  it('từ chối theme khi icon danh hiệu thiếu hoặc sai loại và trả lỗi kèm đường dẫn trường', () => {
    const root = temp();
    const themes = join(root, 'themes');
    writeTheme(themes, 'missing-icon', { achievements: { LONGEST_STREAK: { icon: 'assets/no-icon.png' } } });
    writeTheme(themes, 'wrong-icon', { achievements: { LONGEST_STREAK: { icon: 'assets/logo.woff2' } } });
    const store = new ThemeStore(themes, root);
    expect(store.list()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'missing-icon', valid: false, error: expect.stringContaining('achievements.LONGEST_STREAK.icon') }),
      expect.objectContaining({ id: 'wrong-icon', valid: false, error: expect.stringContaining('achievements.LONGEST_STREAK.icon') }),
    ]));
  });

  it('đưa presentation đã gộp theo event vào achievement snapshot công khai mà không đổi kết quả', async () => {
    const root = temp();
    const themesDir = join(root, 'themes');
    const themeDirectory = writeTheme(themesDir, 'storm-arena', { achievements: {
      LONGEST_STREAK: { title: 'Chuỗi mặc định theme', icon: 'assets/streak.png', accentColor: '#123456' },
      eventOverrides: { 'ba-vuong-dai-chien-2026': { LONGEST_STREAK: { title: 'Chuỗi Bão Tố' } } },
    } });
    writeFileSync(join(themeDirectory, 'assets', 'streak.png'), Buffer.from([137, 80, 78, 71]));
    const dbPath = join(root, 'quiz.db');
    const db = new Store(dbPath);
    const scheduler = new ManualScheduler();
    db.seedQuestions({ id: 'demo', name: 'Demo' }, Array.from({ length: 40 }, (_, index) => ({
      id: `theme-achievement-q-${index}`, packId: 'demo', subtopicId: 'demo-chung', prompt: `Câu hỏi theme ${index}?`,
      options: [1, 2, 3, 4].map((number) => ({ id: `o${number}`, text: `Đáp án ${number}` })),
      correctOptionId: 'o1', explanation: '', difficulty: (['EASY', 'MEDIUM', 'HARD'] as const)[index % 3]!,
      verificationStatus: 'DEMO' as const, approvalStatus: 'APPROVED' as const,
    })), scheduler.now());
    const quiz = await buildApp({ store: db, scheduler, adminToken: 'test-admin-token-0123456789abcdef', themesDir });
    const auth = { authorization: 'Bearer test-admin-token-0123456789abcdef' };
    try {
      expect((await quiz.app.inject({ method: 'PUT', url: '/api/admin/themes/active', headers: auth, payload: { themeId: 'storm-arena' } })).statusCode).toBe(200);
      const created = await quiz.app.inject({ method: 'POST', url: '/api/sessions', headers: auth, payload: {
        name: 'Theme achievement snapshot', config: {
          mode: 'MOCK', packId: 'demo', questionsPerRound: 10, allowDemoQuestions: true, seed: 28_800,
          eventId: 'ba-vuong-dai-chien-2026',
          timings: { lobbyMs: 0, prepareMs: 500, answerMs: 3_000, revealMs: 500, leaderboardMs: 500, roundEndMs: 0, victoryMs: 1_000, intermissionMs: 1_000 },
        },
      } });
      expect(created.statusCode).toBe(201);
      const runtime = quiz.runtime()!;
      runtime.simulatorControl({ action: 'START', players: 10, accuracy: 1, participation: 1, spamRate: 0, noiseRate: 0, seed: 28_800 });
      await Promise.resolve();
      const send = (command: { type: 'OPEN_LOBBY' } | { type: 'START_ROUND'; questionCount: 10 }) => {
        const result = runtime.dispatch({
          commandId: randomUUID(), expectedStateVersion: runtime.engine.stateVersion, operatorId: 'theme-test',
          requestedAtMs: scheduler.now(), command,
        });
        if (!result.result.ok) throw new Error(`${command.type}: ${result.result.code} ${result.result.message}`);
      };
      send({ type: 'OPEN_LOBBY' });
      send({ type: 'START_ROUND', questionCount: 10 });
      let steps = 0;
      while (runtime.engine.state !== 'VICTORY' && steps < 20_000) {
        scheduler.advance(250);
        steps += 1;
      }
      expect(runtime.engine.state).toBe('VICTORY');

      const sourceAchievement = runtime.publicSnapshot().achievementSnapshots?.find((item) => item.achievementId === 'LONGEST_STREAK');
      expect(sourceAchievement).toBeDefined();
      const displaySettingsUrl = '/api/admin/achievements/display';
      expect((await quiz.app.inject({ url: displaySettingsUrl })).statusCode).toBe(401);
      expect((await quiz.app.inject({ url: displaySettingsUrl, headers: auth })).json()).toEqual({ enabled: true });
      expect((await quiz.app.inject({ method: 'PUT', url: displaySettingsUrl, headers: auth, payload: { enabled: false } })).json())
        .toEqual({ enabled: false });
      expect((await quiz.app.inject(`/api/sessions/${runtime.id}/state`)).json()).not.toHaveProperty('achievementSnapshots');
      expect((db.raw.prepare('SELECT COUNT(*) AS n FROM achievement_awards WHERE round_id = ?').get(runtime.engine.round?.roundId) as { n: number }).n)
        .toBeGreaterThan(0);
      expect(runtime.publicSnapshot().achievementSnapshots?.length).toBeGreaterThan(0);
      expect((await quiz.app.inject({ method: 'PUT', url: displaySettingsUrl, headers: auth, payload: { enabled: true } })).json())
        .toEqual({ enabled: true });
      const publicState = (await quiz.app.inject(`/api/sessions/${runtime.id}/state`)).json();
      const publicAchievement = publicState.achievementSnapshots?.find((item: { achievementId: string }) => item.achievementId === 'LONGEST_STREAK');
      expect(publicAchievement).toMatchObject({
        achievementId: 'LONGEST_STREAK', entries: sourceAchievement!.entries, revision: sourceAchievement!.revision,
        presentation: {
          enabled: true, title: 'Chuỗi Bão Tố', subtitle: THEME_DEFAULT_ACHIEVEMENTS.LONGEST_STREAK.subtitle,
          icon: expect.stringMatching(/^\/themes\/storm-arena\/assets\/streak\.png\?v=/u), accentColor: '#123456', maxRows: 3,
        },
      });
      await quiz.app.inject({ method: 'PUT', url: displaySettingsUrl, headers: auth, payload: { enabled: false } });
    } finally {
      await quiz.close();
      db.close();
    }
    const restartedDb = new Store(dbPath);
    const restarted = await buildApp({ store: restartedDb, scheduler: new ManualScheduler(), adminToken: 'test-admin-token-0123456789abcdef', themesDir });
    try {
      expect((await restarted.app.inject({ url: '/api/admin/achievements/display', headers: auth })).json()).toEqual({ enabled: false });
    } finally { await restarted.close(); restartedDb.close(); }
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

  it('phục vụ slots.json và chỉ công bố skin slot đã được khai báo trong registry', () => {
    const root = temp();
    const themes = join(root, 'themes');
    const slotDirectory = 'assets/K-khung/K07-o-dap-an';
    const directory = writeTheme(themes, 'halloween', { skinAssets: { K07: slotDirectory } });
    mkdirSync(join(directory, ...slotDirectory.split('/')), { recursive: true });
    writeFileSync(join(directory, ...slotDirectory.split('/'), 'default.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL+nAAAAABJRU5ErkJggg==', 'base64'));
    writeFileSync(join(directory, 'slots.json'), JSON.stringify({
      schemaVersion: 1,
      slots: [{
        id: 'K07', nhom: 'K', lop: 1, thuMuc: slotDirectory,
        files: [{ ten: 'default.png', batBuoc: true, trangThai: 'CO_SAN' }],
        kichThuoc: { rong: 1, cao: 1, tiLe: 1, saiSoPx: 0 }, nineSlice: null,
        dinhDang: ['PNG'], nenTrongSuot: true, dungLuongToiDa: 1_000_000,
        viTri: [{ man: 'QUESTION', x: 10, y: 20, rong: 1, cao: 1 }],
        nam_tren: [], nam_duoi: [], ghiChu: 'Khung đáp án.',
      }],
    }));

    const store = new ThemeStore(themes, root);
    expect(store.resolve('halloween')?.skinAssets).toEqual({ K07: `/themes/halloween/${slotDirectory}?v=1` });
    expect(store.resolveFile('halloween', 'slots.json')?.mimeType).toBe('application/json; charset=utf-8');
    expect(store.resolveFile('halloween', 'assets/K-khung/K07-o-dap-an/default.png')?.mimeType).toBe('image/png');
    expect(store.resolveFile('halloween', 'theme.json')).toBeNull();
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

  it('lưu achievements có xác thực, backup manifest cũ và từ chối dữ liệu sai hoặc theme default', async () => {
    const root = temp();
    const themesDir = join(root, 'themes');
    const themeDirectory = writeTheme(themesDir, 'spring-event');
    writeTheme(themesDir, 'default');
    const original = readFileSync(join(themeDirectory, 'theme.json'));
    const db = new Store(join(root, 'quiz.db'));
    const quiz = await buildApp({ store: db, scheduler: new ManualScheduler(), adminToken: 'test-admin-token-0123456789abcdef', themesDir });
    const auth = { authorization: 'Bearer test-admin-token-0123456789abcdef' };
    const url = '/api/admin/themes/spring-event/achievements';
    try {
      expect((await quiz.app.inject({ method: 'PUT', url, payload: { achievements: { LONGEST_STREAK: { title: 'Chuỗi Mùa Xuân', maxRows: 3 } } } })).statusCode).toBe(401);
      expect((await quiz.app.inject('/api/admin/themes/spring-event/manifest')).statusCode).toBe(401);

      const saved = await quiz.app.inject({
        method: 'PUT', url, headers: auth,
        payload: { achievements: { LONGEST_STREAK: { title: 'Chuỗi Mùa Xuân', maxRows: 3, displaySlot: 'victory' } } },
      });
      expect(saved.statusCode).toBe(200);
      expect(saved.json()).toMatchObject({ themeVersion: 2, theme: { id: 'spring-event', version: 2 } });
      expect(saved.json().achievements).toMatchObject({ LONGEST_STREAK: { title: 'Chuỗi Mùa Xuân', maxRows: 3 } });
      expect(JSON.parse(readFileSync(join(themeDirectory, 'theme.json'), 'utf8'))).toMatchObject({
        achievements: { LONGEST_STREAK: { title: 'Chuỗi Mùa Xuân', displaySlot: 'victory' } },
      });
      const backups = readdirSync(themeDirectory).filter((name) => /^theme\.json\.bak-/u.test(name));
      expect(backups).toHaveLength(1);
      expect(readFileSync(join(themeDirectory, backups[0]!))).toEqual(original);
      expect((await quiz.app.inject({ url, headers: auth })).json()).toMatchObject({ themeVersion: 2, achievements: { LONGEST_STREAK: { title: 'Chuỗi Mùa Xuân' } } });
      const exported = await quiz.app.inject({ url: '/api/admin/themes/spring-event/manifest', headers: auth });
      expect(exported.statusCode).toBe(200);
      expect(exported.json()).toMatchObject({
        schemaVersion: 1, id: 'spring-event', name: 'Theme Halloween',
        achievements: { LONGEST_STREAK: { title: 'Chuỗi Mùa Xuân', displaySlot: 'victory' } },
      });

      const savedBytes = readFileSync(join(themeDirectory, 'theme.json'));
      const rejected = await quiz.app.inject({ method: 'PUT', url, headers: auth, payload: { achievements: { LONGEST_STREAK: { maxRows: 5 } } } });
      expect(rejected.statusCode).toBe(422);
      expect(rejected.json()).toMatchObject({ code: 'VALIDATION_FAILED', message: expect.stringContaining('LONGEST_STREAK') });
      expect(readFileSync(join(themeDirectory, 'theme.json'))).toEqual(savedBytes);
      expect(readdirSync(themeDirectory).filter((name) => /^theme\.json\.bak-/u.test(name))).toHaveLength(1);

      const defaultBytes = readFileSync(join(themesDir, 'default', 'theme.json'));
      const defaultSave = await quiz.app.inject({ method: 'PUT', url: '/api/admin/themes/default/achievements', headers: auth, payload: { achievements: {} } });
      expect(defaultSave.statusCode).toBe(422);
      expect(defaultSave.json()).toMatchObject({ code: 'THEME_READ_ONLY', message: expect.stringContaining('nhân bản') });
      expect(readFileSync(join(themesDir, 'default', 'theme.json'))).toEqual(defaultBytes);
    } finally {
      await quiz.close();
      db.close();
    }
  });
});
