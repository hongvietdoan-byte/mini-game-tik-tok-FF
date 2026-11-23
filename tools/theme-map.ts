import { spawn } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { Locator, Page } from '@playwright/test';
import { DEFAULT_HUD_CONFIG, THEME_ASSET_SLOTS, THEME_DEFAULT_ACHIEVEMENTS, THEME_DEFAULT_TEXTS, ThemeSlotRegistrySchema, type ThemeAssetSlot, type ThemeManifest, type ThemeSlotRegistry } from '@quiz/contracts';
import { THEME_SKIN_TARGETS, type ThemeSkinTarget } from '../apps/overlay/src/theme-skins';

const TEXT_LOCATIONS: Record<string, string[]> = {
  brandTitleLine1: ['LOBBY'], brandTitleLine2: ['LOBBY'], brandTagline: ['LOBBY'], legacyBrandTitle: ['LOBBY', 'QUESTION', 'REVEAL', 'VICTORY'],
  arenaWelcome: ['LOBBY'], kicker: ['LOBBY', 'QUESTION', 'REVEAL', 'VICTORY'], arenaTitle: ['LOBBY', 'QUESTION', 'REVEAL', 'VICTORY'],
  playingLabel: ['LOBBY', 'QUESTION', 'REVEAL'], roundLabel: ['LOBBY', 'QUESTION', 'REVEAL'], leaderboardTitle: ['QUESTION', 'REVEAL'], victoryTitle: ['VICTORY'],
};

const ESCAPE = (value: string) => value.replace(/[&<>"']/gu, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

function assetScenes(slot: ThemeAssetSlot): string[] {
  if (slot.startsWith('audio.')) return [];
  if (slot.startsWith('victory.')) return ['VICTORY'];
  if (slot.startsWith('arena.flag.') || slot === 'arena.questionBackground') return ['QUESTION', 'REVEAL'];
  if (slot === 'arena.loopVideoWebm' || slot === 'arena.loopVideoMp4') return ['QUESTION', 'REVEAL', 'VICTORY'];
  if (slot === 'mc.static' || slot === 'mc.sequenceDir') return ['LOBBY', 'QUESTION', 'REVEAL'];
  if (slot === 'chibi.podiumDir' || slot === 'throne.bankDir') return ['VICTORY'];
  return ['LOBBY', 'QUESTION', 'REVEAL', 'VICTORY'];
}

function markerPosition(slot: string, index: number, kind: 'asset' | 'text') {
  if (kind === 'text') {
    if (/brand|kicker|arenaTitle/iu.test(slot)) return { left: 52 + (index % 3) * 7, top: 8 + (index % 2) * 5 };
    if (/leaderboard|round|playing/iu.test(slot)) return { left: 65 + (index % 3) * 5, top: 30 + (index % 3) * 8 };
    if (/victory/iu.test(slot)) return { left: 52, top: 22 + index * 4 };
    return { left: 60, top: 18 + index * 4 };
  }
  if (slot.startsWith('audio.')) return { left: 92, top: 92 - (index % 4) * 6 };
  if (slot.includes('background') || slot === 'arena.loopVideoWebm' || slot === 'arena.loopVideoMp4') return { left: 4 + (index % 4) * 5, top: 48 + (index % 4) * 7 };
  if (slot.startsWith('arena.flag.')) return { left: slot.endsWith('.0') || slot.endsWith('.4') ? 4 : 9, top: 38 + (index % 5) * 7 };
  if (slot === 'brand.logo') return { left: 42, top: 5 };
  if (slot.startsWith('mc.')) return { left: 84, top: 25 + (index % 4) * 6 };
  if (slot.startsWith('chibi.')) return { left: 19 + (index % 3) * 9, top: 68 + (index % 4) * 5 };
  if (slot.startsWith('throne.')) return { left: 53, top: 61 };
  if (slot === 'victory.trophyStage') return { left: 50, top: 72 };
  return { left: 50, top: 50 };
}

async function freePort() {
  const server = createServer();
  await new Promise<void>((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveServer);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Không lấy được cổng để dựng overlay xem sơ đồ.');
  const port = address.port;
  await new Promise<void>((resolveServer, reject) => server.close((error) => error ? reject(error) : resolveServer()));
  return port;
}

async function settleThemeCapture(page: Page) {
  await page.waitForFunction(() => !!document.querySelector('[data-testid="stage"]'));
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  await page.evaluate(async () => {
    await document.fonts.ready;
    const finiteAnimations = document.getAnimations().filter((animation) =>
      animation.effect?.getComputedTiming().iterations !== Infinity && animation.playState !== 'finished');
    await Promise.race([
      Promise.all(finiteAnimations.map((animation) => animation.finished.catch(() => undefined))),
      new Promise<void>((done) => setTimeout(done, 15_000)),
    ]);
    await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
  });
  // Freeze only after finite reveal/entry animations finish; otherwise their
  // starting opacity (often zero) would be mistaken for a hidden slot.
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
}

async function serveDirectory(directory: string, path: string) {
  if (!path || path.includes('\\') || path.split('/').some((part) => !part || part === '.' || part === '..')) return null;
  const root = resolve(directory);
  const target = resolve(root, ...path.split('/'));
  const rel = relative(root, target);
  if (rel === '..' || rel.startsWith(`..${sep}`) || !existsSync(target)) return null;
  try {
    const data = readFileSync(target);
    const extension = target.slice(target.lastIndexOf('.')).toLowerCase();
    const contentType: Record<string, string> = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
      '.webm': 'video/webm', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8',
    };
    return { data, contentType: contentType[extension] ?? 'application/octet-stream' };
  } catch { return null; }
}

function existingThemeSkinFile(manifest: ThemeManifest, themeDirectory: string, target: ThemeSkinTarget, file = 'default.png') {
  const folder = manifest.skinAssets?.[target.id];
  if (!folder) return undefined;
  const path = resolve(themeDirectory, ...folder.split('/'), file);
  return existsSync(path) ? readFileSync(path) : undefined;
}

function resolvedTheme(manifest: ThemeManifest, skinSlots?: ThemeSlotRegistry) {
  const id = manifest.id;
  const url = (path: string) => `/themes/${encodeURIComponent(id)}/${path.split('/').map(encodeURIComponent).join('/')}?v=1`;
  const assets = Object.fromEntries(Object.entries(manifest.assets).flatMap(([slot, path]) => path ? [[slot, url(path)]] : []));
  return {
    id, name: manifest.name, version: 1, tokens: manifest.tokens,
    fonts: manifest.fonts.map((font) => ({ family: font.family, url: url(font.file), weight: font.weight, style: font.style })),
    assets, skinAssets: Object.fromEntries(Object.entries(manifest.skinAssets ?? {}).map(([slot, path]) => [slot, url(path)])),
    ...(skinSlots ? { skinSlots } : {}),
    texts: { ...THEME_DEFAULT_TEXTS, ...(manifest.texts ?? {}) },
    achievements: { ...THEME_DEFAULT_ACHIEVEMENTS, ...(manifest.achievements ?? {}) },
  };
}

function markerElements(
  scene: string,
  assetRows: Array<{ id: string; slot: ThemeAssetSlot }>,
  textRows: Array<{ id: string; key: string }>,
  mcImageCenter: { left: number; top: number },
) {
  const assets = assetRows.flatMap((row, index) => assetScenes(row.slot).includes(scene)
    ? [{ id: row.id, ...(row.slot === 'mc.static' || row.slot === 'mc.sequenceDir' ? mcImageCenter : markerPosition(row.slot, index, 'asset')), text: false }]
    : []);
  const texts = textRows.flatMap((row, index) => TEXT_LOCATIONS[row.key]?.includes(scene)
    ? [{ id: row.id, ...markerPosition(row.key, index, 'text'), text: true }]
    : []);
  return [...assets, ...texts].map((marker) =>
    `<span class="marker${marker.text ? ' text-marker' : ''}" style="left:${marker.left}%;top:${marker.top}%">${marker.id}</span>`).join('');
}

function legendRows(rows: Array<{ id: string; name: string }>, text = false) {
  return rows.map((row) => `<li class="${text ? 'text-row' : ''}"><b>${row.id}</b><code>${ESCAPE(row.name)}</code></li>`).join('');
}

/** Chụp 4 cảnh overlay thật 1080×1920 rồi ghép chú giải ID dùng chung với CAN-CHUAN-BI.md. */
export async function createThemeMapPng(manifest: ThemeManifest, options: { themeDirectory: string; fallbackAssets: string }): Promise<Buffer> {
  const { chromium } = await import('@playwright/test');
  const repoRoot = process.cwd();
  const viteBin = resolve(repoRoot, 'apps', 'overlay', 'node_modules', 'vite', 'bin', 'vite.js');
  if (!existsSync(viteBin)) throw new Error('Không tìm thấy Vite trong workspace; chạy pnpm install trước khi tạo sơ đồ.');
  const port = await freePort();
  const child = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: resolve(repoRoot, 'apps', 'overlay'),
    env: { ...process.env, VITE_PORT: String(port) },
    stdio: 'ignore',
    windowsHide: true,
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (child.exitCode !== null) throw new Error('Overlay Vite dừng trước khi tạo được sơ đồ.');
      try { ready = (await fetch(baseUrl)).ok; } catch { /* Vite đang khởi động */ }
      if (ready) break;
      await delay(250);
    }
    if (!ready) throw new Error('Hết thời gian chờ overlay để chụp sơ đồ.');

    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.route('**/api/theme', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resolvedTheme(manifest)) }));
    const reviewHudConfig = {
      ...DEFAULT_HUD_CONFIG,
      images: { ...DEFAULT_HUD_CONFIG.images, bgQuestion: 'theme-map-review-question-bg' },
    };
    await page.route('**/api/hud', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reviewHudConfig) }));
    await page.route('**/themes/**', async (route) => {
      const path = new URL(route.request().url()).pathname.split('/').slice(3).map((part) => decodeURIComponent(part)).join('/');
      const file = await serveDirectory(options.themeDirectory, path);
      if (!file) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: file.contentType, body: file.data });
    });
    await page.route((url) => url.pathname.startsWith('/assets/'), async (route) => {
      const path = new URL(route.request().url()).pathname.split('/').slice(2).map((part) => decodeURIComponent(part)).join('/');
      const file = await serveDirectory(options.fallbackAssets, path);
      if (!file) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: file.contentType, body: file.data });
    });

    const scenes = [
      { id: 'LOBBY', mock: 'lobby-queue' }, { id: 'QUESTION', mock: 'question' },
      { id: 'REVEAL', mock: 'top3-throne-held-short-reveal' }, { id: 'VICTORY', mock: 'victory' },
    ];
    const screenshots: Array<{ scene: string; base64: string; mcImageCenter: { left: number; top: number } }> = [];
    for (const scene of scenes) {
      await page.goto(`${baseUrl}/?mock=${scene.mock}&role=preview`, { waitUntil: 'domcontentloaded' });
      await settleThemeCapture(page);
      await assertCanonicalThroneLayout(page, scene.id, scene.mock);
      let mcImageCenter = markerPosition('mc.static', 0, 'asset');
      if (assetScenes('mc.static').includes(scene.id)) {
        const mcFigure = page.locator('#stage .v3-mc-figure').first();
        try { await mcFigure.waitFor({ state: 'visible', timeout: 15_000 }); }
        catch { throw new Error(`Không thấy khung MC để đặt marker mc.static/mc.sequenceDir ở màn ${scene.id} (${scene.mock}).`); }
        const stageBox = await page.locator('#stage').boundingBox();
        const mcFigureBox = await mcFigure.boundingBox();
        if (!stageBox || !mcFigureBox || mcFigureBox.width < 4 || mcFigureBox.height < 4)
          throw new Error(`Không đo được bbox .v3-mc-figure để đặt marker mc.static/mc.sequenceDir ở màn ${scene.id}.`);
        mcImageCenter = {
          left: ((mcFigureBox.x + mcFigureBox.width / 2 - stageBox.x) / stageBox.width) * 100,
          top: ((mcFigureBox.y + mcFigureBox.height / 2 - stageBox.y) / stageBox.height) * 100,
        };
      }
      const screenshot = await page.screenshot({ type: 'png', animations: 'disabled', fullPage: false });
      screenshots.push({ scene: scene.id, base64: screenshot.toString('base64'), mcImageCenter });
    }

    const assetRows = THEME_ASSET_SLOTS.map((slot, index) => ({ id: String(index + 1).padStart(2, '0'), name: slot, slot }));
    const textRows = Object.keys(THEME_DEFAULT_TEXTS).map((key, index) => ({ id: `T${String(index + 1).padStart(2, '0')}`, name: `texts.${key}`, key }));
    const assetLegend = legendRows(assetRows);
    const textLegend = legendRows(textRows, true);
    const audioCount = assetRows.filter((row) => row.slot.startsWith('audio.')).length;
    const panels = screenshots.map((shot) =>
      `<article class="panel"><div class="scene-name">${shot.scene} · OVERLAY 1080 × 1920</div><div class="stage"><img src="data:image/png;base64,${shot.base64}">${markerElements(shot.scene, assetRows, textRows, shot.mcImageCenter)}</div></article>`).join('');
    const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><style>
      *{box-sizing:border-box}html,body{margin:0;background:#0a0d22;color:#f7f7ff;font-family:"Segoe UI","Be Vietnam Pro",Arial,sans-serif}body{width:1780px;min-height:2020px;padding:30px;overflow:hidden}
      h1{font-size:32px;margin:0 0 6px;color:#ffcc58}p{margin:0 0 20px;color:#b9c1ea;font-size:15px}.layout{display:grid;grid-template-columns:1080px 640px;gap:30px}.panels{display:grid;grid-template-columns:520px 520px;grid-template-rows:925px 925px;gap:18px}.panel{position:relative;width:520px;height:925px;border:1px solid #8cc8fb;border-radius:12px;overflow:hidden;background:linear-gradient(160deg,#121632,#2d387f 55%,#121632)}.scene-name{height:38px;padding:9px 12px;background:#121632;font-size:13px;font-weight:700;color:#ffcc58;letter-spacing:1px}.stage{position:relative;width:520px;height:887px;overflow:hidden;background:#121632}.stage img{display:block;width:100%;height:100%;object-fit:fill}.marker{position:absolute;z-index:4;transform:translate(-50%,-50%);width:25px;height:25px;display:grid;place-items:center;border:2px solid #fff;border-radius:50%;background:#d24470;color:white;font-size:9px;font-weight:900;box-shadow:0 1px 8px #000}.marker.text-marker{background:#ffcc58;color:#121632}.legend{height:1868px;padding:18px 20px;background:#121632;border:1px solid #8cc8fb66;border-radius:12px;overflow:hidden}.legend h2{font-size:20px;color:#ffcc58;margin:0 0 12px}.legend p{font-size:12px;margin:0 0 12px}.legend ul{list-style:none;margin:0;padding:0;columns:1}.legend li{display:flex;align-items:center;gap:10px;min-height:28px;border-bottom:1px solid #ffffff14;font-size:11px}.legend li b{flex:none;width:34px;padding:4px 3px;text-align:center;border-radius:6px;background:#d24470}.legend li code{font:11px "Segoe UI",Arial,sans-serif;overflow-wrap:anywhere}.legend .text-row b{background:#ffcc58;color:#121632}.divider{height:1px;background:#8cc8fb66;margin:16px 0}.note{margin-top:14px;padding:10px;background:#2d387f66;border-radius:8px;color:#dfe4ff;font-size:11px}
      </style><body><h1>SƠ ĐỒ THEME · ${ESCAPE(manifest.name)}</h1><p>Ảnh chụp overlay thật, mỗi khung 1080 × 1920 đã thu nhỏ để ghép. Chấm hồng = asset, chấm vàng = texts; mã khớp bảng trong CAN-CHUAN-BI.md.</p><div class="layout"><section class="panels">${panels}</section><aside class="legend"><h2>ASSET · ${assetRows.length} SLOT</h2><p>Âm thanh (${audioCount} slot) là cue theo sự kiện nên không có vùng hình.</p><ul>${assetLegend}</ul><div class="divider"></div><h2>CHỮ · ${textRows.length} KHÓA</h2><ul>${textLegend}</ul><div class="note">Sơ đồ vị trí không làm thay đổi bố cục của overlay. Các khung, ghế, đồng hồ, câu hỏi và bảng được giữ cố định trong ứng dụng.</div></aside></div></body></html>`;
    const mapPage = await browser.newPage({ viewport: { width: 1780, height: 2020 }, deviceScaleFactor: 1 });
    await mapPage.setContent(html, { waitUntil: 'load' });
    return await mapPage.screenshot({ type: 'png', fullPage: true });
  } finally {
    await browser?.close();
    child.kill();
    await Promise.race([new Promise<void>((done) => child.once('exit', () => done())), delay(1_000)]);
  }
}

const REVIEW_SCENES = [
  { id: 'LOBBY', mock: 'lobby-queue' }, { id: 'QUESTION', mock: 'question' },
  { id: 'QUESTION', mock: 'question', urgent: true },
  { id: 'REVEAL', mock: 'reveal' }, { id: 'REVEAL', mock: 'fastest-a' }, { id: 'REVEAL', mock: 'fastest-b' },
  { id: 'REVEAL', mock: 'top3-throne-held-short-reveal' },
  { id: 'INTERIM_TOP10', mock: 'top10' }, { id: 'VICTORY', mock: 'victory' },
  { id: 'INTERMISSION', mock: 'intermission' }, { id: 'CONNECTION_LOST', mock: 'connection-lost' },
  { id: 'LOBBY', mock: 'throne-locked' },
] as const;
const THRONE_ARENA_SCENES = new Set(['LOBBY', 'QUESTION', 'REVEAL']);

async function assertCanonicalThroneLayout(page: Page, scene: string, mock: string) {
  // Auxiliary/full-screen scenes share the .v3-stage root class, but do not use
  // the audience seating layout; only arena scenes require the 30-seat throne.
  if (!THRONE_ARENA_SCENES.has(scene)) return;
  const arena = page.locator('#stage .v3-stage');
  if (await arena.count() !== 1) throw new Error(`theme:map mock ${mock} (${scene}) không render đúng một .v3-stage có ngai.`);
  const layout = await arena.evaluate((element) => ({
    hasThrone: element.classList.contains('v3-stage--has-throne'),
    seatCount: element.querySelectorAll('.v3-seat').length,
  }));
  if (!layout.hasThrone) throw new Error(`theme:map mock ${mock} (${scene}) render .v3-stage thiếu .v3-stage--has-throne.`);
  if (layout.seatCount !== 30) throw new Error(`theme:map mock ${mock} (${scene}) có ${layout.seatCount}/30 ghế; chỉ chấp nhận bố cục 30 ghế + ngai.`);
}
type SlotMeasurement = { man: string; x: number; y: number; rong: number; cao: number };
type MapSlotRow = { id: string; lop: number; x: number; y: number; rong: number; cao: number };

type SlotVisibility = {
  display: string;
  visibility: string;
  ancestorDisplayHidden: boolean;
  ancestorVisibilityHidden: boolean;
  effectiveOpacity: number;
  width: number;
  height: number;
  x: number;
  y: number;
  expectedAlphaPixels: number;
  pixelDiffCount: number;
  pixelArea: number;
  pixelDiffThreshold: number;
  minimumRatio: number;
  reportOnly: boolean;
  occludingElements: string[];
};

async function countAlphaPixelsAtSize(page: Page, image: Buffer, width: number, height: number) {
  return page.evaluate(async ({ base64, imageWidth, imageHeight }) => {
    const source = new Image();
    source.src = `data:image/png;base64,${base64}`;
    await source.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(imageWidth));
    canvas.height = Math.max(1, Math.round(imageHeight));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Không tạo được canvas đếm alpha asset theme.');
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let alpha = 3; alpha < pixels.length; alpha += 4) if (pixels[alpha]! > 0) count += 1;
    return count;
  }, { base64: image.toString('base64'), imageWidth: width, imageHeight: height });
}

async function setThemeVisibilityBaseline(page: Page) {
  const screenshot = await page.screenshot({ type: 'png', animations: 'disabled' });
  await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Không tạo được canvas nền để so pixel slot.');
    context.drawImage(image, 0, 0);
    (window as Window & { __themeMapVisibilityBaseline?: { width: number; height: number; pixels: Uint8ClampedArray } }).__themeMapVisibilityBaseline = {
      width: canvas.width,
      height: canvas.height,
      pixels: context.getImageData(0, 0, canvas.width, canvas.height).data,
    };
  }, screenshot.toString('base64'));
}

async function inspectSlotVisibility(page: Page, locator: Locator, expectedAlphaPixels: number, reportOnly = false, minimumRatio = 0.5): Promise<SlotVisibility> {
  const styleAudit = await locator.evaluate((element) => {
    const ownStyle = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const stageRect = document.querySelector('#stage')?.getBoundingClientRect();
    let effectiveOpacity = 1;
    let ancestorDisplayHidden = false;
    let ancestorVisibilityHidden = false;
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      effectiveOpacity *= Number.parseFloat(style.opacity || '1');
      if (style.display === 'none') ancestorDisplayHidden = true;
      if (style.visibility !== 'visible') ancestorVisibilityHidden = true;
    }
    return {
      display: ownStyle.display,
      visibility: ownStyle.visibility,
      ancestorDisplayHidden,
      ancestorVisibilityHidden,
      effectiveOpacity,
      width: rect.width,
      height: rect.height,
      x: Math.round(rect.left - (stageRect?.left ?? 0)),
      y: Math.round(rect.top - (stageRect?.top ?? 0)),
    };
  });

  const viewport = page.viewportSize() ?? { width: 1080, height: 1920 };
  const box = await locator.boundingBox();
  const left = box ? Math.max(0, Math.floor(box.x)) : 0;
  const top = box ? Math.max(0, Math.floor(box.y)) : 0;
  const right = box ? Math.min(viewport.width, Math.ceil(box.x + box.width)) : 0;
  const bottom = box ? Math.min(viewport.height, Math.ceil(box.y + box.height)) : 0;
  const clip = { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  if (!box || clip.width < 1 || clip.height < 1) {
    const pixelArea = Math.round(styleAudit.width * styleAudit.height);
    const pixelDiffThreshold = reportOnly || expectedAlphaPixels === 0
      ? 0
      : Math.max(pixelArea < 100 ? 4 : 0, Math.ceil(expectedAlphaPixels * minimumRatio));
    return { ...styleAudit, expectedAlphaPixels, pixelDiffCount: 0, pixelArea, pixelDiffThreshold, minimumRatio, reportOnly, occludingElements: [] };
  }

  const baselineReady = await page.evaluate(() => !!(window as Window & {
    __themeMapVisibilityBaseline?: { width: number; height: number; pixels: Uint8ClampedArray };
  }).__themeMapVisibilityBaseline);
  if (!baselineReady) throw new Error('Thiếu ảnh nền visibility trước khi kiểm slot.');
  const previousVisibility = await locator.evaluate((element) => [element, ...element.querySelectorAll('*')].map((node) => ({
    value: (node as HTMLElement).style.getPropertyValue('visibility'),
    priority: (node as HTMLElement).style.getPropertyPriority('visibility'),
  })));
  await locator.evaluate((element) => [element, ...element.querySelectorAll('*')].forEach((node) =>
    (node as HTMLElement).style.setProperty('visibility', 'hidden', 'important')));
  let hidden: Buffer;
  try {
    hidden = await page.screenshot({ type: 'png', clip, animations: 'disabled' });
  } finally {
    await locator.evaluate((element, previous) => [element, ...element.querySelectorAll('*')].forEach((node, index) => {
      const style = (node as HTMLElement).style;
      const original = previous[index];
      if (original?.value) style.setProperty('visibility', original.value, original.priority);
      else style.removeProperty('visibility');
    }), previousVisibility);
  }
  const pixelDiff = await page.evaluate(async ({ hiddenBase64, clipRect, reportOnly: isReportOnly, expectedAlphaPixels: expectedPixels, minimumRatio: gateRatio }) => {
    const baseline = (window as Window & {
      __themeMapVisibilityBaseline?: { width: number; height: number; pixels: Uint8ClampedArray };
    }).__themeMapVisibilityBaseline;
    if (!baseline) throw new Error('Thiếu ảnh nền visibility trước khi so pixel.');
    const hiddenImage = new Image();
    hiddenImage.src = `data:image/png;base64,${hiddenBase64}`;
    await hiddenImage.decode();
    const canvas = document.createElement('canvas');
    canvas.width = hiddenImage.naturalWidth;
    canvas.height = hiddenImage.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Không tạo được canvas để so pixel slot.');
    context.drawImage(hiddenImage, 0, 0);
    const hiddenPixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let pixelDiffCount = 0;
    for (let channel = 0; channel < hiddenPixels.length; channel += 4) {
      let pixelChanged = false;
      for (let offset = 0; offset < 4; offset += 1) {
        const pixel = channel / 4;
        const x = pixel % canvas.width;
        const y = Math.floor(pixel / canvas.width);
        const baselineOffset = ((clipRect.y + y) * baseline.width + clipRect.x + x) * 4 + offset;
        if (baseline.pixels[baselineOffset]! !== hiddenPixels[channel + offset]!) {
          pixelChanged = true;
          break;
        }
      }
      if (pixelChanged)
        pixelDiffCount += 1;
    }
    const pixelArea = canvas.width * canvas.height;
    const pixelDiffThreshold = isReportOnly || expectedPixels === 0
      ? 0
      : Math.max(pixelArea < 100 ? 4 : 0, Math.ceil(expectedPixels * gateRatio));
    return { pixelDiffCount, pixelArea, pixelDiffThreshold };
  }, { hiddenBase64: hidden.toString('base64'), clipRect: { x: left, y: top }, reportOnly, expectedAlphaPixels, minimumRatio });
  const ratio = expectedAlphaPixels > 0 ? pixelDiff.pixelDiffCount / expectedAlphaPixels : 0;
  const occludingElements = !reportOnly && ratio >= 0.25 && ratio <= 0.5
    ? await locator.evaluate((element) => {
      const selectors = ['.v3-step', '.v3-seat-name', '.v3-chibi-img'];
      const target = element.getBoundingClientRect();
      const found = new Set<string>();
      for (const selector of selectors) {
        for (const other of document.querySelectorAll(selector)) {
          if (other === element) continue;
          const rect = other.getBoundingClientRect();
          const left = Math.max(target.left, rect.left);
          const top = Math.max(target.top, rect.top);
          const right = Math.min(target.right, rect.right);
          const bottom = Math.min(target.bottom, rect.bottom);
          if (right <= left || bottom <= top) continue;
          found.add(selector);
        }
      }
      return [...found];
    })
    : [];
  return { ...styleAudit, ...pixelDiff, expectedAlphaPixels, minimumRatio, reportOnly, occludingElements };
}

function slotVisibilityProblems(audit: SlotVisibility) {
  const problems: string[] = [];
  if (!audit.reportOnly && audit.pixelDiffCount < audit.pixelDiffThreshold)
    problems.push(`so pixel chỉ khác ${audit.pixelDiffCount}/${audit.expectedAlphaPixels} (${audit.expectedAlphaPixels ? (audit.pixelDiffCount / audit.expectedAlphaPixels * 100).toFixed(1) : 0}%), cần tối thiểu ${audit.pixelDiffThreshold} (ngưỡng ${(audit.minimumRatio * 100).toFixed(0)}% expected và tối thiểu 4 pixel nếu bbox < 100 px²)`);
  return problems;
}

async function inspectSlotForCapture(page: Page, locator: Locator, expectedAlphaPixels: number, reportOnly = false, minimumRatio = 0.5): Promise<{
  audit: SlotVisibility;
  problems: string[];
}> {
  const audit = await inspectSlotVisibility(page, locator, expectedAlphaPixels, reportOnly, minimumRatio);
  return { audit, problems: slotVisibilityProblems(audit) };
}

async function captureK43CoverageScreenshot(page: Page, filePath: string) {
  const queue = await page.locator('.v3-queue').first().boundingBox();
  const bubble = await page.locator('.v3-bubble').first().boundingBox();
  if (!queue || !bubble) throw new Error('Không lấy được bbox .v3-queue/.v3-bubble để lưu ảnh mức che thật của K43.');
  const padding = 18;
  const left = Math.max(0, Math.min(queue.x, bubble.x) - padding);
  const top = Math.max(0, Math.min(queue.y, bubble.y) - padding);
  const right = Math.min(1080, Math.max(queue.x + queue.width, bubble.x + bubble.width) + padding);
  const bottom = Math.min(1920, Math.max(queue.y + queue.height, bubble.y + bubble.height) + padding);
  mkdirSync(dirname(resolve(filePath)), { recursive: true });
  writeFileSync(resolve(filePath), await page.screenshot({ type: 'png', animations: 'disabled', clip: {
    x: left, y: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top),
  } }));
}

function testColorForSlot(id: string) {
  const index = Math.max(0, THEME_SKIN_TARGETS.findIndex((target) => target.id === id));
  return `hsl(${(index * 137.508) % 360} 96% 44%)`;
}

function fullScreenSlot(row: Pick<MapSlotRow, 'rong' | 'cao'>) {
  return row.rong >= 1080 * 0.9 && row.cao >= 1920 * 0.9;
}

function placeMapLabels(rows: MapSlotRow[]) {
  const firstById = new Map<string, MapSlotRow>();
  for (const row of rows) {
    if (fullScreenSlot(row)) continue;
    const previous = firstById.get(row.id);
    if (!previous || row.rong * row.cao > previous.rong * previous.cao) firstById.set(row.id, row);
  }
  const placed: Array<{ id: string; x: number; y: number; width: number; height: number; targetX: number; targetY: number; color: string }> = [];
  const intersects = (left: typeof placed[number], right: typeof placed[number]) =>
    left.x < right.x + right.width && left.x + left.width > right.x
    && left.y < right.y + right.height && left.y + left.height > right.y;
  const ids = [...firstById.keys()].sort((left, right) =>
    THEME_SKIN_TARGETS.findIndex((target) => target.id === left) - THEME_SKIN_TARGETS.findIndex((target) => target.id === right));
  for (const id of ids) {
    const row = firstById.get(id)!;
    const width = 62;
    const height = 30;
    const right = row.x + row.rong - width - 3;
    const bottom = row.y + row.cao - height - 3;
    const insideCandidates = [
      { x: row.x + 3, y: row.y + 3 }, { x: right, y: row.y + 3 },
      { x: row.x + 3, y: bottom }, { x: right, y: bottom },
    ].filter((candidate) => row.rong >= width + 6 && row.cao >= height + 6);
    const candidates = insideCandidates.length ? insideCandidates : [{ x: Math.max(0, Math.min(1080 - width, row.x + 3)), y: Math.max(0, Math.min(1920 - height, row.y + 3)) }];
    const available = (candidate: { x: number; y: number }) => {
      const box = { id, ...candidate, width, height, targetX: row.x + row.rong / 2, targetY: row.y + row.cao / 2, color: testColorForSlot(id) };
      return candidate.x >= 0 && candidate.y >= 0 && candidate.x + width <= 1080 && candidate.y + height <= 1920
        && !placed.some((other) => intersects(box, other));
    };
    let location = candidates.find(available);
    if (!location) {
      let best: { x: number; y: number; distance: number } | undefined;
      for (let y = 0; y + height <= 1920; y += height + 4) {
        for (let x = 0; x + width <= 1080; x += width + 4) {
          const candidate = { x, y };
          if (!available(candidate)) continue;
          const distance = Math.hypot(x - row.x, y - row.y);
          if (!best || distance < best.distance) best = { ...candidate, distance };
        }
      }
      location = best;
    }
    if (!location) throw new Error(`Không thể đặt nhãn ${id} trên sơ đồ mà không đè nhãn khác.`);
    placed.push({ id, ...location, width, height, targetX: row.x + row.rong / 2, targetY: row.y + row.cao / 2, color: testColorForSlot(id) });
  }
  return placed;
}

function mapSvg(rows: MapSlotRow[]) {
  const visibleRows = rows.filter((row) => !fullScreenSlot(row));
  const outlines = visibleRows.map((row) => `<rect x="${row.x}" y="${row.y}" width="${row.rong}" height="${row.cao}" fill="none" stroke="${testColorForSlot(row.id)}" stroke-width="3" vector-effect="non-scaling-stroke"/>`).join('');
  const labels = placeMapLabels(rows).map((label) => {
    return `<g><rect x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}" rx="3" fill="${label.color}" stroke="#fff" stroke-width="1.5"/><text x="${label.x + label.width / 2}" y="${label.y + 21}" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="18" font-weight="900" fill="#fff" stroke="#111827" stroke-width="1.4" paint-order="stroke">${label.id}</text></g>`;
  }).join('');
  return `<svg class="overlay" viewBox="0 0 1080 1920" aria-hidden="true">${outlines}${labels}</svg>`;
}

function mapLegend(rows: MapSlotRow[]) {
  const ids = [...new Set(rows.map((row) => row.id))];
  return ids.map((id) => {
    const target = THEME_SKIN_TARGETS.find((candidate) => candidate.id === id);
    const positions = rows.filter((row) => row.id === id);
    const isFullscreen = positions.length > 0 && positions.every(fullScreenSlot);
    const description = target?.ghiChu.replace(/[.]+$/u, '') ?? 'Vị trí giao diện';
    return `<li><b style="background:${testColorForSlot(id)}">${id}</b><span>${ESCAPE(description)}${isFullscreen ? ' <strong>(phủ toàn màn; không vẽ viền)</strong>' : ''}</span></li>`;
  }).join('');
}

async function writeSceneMap(page: Page, image: Buffer, rows: MapSlotRow[], scene: string, filePath: string) {
  const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;background:#e7e9ee;color:#101322;font-family:"Segoe UI",Arial,sans-serif}body{width:1780px;padding:24px}.title{height:44px;font-size:28px;font-weight:900;letter-spacing:.3px}.layout{display:grid;grid-template-columns:1080px 620px;gap:28px;align-items:start}.stage{position:relative;width:1080px;height:1920px;background:#111}.stage img,.overlay{position:absolute;inset:0;width:1080px;height:1920px}.stage img{object-fit:fill}.overlay{pointer-events:none}.legend{height:1920px;overflow:hidden;padding:18px;background:#fff;border:2px solid #28345f;border-radius:12px}.legend h2{font-size:24px;margin:0 0 10px}.legend p{font-size:15px;line-height:1.4;margin:0 0 12px;color:#374151}.legend ul{list-style:none;margin:0;padding:0}.legend li{display:grid;grid-template-columns:62px 1fr;gap:10px;min-height:30px;align-items:start;padding:4px 0;border-bottom:1px solid #d6d9e0;font-size:15px;line-height:1.25}.legend li b{color:#fff;text-align:center;padding:5px 3px;border-radius:4px;font-size:16px}.legend strong{color:#8c1741;font-size:13px}
    </style><body><div class="title">SƠ ĐỒ ${ESCAPE(scene)} · 1080 × 1920</div><div class="layout"><div class="stage"><img src="data:image/png;base64,${image.toString('base64')}">${mapSvg(rows)}</div><aside class="legend"><h2>Chú giải ID → tên tiếng Việt</h2><p>Nền là ảnh chụp thật của màn. Viền 3 px chỉ đánh dấu slot; nhãn có nền đặc, cỡ chữ 18 px và không chồng nhãn.</p><ul>${mapLegend(rows) || '<li>Không có slot thuộc lớp này.</li>'}</ul></aside></div></body></html>`;
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: filePath, fullPage: true });
}

function inspectionSvg(position: SlotMeasurement, id: string) {
  const measureY = position.y >= 34 ? position.y - 14 : position.y + position.cao + 14;
  const measureX = position.x >= 34 ? position.x - 14 : position.x + position.rong + 14;
  const labelText = `${id} · ${position.x},${position.y}`;
  const labelWidth = Math.min(320, Math.max(140, labelText.length * 11 + 18));
  const labelX = Math.min(1080 - labelWidth, Math.max(0, position.x + 4));
  const labelY = position.y >= 52 ? position.y - 50 : position.y + position.cao + 22;
  const labelFitsOnStage = position.y >= 52 || labelY + 34 <= 1920;
  const label = labelFitsOnStage
    ? `<g><rect x="${labelX}" y="${labelY}" width="${labelWidth}" height="30" rx="3" fill="#9d1022"/><text x="${labelX + 7}" y="${labelY + 21}" fill="#fff" font-size="18" font-weight="900" font-family="Segoe UI,Arial">${labelText}</text></g>`
    : '';
  return `<svg class="overlay" viewBox="0 0 1080 1920" aria-hidden="true"><defs><mask id="outside"><rect width="1080" height="1920" fill="white"/><rect x="${position.x}" y="${position.y}" width="${position.rong}" height="${position.cao}" fill="black"/></mask></defs>
    <rect width="1080" height="1920" fill="#050816" opacity=".70" mask="url(#outside)"/>
    <rect x="${position.x}" y="${position.y}" width="${position.rong}" height="${position.cao}" fill="none" stroke="#ff243a" stroke-width="4" vector-effect="non-scaling-stroke"/>
    <line x1="${position.x}" y1="${measureY}" x2="${position.x + position.rong}" y2="${measureY}" stroke="#ff243a" stroke-width="3"/>
    <line x1="${position.x}" y1="${measureY - 7}" x2="${position.x}" y2="${measureY + 7}" stroke="#ff243a" stroke-width="3"/>
    <line x1="${position.x + position.rong}" y1="${measureY - 7}" x2="${position.x + position.rong}" y2="${measureY + 7}" stroke="#ff243a" stroke-width="3"/>
    <line x1="${measureX}" y1="${position.y}" x2="${measureX}" y2="${position.y + position.cao}" stroke="#ff243a" stroke-width="3"/>
    <line x1="${measureX - 7}" y1="${position.y}" x2="${measureX + 7}" y2="${position.y}" stroke="#ff243a" stroke-width="3"/>
    <line x1="${measureX - 7}" y1="${position.y + position.cao}" x2="${measureX + 7}" y2="${position.y + position.cao}" stroke="#ff243a" stroke-width="3"/>
    ${label}
  </svg>`;
}

async function writeInspectionMap(page: Page, image: Buffer, target: ThemeSkinTarget, position: SlotMeasurement, filePath: string) {
  const name = target.ghiChu.replace(/[.]+$/u, '');
  const fullScreen = fullScreenSlot({ rong: position.rong, cao: position.cao });
  const hasOutsideLabel = position.y >= 52 || position.y + position.cao + 56 <= 1920;
  const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;background:#e7e9ee;color:#101322;font-family:"Segoe UI",Arial,sans-serif}body{width:1780px;padding:24px}.title{height:44px;font-size:28px;font-weight:900}.layout{display:grid;grid-template-columns:1080px 620px;gap:28px;align-items:start}.stage{position:relative;width:1080px;height:1920px;background:#111}.stage img,.overlay{position:absolute;inset:0;width:1080px;height:1920px}.stage img{object-fit:fill}.overlay{pointer-events:none}.detail{height:1920px;padding:24px;background:#fff;border:2px solid #28345f;border-radius:12px}.detail h2{font-size:26px;margin:0 0 12px}.detail p{font-size:21px;line-height:1.5;margin:0 0 18px}.value{padding:16px;margin:16px 0;border-left:7px solid #ff243a;background:#f1f2f5;font-size:24px;font-weight:800}.id-tag{padding:12px;margin:12px 0;background:#9d1022;color:#fff;font-size:22px;font-weight:900}.note{font-size:17px;color:#455064;line-height:1.5}.caption{color:#8b1022;font-size:18px;font-weight:900}
    </style><body><div class="title">SOI SLOT · ${target.id} · ${ESCAPE(position.man)}</div><div class="layout"><div class="stage"><img src="data:image/png;base64,${image.toString('base64')}">${inspectionSvg(position, target.id)}</div><aside class="detail"><h2>${target.id} · ${ESCAPE(name)}</h2>${hasOutsideLabel ? '' : `<div class="id-tag">${target.id} · ${position.x},${position.y}</div>`}<p>Ảnh chụp thật của màn, vùng ngoài slot làm tối 70%; slot được giữ sáng và viền đỏ.</p><div class="value">Kích thước: ${position.rong} × ${position.cao} px</div><div class="value">Toạ độ: x = ${position.x} px · y = ${position.y} px</div><p class="caption">Đường đỏ là số đo bbox; viền đỏ bao quanh vị trí đã đo.</p><p class="note">${fullScreen ? 'Slot phủ toàn màn: không có vùng bên ngoài để làm tối.' : 'Số đo theo stage 1080 × 1920 px.'}<br>Màn: ${target.scenes.join(', ')}<br>Bao gồm đúng nội dung slot; dữ liệu thay đổi của trận không dùng làm tên hay nhãn.</p></aside></div></body></html>`;
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: filePath, fullPage: true });
}

function unaccentedSlug(value: string) {
  return value.replace(/[đĐ]/gu, (character) => character === 'Đ' ? 'D' : 'd')
    .normalize('NFD').replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
}

function slotFolder(target: (typeof THEME_SKIN_TARGETS)[number]) {
  const { id } = target;
  const group = id[0] === 'K' ? 'K-khung' : id[0] === 'I' ? 'I-bieu-tuong' : 'H-hieu-ung';
  const description = target.ghiChu.split(/[.;]/u, 1)[0] ?? target.ghiChu;
  const shortName = unaccentedSlug(description).replace(/^(?:khung|bieu-tuong|huy-hieu)-/u, '').slice(0, 42) || id.toLowerCase();
  return `assets/${group}/${id}-${shortName}`;
}

function stageSelectors(selector: string) {
  return selector.split(',').map((part) => `#stage ${part.trim()}`).join(',');
}

function docForSlot(target: (typeof THEME_SKIN_TARGETS)[number], size: { width: number; height: number }, fileStatus: string, positions: SlotMeasurement[]) {
  const nineSlice = target.nineSlice
    ? `9-slice: tren ${target.nineSlice.tren}px, phai ${target.nineSlice.phai}px, duoi ${target.nineSlice.duoi}px, trai ${target.nineSlice.trai}px; chi keo giãn phần giữa.`
    : '9-slice: không; giữ đúng tỉ lệ và bbox.';
  const activation = target.defaultHidden
    ? `Ẩn ở bản mặc định; thêm ảnh thì hiệu ứng hiện ở ${[...new Set(positions.map((position) => position.man))].join(', ')}, trong vùng bbox CSS ${positions.map((position) => `${position.man} ${position.x},${position.y} ${position.rong}×${position.cao}px`).join('; ')}.`
    : '';
  return [
    `ID: ${target.id}`, `Tên: ${target.ghiChu.replace(/[.]+$/u, '')}`, `Nguồn: theme:map.`, `Nhóm: ${target.nhom}; lớp: ${target.lop}.`,
    `BBox CSS tham chiếu: ${size.width} × ${size.height} px trong stage 1080 × 1920; tọa độ/vùng tràn lấy nguyên theo CSS.`,
    'Định dạng bắt buộc: PNG; nền trong suốt được hỗ trợ; tối đa 50 MB.',
    nineSlice,
    ...(target.variants
      ? [`File bắt buộc: ${target.variants.map((variant) => `${variant.file} (CO_SAN)`).join(', ')}; default.png (${fileStatus}) là ảnh dự phòng.`]
      : [`File bắt buộc: default.png (${fileStatus}).`]),
    ...(target.defaultEmptyReason ? [target.defaultEmptyReason] : []),
    `Màn: ${target.scenes.join(', ')}.`,
    `Soi: soi/${target.id}.png. ${target.ghiChu}`,
    ...(target.nhom === 'H' ? [`Hiệu ứng động: xem soi/${target.id}-asset.png riêng; kiểm thật bằng chạy thử overlay.`] : []),
    ...(activation ? [activation] : []),
    'Chỉ thay hình. Không thay vị trí, kích thước, z-index, thứ tự lớp hoặc dữ liệu trận.',
    '',
  ].join('\n');
}

function removeStaleGeneratedFolders(groupDirectory: string, target: ThemeSkinTarget, expectedDirectory: string) {
  const expected = resolve(expectedDirectory);
  if (!existsSync(groupDirectory)) return;
  for (const entry of readdirSync(groupDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith(`${target.id}-`)) continue;
    const candidate = resolve(groupDirectory, entry.name);
    if (candidate === expected || resolve(candidate, '..') !== resolve(groupDirectory) || lstatSync(candidate).isSymbolicLink()) continue;
    const docPath = join(candidate, 'DOC-TOI.txt');
    if (!existsSync(docPath) || lstatSync(docPath).isSymbolicLink()) continue;
    const doc = readFileSync(docPath, 'utf8');
    const isGenerated = doc.startsWith(`ID: ${target.id}\n`)
      && (doc.includes('\nNguồn: theme:map.') || doc.startsWith(`ID: ${target.id}\nNhóm: ${target.nhom}; lớp: ${target.lop}.`));
    if (isGenerated) rmSync(candidate, { recursive: true, force: false });
  }
}

async function captureSkinElement(page: Page, capture: Locator, target: ThemeSkinTarget) {
  const isolatedEffect = ['H04', 'H05', 'H06', 'H07', 'H08'].includes(target.id);
  const viewport = page.viewportSize() ?? { width: 1080, height: 1920 };
  const keepChildren = target.content === 'icon' ? ['*'] : target.keepChildren ?? (target.id === 'K12' || target.id === 'K13' ? ['svg'] : []);
  await capture.evaluate((element, preserved) => {
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      ancestor.setAttribute('data-theme-capture-ancestor', 'true');
    }
    for (const node of document.body.querySelectorAll('*')) {
      if (node === element || node.contains(element) || element.contains(node)) continue;
      node.setAttribute('data-theme-map-hidden', 'true');
    }
    for (const node of element.querySelectorAll('*')) {
      if (!preserved.some((selector) => node.matches(selector) || node.closest(selector)))
        node.setAttribute('data-theme-capture-content-hidden', 'true');
    }
  }, keepChildren);
  const isolationStyle = await page.addStyleTag({ content: [
    '[data-theme-map-hidden="true"],[data-theme-capture-content-hidden="true"]{visibility:hidden!important}',
    '[data-theme-capture-ancestor="true"]{visibility:visible!important;background:transparent!important;background-image:none!important;box-shadow:none!important;border-color:transparent!important;outline:none!important;filter:none!important}',
    '[data-theme-capture-ancestor="true"]::before,[data-theme-capture-ancestor="true"]::after{content:none!important;display:none!important}',
    'html,body,#root,#stage,#stage .v3-stage,#stage .v3-bg{background:transparent!important;background-image:none!important;box-shadow:none!important}',
    '#stage::before,#stage::after,#stage .v3-stage::before,#stage .v3-stage::after,#stage .v3-bg::before,#stage .v3-bg::after{content:none!important;display:none!important}',
    target.nhom === 'K' || target.content === 'label' ? `${target.selector}{color:transparent!important;text-shadow:none!important}` : '',
    target.nhom === 'H' ? `${target.selector}{display:block!important;visibility:visible!important}` : '',
  ].filter(Boolean).join('\n') });
  try {
    let image: Buffer;
    if (isolatedEffect) {
      const markup = await capture.evaluate((element, dimensions) => {
        const clone = element.cloneNode(true) as Element;
        clone.setAttribute('data-theme-capture-effect', 'true');
        const originals = [element, ...element.querySelectorAll('*')];
        const copies = [clone, ...clone.querySelectorAll('*')];
        originals.forEach((original, index) => {
          const styles = getComputedStyle(original);
          const inline = Array.from(styles, (property) => `${property}:${styles.getPropertyValue(property)}${styles.getPropertyPriority(property) ? ' !important' : ''}`).join(';');
          copies[index]?.setAttribute('style', inline);
        });
        const style = (clone as HTMLElement).style;
        const bounds = element.getBoundingClientRect();
        style.setProperty('position', 'relative', 'important');
        style.setProperty('top', '0', 'important');
        style.setProperty('right', 'auto', 'important');
        style.setProperty('bottom', 'auto', 'important');
        style.setProperty('left', '0', 'important');
        style.setProperty('margin', '0', 'important');
        style.setProperty('width', `${Math.max(1, Math.round(dimensions.targetId === 'H05' ? dimensions.width * 0.34 : bounds.width))}px`, 'important');
        style.setProperty('height', `${Math.max(1, Math.round(dimensions.targetId === 'H05' || dimensions.targetId === 'H08' ? dimensions.height : bounds.height))}px`, 'important');
        if (dimensions.targetId === 'H06') {
          // Keep the sampled peak particle on the transparent canvas; its
          // full-stage rise transform is meaningful in the live scene only.
          style.setProperty('transform', 'none', 'important');
          style.setProperty('top', `${Math.floor(dimensions.height / 2)}px`, 'important');
        }
        return clone.outerHTML;
      }, { width: viewport.width, height: viewport.height, targetId: target.id });
      const browser = page.context().browser();
      if (!browser) throw new Error('Không lấy được browser để cô lập lớp FX khỏi màn game.');
      const isolatedContext = await browser.newContext({ viewport });
      const isolatedPage = await isolatedContext.newPage();
      try {
        await isolatedPage.setContent(`<!doctype html><html><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent;overflow:visible}body{width:${viewport.width}px;height:${viewport.height}px}*{box-sizing:border-box}</style><body>${markup}</body></html>`);
        const isolatedTarget = isolatedPage.locator('[data-theme-capture-effect="true"]');
        if (!await isolatedTarget.boundingBox()) throw new Error(`Không dựng được lớp FX ${target.id} trên nền trong suốt.`);
        image = await isolatedTarget.screenshot({ animations: 'disabled', omitBackground: true });
      } finally {
        await isolatedContext.close();
      }
    } else {
      image = await capture.screenshot({ animations: 'disabled', omitBackground: true });
    }
    const rgbaBase64 = await page.evaluate(async (base64) => {
      const source = new Image();
      source.src = `data:image/png;base64,${base64}`;
      await source.decode();
      const canvas = document.createElement('canvas');
      canvas.width = source.naturalWidth; canvas.height = source.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Không tạo được canvas RGBA cho ảnh skin.');
      context.drawImage(source, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1] ?? '';
    }, image.toString('base64'));
    const buffer = Buffer.from(rgbaBase64, 'base64');
    if (buffer.length < 26 || buffer.toString('ascii', 1, 4) !== 'PNG' || buffer[25] !== 6)
      throw new Error(`Ảnh ${target.id} không được mã hoá PNG RGBA (color type 6).`);
    return buffer;
  } catch (error) {
    const box = await capture.boundingBox();
    throw new Error(`Không chụp được skin ${target.id} (${target.selector}) tại ${box?.x ?? 0},${box?.y ?? 0} ${box?.width ?? 0}×${box?.height ?? 0}px: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await isolationStyle.evaluate((node) => node.parentNode?.removeChild(node));
    await capture.evaluate((element) => {
      document.body.querySelectorAll('[data-theme-map-hidden="true"]').forEach((node) => node.removeAttribute('data-theme-map-hidden'));
      element.querySelectorAll('[data-theme-capture-content-hidden="true"]').forEach((node) => node.removeAttribute('data-theme-capture-content-hidden'));
      for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement)
        ancestor.removeAttribute('data-theme-capture-ancestor');
    });
  }
}

async function writeEffectAssetPreview(page: Page, target: ThemeSkinTarget, image: Buffer, filePath: string) {
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  const largestDimension = Math.max(width, height);
  const scale = largestDimension > 0 && largestDimension < 64 ? 64 / largestDimension : 1;
  const displayWidth = Math.max(1, Math.round(width * scale));
  const displayHeight = Math.max(1, Math.round(height * scale));
  const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:760px;min-height:760px;background:#08111f;color:#f1f5f9;font-family:"Segoe UI",Arial,sans-serif}
    body{padding:24px;display:flex;flex-direction:column;align-items:center;gap:18px}h1{margin:0;font-size:24px;color:#f8d878}.frame{width:700px;height:660px;display:grid;place-items:center;background:#111c2b;border:1px solid #40516b;border-radius:8px}
    img{width:${displayWidth}px;height:${displayHeight}px;max-width:640px;max-height:600px;object-fit:contain;image-rendering:auto}
  </style><body><h1>${ESCAPE(target.id)} · ${ESCAPE(target.ghiChu.replace(/[.]+$/u, ''))}</h1><div class="frame"><img src="data:image/png;base64,${image.toString('base64')}" alt=""></div></body></html>`;
  await page.setContent(html, { waitUntil: 'load' });
  await page.locator('img').evaluate((element: HTMLImageElement) => element.decode());
  writeFileSync(filePath, await page.screenshot({ fullPage: true }));
}

async function pinThemeEffectAtPeak(page: Page, target: ThemeSkinTarget, scene: { id: string }) {
  let declarations = '';
  if (target.id === 'H04' && scene.id === 'VICTORY') {
    declarations = 'animation-name:arena-confetti-fall!important;animation-duration:var(--confetti-duration)!important;animation-timing-function:linear!important;animation-iteration-count:infinite!important;animation-delay:calc(-.5 * var(--confetti-duration))!important;animation-play-state:paused!important';
  } else if (target.id === 'H05' && scene.id === 'VICTORY') {
    declarations = 'animation-name:overlay-victory-beam-sweep!important;animation-duration:6.8s!important;animation-timing-function:ease-in-out!important;animation-iteration-count:infinite!important;animation-delay:-3.4s!important;animation-play-state:paused!important';
  } else if (target.id === 'H06') {
    declarations = 'animation-name:arena-particle-rise!important;animation-duration:var(--particle-duration)!important;animation-timing-function:linear!important;animation-iteration-count:infinite!important;animation-delay:calc(-.12 * var(--particle-duration))!important;animation-play-state:paused!important';
  } else if (target.id === 'H07' && ['QUESTION', 'REVEAL'].includes(scene.id)) {
    declarations = 'animation-name:overlay-bolt-flash!important;animation-duration:.52s!important;animation-timing-function:steps(5,end)!important;animation-iteration-count:1!important;animation-fill-mode:both!important;animation-delay:-46.8ms!important;animation-play-state:paused!important';
  } else if (target.id === 'H08') {
    declarations = scene.id === 'VICTORY'
      ? 'animation-name:overlay-victory-flash!important;animation-duration:.8s!important;animation-timing-function:ease-out!important;animation-iteration-count:1!important;animation-fill-mode:both!important;animation-delay:-160ms!important;animation-play-state:paused!important'
      : ['QUESTION', 'REVEAL', 'INTERMISSION'].includes(scene.id)
        ? 'animation-name:overlay-lightning-flash!important;animation-duration:.48s!important;animation-timing-function:ease-out!important;animation-iteration-count:1!important;animation-fill-mode:both!important;animation-delay:-38.4ms!important;animation-play-state:paused!important'
        : '';
  }
  return declarations ? page.addStyleTag({ content: `${target.selector}{${declarations}}` }) : undefined;
}

async function transparentPng(page: Page, width: number, height: number) {
  const base64 = await page.evaluate(({ imageWidth, imageHeight }) => {
    const canvas = document.createElement('canvas');
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    return canvas.toDataURL('image/png').split(',')[1] ?? '';
  }, { imageWidth: width, imageHeight: height });
  return Buffer.from(base64, 'base64');
}

async function pngHasVisiblePixels(page: Page, image: Buffer) {
  return page.evaluate(async (base64) => {
    const source = new Image();
    source.src = `data:image/png;base64,${base64}`;
    await source.decode();
    const canvas = document.createElement('canvas');
    canvas.width = source.naturalWidth;
    canvas.height = source.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Không tạo được canvas để kiểm tra ảnh default.');
    context.drawImage(source, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let alpha = 3; alpha < pixels.length; alpha += 4) if (pixels[alpha]! > 0) return true;
    return false;
  }, image.toString('base64'));
}

function fitNineSlice(slice: (typeof THEME_SKIN_TARGETS)[number]['nineSlice'], size: { width: number; height: number }) {
  if (!slice) return null;
  const fitPair = (first: number, second: number, dimension: number) => {
    if (first + second < dimension) return [first, second] as const;
    const available = Math.max(0, dimension - 1);
    const total = first + second;
    const fittedFirst = total ? Math.floor(available * first / total) : 0;
    return [fittedFirst, available - fittedFirst] as const;
  };
  const [tren, duoi] = fitPair(slice.tren, slice.duoi, size.height);
  const [trai, phai] = fitPair(slice.trai, slice.phai, size.width);
  return { tren, phai, duoi, trai };
}

/**
 * Đo bbox trực tiếp từ overlay 1080×1920; tạo registry, ảnh map từng màn/lớp,
 * ảnh soi và ảnh skin mặc định chụp từ CSS đang được duyệt.
 */
export async function createThemeReviewArtifacts(
  manifest: ThemeManifest,
  options: { themeDirectory: string; fallbackAssets: string; captureDefaultSkins?: boolean },
): Promise<{ registry: ThemeSlotRegistry; skinAssets: Record<string, string>; missingSlots: string[] }> {
  const { chromium } = await import('@playwright/test');
  const repoRoot = process.cwd();
  const viteBin = resolve(repoRoot, 'apps', 'overlay', 'node_modules', 'vite', 'bin', 'vite.js');
  if (!existsSync(viteBin)) throw new Error('Không tìm thấy Vite trong workspace; chạy pnpm install trước khi tạo sơ đồ.');
  const port = await freePort();
  const child = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: resolve(repoRoot, 'apps', 'overlay'), env: { ...process.env, VITE_PORT: String(port) }, stdio: 'ignore', windowsHide: true,
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  const reviewRoot = options.themeDirectory;
  const sceneDirectory = join(reviewRoot, 'SO-DO');
  const inspectDirectory = join(reviewRoot, 'soi');
  mkdirSync(sceneDirectory, { recursive: true });
  mkdirSync(inspectDirectory, { recursive: true });
  const measurements = new Map<string, SlotMeasurement[]>();
  const captureBuffers = new Map<string, Buffer>();
  const visibilityAssets = new Map<string, Buffer>();
  const sceneScreenshots = new Map<string, Buffer>();
  const mapRowsByScene = new Map<string, Array<{ id: string; lop: number; x: number; y: number; rong: number; cao: number }>>();
  const primaryMockByScene = new Map<string, string>();
  const measurementMocks = new Map<string, { mock: string; index: number }>();
  const visibilityFailures = new Map<string, string[]>();
  const visibilityExemptions: Array<{ id: string; scene: string; mock: string; reason: string; problems: string[] }> = [];
  const visibilityMeasurements: Array<{
    id: string; scene: string; mock: string; element: number; display: string; visibility: string;
    ancestorDisplayHidden: boolean; ancestorVisibilityHidden: boolean; effectiveOpacity: number;
    x: number; y: number; width: number; height: number; expectedAlphaPixels: number; pixelDiffCount: number; ratio: number | null; pixelArea: number;
    pixelDiffThreshold: number; minimumRatio: number; reportOnly: boolean; occludingElements: string[]; result: string; passed: boolean;
  }> = [];
  const effectAssetChecks: Array<{ id: string; scene: string; mock: string; element: number; assetUrl: string; expectedUrl: string; passed: boolean; result: string }> = [];
  const expectedAlphaPixelsBySlot = new Map<string, number>();
  let activeThemeResponse: ReturnType<typeof resolvedTheme>;
  const missingVisibilityErrors: string[] = [];
  let visibilityChecks = 0;
  const missingSlots = new Set<string>();
  let skinSlots: ThemeSlotRegistry | undefined;
  const slotRegistryPath = join(reviewRoot, 'slots.json');
  if (existsSync(slotRegistryPath)) {
    try {
      const result = ThemeSlotRegistrySchema.safeParse(JSON.parse(readFileSync(slotRegistryPath, 'utf8')) as unknown);
      if (result.success) skinSlots = result.data;
    } catch { /* CLI validation reports malformed slots.json elsewhere. */ }
  }
  activeThemeResponse = resolvedTheme(manifest, skinSlots);
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (child.exitCode !== null) throw new Error('Overlay Vite dừng trước khi tạo được sơ đồ.');
      try { ready = (await fetch(baseUrl)).ok; } catch { /* Vite đang khởi động */ }
      if (ready) break;
      await delay(250);
    }
    if (!ready) throw new Error('Hết thời gian chờ overlay để chụp sơ đồ.');
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.route('**/themes/**', async (route) => {
      const path = new URL(route.request().url()).pathname.split('/').slice(3).map((part) => decodeURIComponent(part)).join('/');
      const file = await serveDirectory(options.themeDirectory, path);
      if (!file) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: file.contentType, body: file.data });
    });
    await page.route('**/api/theme', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(activeThemeResponse) }));
    await page.route('**/api/hud', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DEFAULT_HUD_CONFIG) }));
    await page.route('**/hud-assets/theme-map-review-question-bg', (route) => route.fulfill({
      status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jq5sAAAAASUVORK5CYII=', 'base64'),
    }));
    await page.route((url) => url.pathname.startsWith('/assets/'), async (route) => {
      const path = new URL(route.request().url()).pathname.split('/').slice(2).map((part) => decodeURIComponent(part)).join('/');
      const file = await serveDirectory(options.fallbackAssets, path);
      if (!file) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: file.contentType, body: file.data });
    });

    for (const scene of REVIEW_SCENES) {
      if (!primaryMockByScene.has(scene.id)) primaryMockByScene.set(scene.id, scene.mock);
      await page.goto(`${baseUrl}/?mock=${scene.mock}&role=preview`, { waitUntil: 'domcontentloaded' });
      if ('urgent' in scene && scene.urgent) {
        await page.waitForFunction(() => !!document.querySelector('[data-testid="stage"]'));
        await page.locator('.v3-timer').evaluate((element) => element.classList.add('is-urgent'));
      }
      await settleThemeCapture(page);
      await assertCanonicalThroneLayout(page, scene.id, scene.mock);
      if (scene.id === 'LOBBY' && scene.mock === 'lobby-queue' && process.env.QUIZ_THEME_K43_COVERAGE_SCREENSHOT)
        await captureK43CoverageScreenshot(page, process.env.QUIZ_THEME_K43_COVERAGE_SCREENSHOT);
      const optionalEffects = THEME_SKIN_TARGETS.filter((target) => target.defaultHidden && target.scenes.includes(scene.id));
      if (optionalEffects.length) await page.addStyleTag({ content: optionalEffects.map((target) =>
        `${stageSelectors(target.selector)}{display:block!important;visibility:visible!important;opacity:1!important;animation:none!important}`,
      ).join('\n') });
      await setThemeVisibilityBaseline(page);
      const layerRows: Array<{ id: string; lop: number; x: number; y: number; rong: number; cao: number }> = [];
      for (const target of THEME_SKIN_TARGETS.filter((row) => row.scenes.includes(scene.id))) {
        const locator = page.locator(target.selector);
        const count = await locator.count();
        if (count > 500) throw new Error(`Slot ${target.id} khớp ${count} phần tử ở màn ${scene.id}; vượt giới hạn review 500, cần chia slot hoặc kiểm tra selector.`);
        if (count === 0) {
          const failures = visibilityFailures.get(target.id) ?? [];
          failures.push(`${scene.id} (${scene.mock}): selector không khớp phần tử.`);
          visibilityFailures.set(target.id, failures);
          continue;
        }
        const preferredCaptureScene = !['K22', 'K33'].includes(target.id) || scene.mock === 'throne-locked';
        if (preferredCaptureScene && target.variants) {
          for (const variant of target.variants) {
            const variantKey = `${target.id}:${variant.file}`;
            if (visibilityAssets.has(variantKey)) continue;
            const variantLocator = page.locator(variant.selector);
            let variantCount = await variantLocator.count();
            if (!variantCount && variant.file === 'mo.png') {
              const hiddenOption = page.locator('.v3-option').first();
              if (await hiddenOption.count()) {
                await hiddenOption.evaluate((element) => {
                  element.classList.add('is-hidden');
                  element.dataset.themeSyntheticHidden = 'true';
                });
                variantCount = await variantLocator.count();
              }
            }
            if (!variantCount) continue;
            const variantElement = variantLocator.first();
            const sourceVariant = existingThemeSkinFile(manifest, reviewRoot, target, variant.file);
            let variantImage = sourceVariant ?? captureBuffers.get(variantKey);
            if (!variantImage) variantImage = await captureSkinElement(page, variantElement, target);
            visibilityAssets.set(variantKey, variantImage);
            if (options.captureDefaultSkins && !sourceVariant && !captureBuffers.has(variantKey)) captureBuffers.set(variantKey, variantImage);
            const variantBox = await variantElement.boundingBox();
            if (!variantBox) continue;
            const expectedAlphaPixels = await countAlphaPixelsAtSize(page, variantImage, variantBox.width, variantBox.height);
            const normalizeDimOpacity = target.id === 'K14' && variant.file === 'sai.png';
            const previousOpacity = normalizeDimOpacity
              ? await variantElement.evaluate((element) => ({ value: element.style.getPropertyValue('opacity'), priority: element.style.getPropertyPriority('opacity') }))
              : undefined;
            if (normalizeDimOpacity)
              await variantElement.evaluate((element) => element.style.setProperty('opacity', '1', 'important'));
            try {
              if (normalizeDimOpacity) await setThemeVisibilityBaseline(page);
              const variantAudit = await inspectSlotVisibility(page, variantElement, expectedAlphaPixels, target.nhom === 'H', 0.25);
              const variantProblems = slotVisibilityProblems(variantAudit);
              visibilityChecks += 1;
              visibilityMeasurements.push({
                id: target.id, scene: scene.id, mock: scene.mock, element: 1,
                display: variantAudit.display, visibility: variantAudit.visibility,
                ancestorDisplayHidden: variantAudit.ancestorDisplayHidden,
                ancestorVisibilityHidden: variantAudit.ancestorVisibilityHidden,
                effectiveOpacity: variantAudit.effectiveOpacity, x: variantAudit.x, y: variantAudit.y, width: variantAudit.width, height: variantAudit.height,
                expectedAlphaPixels: variantAudit.expectedAlphaPixels,
                pixelDiffCount: variantAudit.pixelDiffCount,
                ratio: variantAudit.expectedAlphaPixels > 0 ? variantAudit.pixelDiffCount / variantAudit.expectedAlphaPixels : null,
                pixelArea: variantAudit.pixelArea,
                pixelDiffThreshold: variantAudit.pixelDiffThreshold, minimumRatio: variantAudit.minimumRatio,
                reportOnly: variantAudit.reportOnly, occludingElements: variantAudit.occludingElements,
                result: variantAudit.reportOnly ? 'BAO_CAO_H' : expectedAlphaPixels === 0 ? 'TRONG_SUOT_CO_Y' : variantProblems.length ? 'FAIL' : 'PASS',
                passed: variantProblems.length === 0,
              });
              if (variantProblems.length) {
                const failures = visibilityFailures.get(target.id) ?? [];
                failures.push(`${scene.id} (${scene.mock}) biến thể ${variant.file}: ${variantProblems.join('; ')}`);
                visibilityFailures.set(target.id, failures);
              }
              captureBuffers.set(variantKey, await captureSkinElement(page, variantElement, target));
            } finally {
              if (normalizeDimOpacity && previousOpacity) await variantElement.evaluate((element, original) => {
                if (original.value) element.style.setProperty('opacity', original.value, original.priority);
                else element.style.removeProperty('opacity');
              }, previousOpacity);
              await page.locator('[data-theme-synthetic-hidden="true"]').evaluateAll((elements) => elements.forEach((element) => {
                element.classList.remove('is-hidden');
                delete (element as HTMLElement).dataset.themeSyntheticHidden;
              }));
              if (normalizeDimOpacity) await setThemeVisibilityBaseline(page);
            }
          }
        }
        const peakAnimation = await pinThemeEffectAtPeak(page, target, scene);
        if (peakAnimation) await setThemeVisibilityBaseline(page);
        const defaultKey = `${target.id}:default.png`;
        let defaultGateImage = existingThemeSkinFile(manifest, reviewRoot, target)
          ?? captureBuffers.get(defaultKey) ?? visibilityAssets.get(defaultKey);
        if (!defaultGateImage) {
          const firstBox = await locator.first().boundingBox();
          if (!firstBox) throw new Error(`Không đo được bbox slot ${target.id} để đếm alpha asset.`);
          defaultGateImage = target.defaultEmptyReason || (target.defaultHidden && !target.captureDefaultHidden)
            ? await transparentPng(page, Math.max(1, Math.round(firstBox.width)), Math.max(1, Math.round(firstBox.height)))
            : await captureSkinElement(page, locator.first(), target);
          visibilityAssets.set(defaultKey, defaultGateImage);
          if (options.captureDefaultSkins && preferredCaptureScene) captureBuffers.set(defaultKey, defaultGateImage);
        }
        try {
          for (let index = 0; index < count; index += 1) {
            const candidate = locator.nth(index);
            const candidateBox = await candidate.boundingBox();
            if (!candidateBox) continue;
            let candidateImage = defaultGateImage;
            for (const variant of target.variants ?? []) {
              if (!await candidate.evaluate((element, selector) => element.matches(selector), variant.selector)) continue;
              const variantKey = `${target.id}:${variant.file}`;
              candidateImage = existingThemeSkinFile(manifest, reviewRoot, target, variant.file)
                ?? captureBuffers.get(variantKey) ?? visibilityAssets.get(variantKey)
                ?? await captureSkinElement(page, candidate, target);
              visibilityAssets.set(variantKey, candidateImage);
              if (options.captureDefaultSkins && preferredCaptureScene
                && !existingThemeSkinFile(manifest, reviewRoot, target, variant.file) && !captureBuffers.has(variantKey))
                captureBuffers.set(variantKey, candidateImage);
              break;
            }
            const expectedAlphaPixels = await countAlphaPixelsAtSize(page, candidateImage, candidateBox.width, candidateBox.height);
            expectedAlphaPixelsBySlot.set(target.id, Math.max(expectedAlphaPixelsBySlot.get(target.id) ?? 0, expectedAlphaPixels));
            const check = await inspectSlotForCapture(page, candidate, expectedAlphaPixels, target.nhom === 'H', 0.25);
            const { audit: visibility, problems } = check;
              visibilityChecks += 1;
              visibilityMeasurements.push({
                id: target.id, scene: scene.id, mock: scene.mock, element: index + 1,
                display: visibility.display, visibility: visibility.visibility,
                ancestorDisplayHidden: visibility.ancestorDisplayHidden,
                ancestorVisibilityHidden: visibility.ancestorVisibilityHidden,
                effectiveOpacity: visibility.effectiveOpacity, x: visibility.x, y: visibility.y, width: visibility.width, height: visibility.height,
                expectedAlphaPixels: visibility.expectedAlphaPixels,
                pixelDiffCount: visibility.pixelDiffCount,
                ratio: visibility.expectedAlphaPixels > 0 ? visibility.pixelDiffCount / visibility.expectedAlphaPixels : null,
                pixelArea: visibility.pixelArea,
                pixelDiffThreshold: visibility.pixelDiffThreshold, minimumRatio: visibility.minimumRatio,
                reportOnly: visibility.reportOnly, occludingElements: visibility.occludingElements,
                result: visibility.reportOnly ? 'BAO_CAO_H' : expectedAlphaPixels === 0 ? 'TRONG_SUOT_CO_Y' : problems.length ? 'FAIL' : 'PASS',
                passed: problems.length === 0,
              });
              if (expectedAlphaPixels === 0)
                visibilityExemptions.push({ id: target.id, scene: scene.id, mock: scene.mock, reason: 'TRONG_SUOT_CO_Y', problems: [] });
              if (problems.length) {
                const failure = `${scene.id} (${scene.mock}) phần tử ${index + 1}: ${problems.join('; ')}`;
                if (target.defaultEmptyReason) {
                  visibilityExemptions.push({ id: target.id, scene: scene.id, mock: scene.mock, reason: target.defaultEmptyReason, problems });
                } else {
                  const failures = visibilityFailures.get(target.id) ?? [];
                  failures.push(failure);
                  visibilityFailures.set(target.id, failures);
                }
              }
              const box = await locator.nth(index).boundingBox();
              if (!box || box.width < 1 || box.height < 1) continue;
              const stageBox = await page.locator('#stage').boundingBox();
              if (!stageBox) throw new Error(`Không đo được bbox stage màn ${scene.id}.`);
              const position: SlotMeasurement = {
                man: scene.id,
                x: Math.round(box.x - stageBox.x), y: Math.round(box.y - stageBox.y),
                rong: Math.max(1, Math.round(box.width)), cao: Math.max(1, Math.round(box.height)),
              };
              const slots = measurements.get(target.id) ?? [];
              const key = JSON.stringify(position);
              if (!slots.some((candidate) => JSON.stringify(candidate) === key)) slots.push(position);
              measurements.set(target.id, slots);
              measurementMocks.set(`${target.id}:${key}`, { mock: scene.mock, index });
              layerRows.push({ id: target.id, lop: target.lop, ...position });
              if (!captureBuffers.has(`${target.id}:default.png`) && options.captureDefaultSkins
                && (target.defaultEmptyReason || (target.defaultHidden && !target.captureDefaultHidden))) {
                captureBuffers.set(`${target.id}:default.png`, await transparentPng(page, position.rong, position.cao));
              }
              const defaultKey = `${target.id}:default.png`;
              if (preferredCaptureScene && !captureBuffers.has(defaultKey) && options.captureDefaultSkins) {
                captureBuffers.set(defaultKey, await captureSkinElement(page, locator.nth(index), target));
              }
          }
        } finally {
          if (peakAnimation) await peakAnimation.evaluate((node) => node.parentNode?.removeChild(node));
        }
      }
      const sceneRows = mapRowsByScene.get(scene.id) ?? [];
      for (const row of layerRows) {
        if (!sceneRows.some((candidate) => candidate.id === row.id && candidate.x === row.x && candidate.y === row.y && candidate.rong === row.rong && candidate.cao === row.cao))
          sceneRows.push(row);
      }
      mapRowsByScene.set(scene.id, sceneRows);
    }

    // One map per screen plus isolated layer maps. The real scene screenshot is
    // kept intact; SVG contributes outlines only (never a filled marker layer).
    const mapPage = await browser.newPage({ viewport: { width: 1780, height: 2020 }, deviceScaleFactor: 1 });
    for (const [sceneId, mock] of primaryMockByScene) {
      await page.goto(`${baseUrl}/?mock=${mock}&role=preview`, { waitUntil: 'domcontentloaded' });
      await settleThemeCapture(page);
      if (!sceneScreenshots.has(sceneId)) sceneScreenshots.set(sceneId, await page.screenshot({ type: 'png', animations: 'disabled' }));
      const rows = mapRowsByScene.get(sceneId) ?? [];
      const screenshot = sceneScreenshots.get(sceneId);
      if (!screenshot) throw new Error(`Thiếu ảnh chụp thật của màn ${sceneId}.`);
      const aliases = sceneId === 'INTERIM_TOP10' ? ['INTERIM_TOP10', 'LEADERBOARD'] : [sceneId];
      for (const alias of aliases) {
        await writeSceneMap(mapPage, screenshot, rows, alias, join(sceneDirectory, `${alias}.png`));
        for (let layer = 0; layer <= 3; layer += 1) {
          await writeSceneMap(mapPage, screenshot, rows.filter((row) => row.lop === layer), `${alias} · lớp ${layer}`, join(sceneDirectory, `${alias}-lop-${layer}.png`));
        }
      }
    }
    await mapPage.close();

    const skinAssets: Record<string, string> = {};
    const slotRows: Array<Record<string, unknown>> = [];
    const contactCards: Array<{ id: string; name: string; image?: Buffer; emptyReason?: string }> = [];
    const effectPreviewPage = await browser.newPage({ viewport: { width: 760, height: 810 }, deviceScaleFactor: 1 });
    for (const target of THEME_SKIN_TARGETS) {
      const places = measurements.get(target.id) ?? [];
      if (!places.length) {
        missingSlots.add(target.id);
        if (!target.defaultEmptyReason) {
          const scenes = visibilityFailures.get(target.id) ?? [];
          missingVisibilityErrors.push(`slot ${target.id} ở màn ${target.scenes.join(', ')}.${scenes.length ? ` Chi tiết: ${scenes.join(' | ')}` : ' Không tìm thấy phần tử để đo.'}`);
        }
        continue;
      }
      const configuredFolder = manifest.skinAssets?.[target.id];
      const folder = configuredFolder ?? slotFolder(target);
      const absoluteFolder = join(options.themeDirectory, ...folder.split('/'));
      const groupDirectory = join(options.themeDirectory, ...folder.split('/').slice(0, -1));
      if (options.captureDefaultSkins && !configuredFolder) removeStaleGeneratedFolders(groupDirectory, target, absoluteFolder);
      const wantedFiles = ['default.png', ...(target.variants ?? []).map((variant) => variant.file)];
      const slotImages = new Map<string, Buffer>();
      const fileRows: Array<{ ten: string; batBuoc: boolean; trangThai: string }> = [];
      for (const file of wantedFiles) {
        const captured = captureBuffers.get(`${target.id}:${file}`);
        const existingPath = join(absoluteFolder, file);
        const existing = !captured && existsSync(existingPath) ? readFileSync(existingPath) : undefined;
        const image = captured ?? existing;
        const required = file !== 'default.png' || !target.variants;
        if (image) {
          slotImages.set(file, image);
          fileRows.push({ ten: file, batBuoc: required, trangThai: 'CO_SAN' });
        } else {
          fileRows.push({ ten: file, batBuoc: required, trangThai: required ? 'CAN_CHUAN_BI' : 'TUY_CHON' });
          if (required) missingSlots.add(target.id);
        }
      }
      const image = slotImages.get('default.png') ?? slotImages.values().next().value as Buffer | undefined;
      const defaultImage = slotImages.get('default.png');
      const imageSize = image && image.length >= 24 && image.toString('ascii', 1, 4) === 'PNG'
        ? { width: image.readUInt32BE(16), height: image.readUInt32BE(20) }
        : { width: places[0]!.rong, height: places[0]!.cao };
      if (options.captureDefaultSkins) {
        mkdirSync(absoluteFolder, { recursive: true });
        for (const [file, data] of slotImages) writeFileSync(join(absoluteFolder, file), data);
        writeFileSync(join(absoluteFolder, 'DOC-TOI.txt'), docForSlot(target, imageSize, slotImages.has('default.png') ? 'CO_SAN' : 'THIEU', places), 'utf8');
      }
      if (slotImages.size) skinAssets[target.id] = folder;
      if (defaultImage) {
        const hasPixels = await pngHasVisiblePixels(page, defaultImage);
        if (hasPixels && target.defaultEmptyReason)
          throw new Error(`default.png của ${target.id} có pixel nhìn thấy nhưng được khai báo trống: ${target.defaultEmptyReason}`);
        const expectedAlphaPixels = await countAlphaPixelsAtSize(page, defaultImage, places[0]!.rong, places[0]!.cao);
        expectedAlphaPixelsBySlot.set(target.id, expectedAlphaPixels);
        if (!hasPixels && target.nhom === 'H')
          await writeEffectAssetPreview(effectPreviewPage, target, defaultImage, join(inspectDirectory, `${target.id}-asset.png`));
        contactCards.push({
          id: target.id,
          name: target.ghiChu.replace(/[.]+$/u, ''),
          ...(hasPixels ? { image: defaultImage } : { emptyReason: target.defaultEmptyReason ?? 'TRONG_SUOT_CO_Y' }),
        });
        if (target.nhom === 'H' && hasPixels)
          await writeEffectAssetPreview(effectPreviewPage, target, defaultImage, join(inspectDirectory, `${target.id}-asset.png`));
      }
      const fileStatus = slotImages.has('default.png') ? 'CO_SAN' : 'CAN_CHUAN_BI';
      const allRects = places.map((position) => ({ ...position, right: position.x + position.rong, bottom: position.y + position.cao }));
      const activation = target.defaultHidden
        ? ` Ẩn ở bản mặc định; thêm ảnh thì hiệu ứng hiện ở ${[...new Set(places.map((position) => position.man))].join(', ')}, trong vùng bbox CSS ${places.map((position) => `${position.man} ${position.x},${position.y} ${position.rong}×${position.cao}px`).join('; ')}.`
        : '';
      const overlaps = (left: typeof allRects[number], right: typeof allRects[number]) => left.man === right.man
        && Math.min(left.right, right.right) > Math.max(left.x, right.x)
        && Math.min(left.bottom, right.bottom) > Math.max(left.y, right.y);
      const above = THEME_SKIN_TARGETS.filter((other) => other.lop > target.lop
        && (measurements.get(other.id) ?? []).some((otherPosition) => allRects.some((rect) => overlaps(rect, { ...otherPosition, right: otherPosition.x + otherPosition.rong, bottom: otherPosition.y + otherPosition.cao }))))
        .map((other) => other.id);
      const below = THEME_SKIN_TARGETS.filter((other) => other.lop < target.lop
        && (measurements.get(other.id) ?? []).some((otherPosition) => allRects.some((rect) => overlaps(rect, { ...otherPosition, right: otherPosition.x + otherPosition.rong, bottom: otherPosition.y + otherPosition.cao }))))
        .map((other) => other.id);
      slotRows.push({
        id: target.id, nhom: target.nhom, lop: target.lop, thuMuc: folder,
        files: fileRows,
        kichThuoc: { rong: imageSize.width, cao: imageSize.height, tiLe: imageSize.width / imageSize.height, saiSoPx: 0 },
        nineSlice: fitNineSlice(target.nineSlice, imageSize), dinhDang: ['PNG'], nenTrongSuot: true, dungLuongToiDa: 50 * 1024 * 1024,
        viTri: places, nam_tren: above, nam_duoi: below, ghiChu: `${target.selector}. ${target.ghiChu}${target.defaultEmptyReason ? ` ${target.defaultEmptyReason}` : ''}${activation}`,
      });
    }
    const contactPage = await browser.newPage({ viewport: { width: 1780, height: 1200 }, deviceScaleFactor: 1 });
    const contactHtml = `<!doctype html><html lang="vi"><meta charset="utf-8"><style>
      *{box-sizing:border-box}html,body{margin:0;background:#d1d3d8;color:#171923;font-family:"Segoe UI",Arial,sans-serif}body{width:1780px;padding:24px}h1{font-size:30px;margin:0 0 8px}p{font-size:15px;margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(8,1fr);gap:10px}.card{height:168px;background:#b8bac0;border:1px solid #6b6e78;border-radius:6px;padding:7px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:space-between}.card img,.empty{width:100%;height:126px;object-fit:contain;background:#b8bac0}.empty{display:flex;flex-direction:column;justify-content:center;gap:7px;padding:8px;color:#4d315c}.empty b{font-size:15px}.empty span{font-size:10px;white-space:normal;overflow-wrap:anywhere}.card strong{font-size:14px}.card>span{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
      </style><body><h1>DEFAULT-CONTACT · SKIN RGBA</h1><p>Ảnh xem trên nền xám trung tính. ${contactCards.length} khung/biểu tượng/hiệu ứng; nền trong suốt được giữ nguyên.</p><div class="grid">${contactCards.map((card) => `<article class="card">${card.image
        ? `<img src="data:image/png;base64,${card.image.toString('base64')}" alt="">`
        : `<div class="empty"><b>TRỐNG (cố ý)</b><span>${ESCAPE(card.emptyReason ?? '')}</span></div>`}<strong>${card.id}</strong><span>${ESCAPE(card.name)}</span></article>`).join('')}</div></body></html>`;
    await contactPage.setContent(contactHtml, { waitUntil: 'load' });
    writeFileSync(join(reviewRoot, 'default-contact.png'), await contactPage.screenshot({ fullPage: true }));
    await contactPage.close();
    await effectPreviewPage.close();
    const parsedRegistry = ThemeSlotRegistrySchema.safeParse({ schemaVersion: 1, slots: slotRows });
    if (!parsedRegistry.success) throw new Error('Không tạo được slots.json: ' + parsedRegistry.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
    writeFileSync(join(reviewRoot, 'slots.json'), `${JSON.stringify(parsedRegistry.data, null, 2)}\n`, 'utf8');

    const auditThemeId = 'theme-map-audit';
    activeThemeResponse = resolvedTheme({ ...manifest, id: auditThemeId, skinAssets } as ThemeManifest, parsedRegistry.data);
    for (const target of THEME_SKIN_TARGETS.filter((row) => row.nhom === 'H')) {
      const folder = skinAssets[target.id];
      const expectedAlphaPixels = expectedAlphaPixelsBySlot.get(target.id) ?? 0;
      for (const sceneId of target.scenes) {
        const scene = REVIEW_SCENES.find((candidate) => candidate.id === sceneId);
        if (!scene) {
          const result = `slot ${target.id} chưa có mock để kiểm DOM ở màn ${sceneId}.`;
          missingVisibilityErrors.push(result);
          effectAssetChecks.push({ id: target.id, scene: sceneId, mock: '', element: 0, assetUrl: '', expectedUrl: '', passed: false, result });
          continue;
        }
        await page.goto(`${baseUrl}/?mock=${scene.mock}&role=preview`, { waitUntil: 'domcontentloaded' });
        await settleThemeCapture(page);
        await assertCanonicalThroneLayout(page, sceneId, scene.mock);
        await page.waitForFunction((themeId) => document.documentElement.dataset.themeId === themeId, auditThemeId);
        const locator = page.locator(target.selector);
        const count = await locator.count();
        if (!count) {
          const result = `selector không có phần tử trong DOM ở đúng màn ${sceneId}.`;
          missingVisibilityErrors.push(`slot ${target.id} (${sceneId}): ${result}`);
          effectAssetChecks.push({ id: target.id, scene: sceneId, mock: scene.mock, element: 0, assetUrl: '', expectedUrl: '', passed: false, result });
          continue;
        }
        if (expectedAlphaPixels === 0 && target.defaultEmptyReason) {
          const expectedUrl = folder
            ? `/themes/${encodeURIComponent(auditThemeId)}/${folder.split('/').map(encodeURIComponent).join('/')}/${encodeURIComponent('default.png')}`
            : '';
          for (let index = 0; index < count; index += 1) {
            effectAssetChecks.push({
              id: target.id,
              scene: sceneId,
              mock: scene.mock,
              element: index + 1,
              assetUrl: '',
              expectedUrl,
              passed: true,
              result: 'TRONG_SUOT_CO_Y: default alpha=0; bỏ probe tải CSS/ảnh theo C-0414.',
            });
          }
          continue;
        }
        if (!folder) {
          const result = 'thiếu thư mục asset trong theme manifest.';
          missingVisibilityErrors.push(`slot ${target.id} (${sceneId}): ${result}`);
          effectAssetChecks.push({ id: target.id, scene: sceneId, mock: scene.mock, element: count, assetUrl: '', expectedUrl: '', passed: false, result });
          continue;
        }
        const expectedUrl = `/themes/${encodeURIComponent(auditThemeId)}/${folder.split('/').map(encodeURIComponent).join('/')}/${encodeURIComponent('default.png')}`;
        try {
          await page.waitForFunction((url) => {
            const style = document.querySelector<HTMLStyleElement>('style[data-theme-skins="true"]');
            return !!style?.textContent?.includes(url);
          }, expectedUrl, { timeout: 120000 });
        } catch {
          const diagnostic = await page.evaluate(async ({ slot, url }) => {
            const style = document.querySelector<HTMLStyleElement>('style[data-theme-skins="true"]');
            const response = await fetch('/api/theme', { cache: 'no-store' });
            const theme = response.ok ? await response.json() as { skinAssets?: Record<string, string> } : null;
            const directory = theme?.skinAssets?.[slot];
            const directoryPath = directory?.split('?')[0]?.replace(/\/+$/u, '');
            const version = directory?.includes('?') ? `?${directory.split('?').slice(1).join('?')}` : '';
            const probeUrl = directoryPath ? `${directoryPath}/default.png${version}` : `${url}?v=1`;
            const probe = await new Promise<{ ok: boolean; width: number; url: string }>((resolveProbe) => {
              const image = new Image();
              const timer = window.setTimeout(() => resolveProbe({ ok: false, width: image.naturalWidth, url: probeUrl }), 5000);
              image.onload = () => { window.clearTimeout(timer); resolveProbe({ ok: true, width: image.naturalWidth, url: probeUrl }); };
              image.onerror = () => { window.clearTimeout(timer); resolveProbe({ ok: false, width: image.naturalWidth, url: probeUrl }); };
              image.src = probeUrl;
            });
            return {
              themeId: document.documentElement.dataset.themeId,
              stylesheetExists: !!style,
              stylesheetLength: style?.textContent?.length ?? 0,
              themeResponseOk: response.ok,
              skinAssetCount: Object.keys(theme?.skinAssets ?? {}).length,
              configuredDirectory: directory ?? null,
              probe,
            };
          }, { slot: target.id, url: expectedUrl });
          throw new Error('Không hoàn tất tải CSS skin trước khi kiểm asset ' + target.id + ': ' + JSON.stringify({
            ...diagnostic,
            localAssetExists: existsSync(join(options.themeDirectory, ...folder.split('/'), 'default.png')),
          }));
        }
        const computed = await locator.evaluateAll((elements) => elements.map((node) => {
          const element = node as HTMLElement & { src?: string };
          const descendants = Array.from(element.querySelectorAll('*'));
          return [element, ...descendants].flatMap((item) => {
            const source = item as HTMLElement & { src?: string };
            const style = getComputedStyle(item);
            return [style.backgroundImage, style.borderImageSource, source.src ?? ''];
          }).filter(Boolean).join(' ');
        }));
        for (const [index, assetUrl] of computed.entries()) {
          const passed = assetUrl.includes(expectedUrl);
          const transparency = expectedAlphaPixels === 0 ? 'TRONG_SUOT_CO_Y; ' : '';
          const result = passed
            ? `${transparency}BAO_CAO_H: DOM và CSS/src trỏ đúng asset.`
            : `FAIL: DOM/CSS/src không trỏ đúng asset ${expectedUrl}; thấy ${assetUrl || '(không có nguồn)'}.`;
          effectAssetChecks.push({ id: target.id, scene: sceneId, mock: scene.mock, element: index + 1, assetUrl, expectedUrl, passed, result });
          if (!passed) missingVisibilityErrors.push(`slot ${target.id} (${sceneId}) phần tử ${index + 1}: ${result}`);
        }
      }
    }
    activeThemeResponse = resolvedTheme(manifest, skinSlots);

    // One actual-scene inspection image for every unique ID (including full-screen slots).
    const inspectPage = await browser.newPage({ viewport: { width: 1780, height: 2020 }, deviceScaleFactor: 1 });
    for (const target of THEME_SKIN_TARGETS) {
      const places = [...(measurements.get(target.id) ?? [])].sort((left, right) => right.rong * right.cao - left.rong * left.cao);
      const position = places[0];
      if (!position) continue;
      let mock = measurementMocks.get(`${target.id}:${JSON.stringify(position)}`)?.mock ?? primaryMockByScene.get(position.man) ?? position.man.toLowerCase();
      let index = measurementMocks.get(`${target.id}:${JSON.stringify(position)}`)?.index ?? 0;
      if (target.id === 'K13' || target.id === 'K22' || target.id === 'K33') {
        mock = target.id === 'K13' ? 'question' : 'throne-locked';
        index = 0;
      }
      await page.goto(`${baseUrl}/?mock=${mock}&role=preview`, { waitUntil: 'domcontentloaded' });
      if (target.id === 'K13') {
        await page.waitForFunction(() => !!document.querySelector('[data-testid="stage"]'));
        await page.locator('.v3-timer').evaluate((element) => element.classList.add('is-urgent'));
      }
      await settleThemeCapture(page);
      const optionalEffects = THEME_SKIN_TARGETS.filter((row) => row.defaultHidden && row.scenes.includes(position.man));
      if (optionalEffects.length) await page.addStyleTag({ content: optionalEffects.map((row) =>
        `${stageSelectors(row.selector)}{display:block!important;visibility:visible!important;opacity:1!important;animation:none!important}`,
      ).join('\n') });
      await setThemeVisibilityBaseline(page);
      const inspectionTarget = page.locator(target.selector).nth(index);
      const inspectionCount = await inspectionTarget.count();
      if (!inspectionCount && !target.defaultEmptyReason)
        missingVisibilityErrors.push(`slot ${target.id} ở màn ${position.man} (${mock}): selector không khớp phần tử trước khi tạo soi/${target.id}.png.`);
      if (inspectionCount) {
        const image = existingThemeSkinFile(manifest, reviewRoot, target) ?? visibilityAssets.get(`${target.id}:default.png`) ?? transparentPng(page, position.rong, position.cao);
        const expectedAlphaPixels = await countAlphaPixelsAtSize(page, await image, position.rong, position.cao);
        const check = await inspectSlotForCapture(page, inspectionTarget, expectedAlphaPixels, target.nhom === 'H', 0.25);
          if (check.problems.length && !target.defaultEmptyReason)
            missingVisibilityErrors.push(`slot ${target.id} ở màn ${position.man} (${mock}) trước khi tạo soi/${target.id}.png: ${check.problems.join('; ')}.`);
          if (check.problems.length && target.defaultEmptyReason)
            visibilityExemptions.push({ id: target.id, scene: position.man, mock, reason: target.defaultEmptyReason, problems: check.problems });
          const screenshot = await page.screenshot({ type: 'png', animations: 'disabled' });
          if (!screenshot) throw new Error(`Thiếu ảnh màn để soi slot ${target.id} (${position.man}).`);
          await writeInspectionMap(inspectPage, screenshot, target, position, join(inspectDirectory, `${target.id}.png`));
      } else {
        const screenshot = await page.screenshot({ type: 'png', animations: 'disabled' });
        if (!screenshot) throw new Error(`Thiếu ảnh màn để soi slot ${target.id} (${position.man}).`);
        await writeInspectionMap(inspectPage, screenshot, target, position, join(inspectDirectory, `${target.id}.png`));
      }
    }
    await inspectPage.close();
    const summarizeVisibility = (row: (typeof visibilityMeasurements)[number]) => ({
      scene: row.scene,
      mock: row.mock,
      element: row.element,
      x: row.x,
      y: row.y,
      width: row.width,
      height: row.height,
      changed: row.pixelDiffCount,
      expected: row.expectedAlphaPixels,
      ratio: row.ratio,
      ratioPercent: row.ratio === null ? null : Number((row.ratio * 100).toFixed(2)),
      occludingElements: row.occludingElements,
    });
    const visibilityBySlot = THEME_SKIN_TARGETS.map((target) => {
      const rows = visibilityMeasurements.filter((row) => row.id === target.id);
      const measuredRows = rows.filter((row) => row.ratio !== null);
      const pixelRows = measuredRows.filter((row) => !row.reportOnly);
      const positionKeys = new Set(measuredRows.map((row) => `${row.x}:${row.y}:${row.width}:${row.height}`));
      const multiPosition = positionKeys.size > 1;
      const minimumRatio = multiPosition ? 0.25 : 0.5;
      for (const row of rows) {
        row.minimumRatio = row.reportOnly ? 0 : minimumRatio;
        row.pixelDiffThreshold = row.reportOnly || row.expectedAlphaPixels === 0
          ? 0
          : Math.max(row.pixelArea < 100 ? 4 : 0, Math.ceil(row.expectedAlphaPixels * minimumRatio));
        row.result = row.reportOnly
          ? 'BAO_CAO_H'
          : row.expectedAlphaPixels === 0
            ? 'TRONG_SUOT_CO_Y'
            : row.pixelDiffCount >= row.pixelDiffThreshold ? 'PASS' : 'FAIL';
        row.passed = row.result !== 'FAIL';
      }
      const ordered = [...measuredRows].sort((left, right) => (left.ratio ?? 0) - (right.ratio ?? 0));
      const min = ordered[0] ?? null;
      const best = ordered.at(-1) ?? null;
      let result: string;
      if (target.nhom === 'H') result = 'BAO_CAO_H';
      else if (!pixelRows.length) result = target.defaultEmptyReason ? 'TRONG_SUOT_CO_Y' : 'FAIL';
      else {
        const bestRatio = best?.ratio ?? 0;
        const everyPositionPasses = pixelRows.every((row) =>
          (row.ratio ?? 0) >= minimumRatio && (row.pixelArea >= 100 || row.pixelDiffCount >= 4));
        result = bestRatio >= 0.5 && everyPositionPasses ? 'PASS' : 'FAIL';
      }
      if (result === 'FAIL') {
        const failures = visibilityFailures.get(target.id) ?? [];
        const failedRows = pixelRows.filter((row) => row.result === 'FAIL');
        for (const row of failedRows) {
          failures.push(`${row.scene} (${row.mock}) phần tử ${row.element} tại (${row.x},${row.y}): ${row.pixelDiffCount}/${row.expectedAlphaPixels} pixel, ngưỡng ${(minimumRatio * 100).toFixed(0)}%.`);
        }
        if (!pixelRows.length) failures.push('Không có vị trí pixel hợp lệ để đánh giá gate.');
        visibilityFailures.set(target.id, failures);
      }
      return {
        id: target.id,
        multiPosition,
        positionCount: positionKeys.size,
        best: best ? summarizeVisibility(best) : null,
        min: min ? summarizeVisibility(min) : null,
        result,
        positions25To50: measuredRows
          .filter((row) => (row.ratio ?? 0) >= 0.25 && (row.ratio ?? 0) <= 0.5)
          .map(summarizeVisibility),
      };
    });
    const failedVisibilitySlots = visibilityBySlot.filter((slot) => slot.result === 'FAIL');
    const mapResult = missingSlots.size || missingVisibilityErrors.length || failedVisibilitySlots.length ? 'FAIL' : 'PASS';
    writeFileSync(join(sceneDirectory, 'kiem-phu.json'), `${JSON.stringify({
      viewport: { width: 1080, height: 1920 }, registeredSlots: slotRows.length,
      matchedSlots: slotRows.length - missingSlots.size, missingSlots: [...missingSlots],
      visibility: {
        checkedCandidates: visibilityChecks,
        rule: 'Mỗi vị trí tính changed/expected. Slot một vị trí đạt từ 50%; slot nhiều vị trí đạt khi vị trí tốt nhất >= 50% và mọi vị trí >= 25%. FAIL nếu có vị trí dưới 25% hoặc không vị trí nào đạt 50%. Bbox dưới 100 px² cần tối thiểu 4 pixel; expected=0 ghi TRONG_SUOT_CO_Y. Nhóm H chỉ báo cáo pixel, gate cứng là DOM + CSS background-image/src đúng asset.',
        slots: visibilityBySlot,
        measurements: visibilityMeasurements,
        intentionallyEmptyExemptions: visibilityExemptions,
        failures: Object.fromEntries(visibilityFailures),
        errors: missingVisibilityErrors,
      },
      effects: { rule: 'H là hiệu ứng động, soi asset riêng và kiểm thử khi chạy overlay; không chặn theo pixel-diff.', checks: effectAssetChecks },
      exempt: ['Nền N', 'dữ liệu trận (được Playwright liệt kê theo selector và bbox)', 'bố cục cố định'],
      pixelReport: 'SO-DO/kiem-phu-pixel.json chứa so sánh Playwright tổng thể C-0397; bảng đo theo slot nằm trong visibility.measurements.',
      result: mapResult,
    }, null, 2)}\n`, 'utf8');
    if (mapResult === 'FAIL')
      throw new Error(`theme:map pixel gate FAIL: slots=${failedVisibilitySlots.map((slot) => slot.id).join(',') || 'không đạt'}; missing=${[...missingSlots].join(',') || 'không'}; errors=${missingVisibilityErrors.join(' | ') || 'không'}`);
    return { registry: parsedRegistry.data, skinAssets, missingSlots: [...missingSlots] };
  } finally {
    await browser?.close();
    child.kill();
    await Promise.race([new Promise<void>((done) => child.once('exit', () => done())), delay(1_000)]);
  }
}
