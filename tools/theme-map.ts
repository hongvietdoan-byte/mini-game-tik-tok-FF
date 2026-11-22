import { spawn } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, relative, resolve, sep } from 'node:path';
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

function markerElements(scene: string, assetRows: Array<{ id: string; slot: ThemeAssetSlot }>, textRows: Array<{ id: string; key: string }>) {
  const assets = assetRows.flatMap((row, index) => assetScenes(row.slot).includes(scene)
    ? [{ id: row.id, ...markerPosition(row.slot, index, 'asset'), text: false }]
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
    await page.route('**/assets/**', async (route) => {
      const path = new URL(route.request().url()).pathname.split('/').slice(2).map((part) => decodeURIComponent(part)).join('/');
      const file = await serveDirectory(options.fallbackAssets, path);
      if (!file) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: file.contentType, body: file.data });
    });

    const scenes = [
      { id: 'LOBBY', mock: 'lobby-queue' }, { id: 'QUESTION', mock: 'question' },
      { id: 'REVEAL', mock: 'reveal' }, { id: 'VICTORY', mock: 'victory' },
    ];
    const screenshots: Array<{ scene: string; base64: string }> = [];
    for (const scene of scenes) {
      await page.goto(`${baseUrl}/?mock=${scene.mock}&role=preview`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !!document.querySelector('[data-testid="stage"]'));
      await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
      });
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
      const screenshot = await page.screenshot({ type: 'png', animations: 'disabled', fullPage: false });
      screenshots.push({ scene: scene.id, base64: screenshot.toString('base64') });
    }

    const assetRows = THEME_ASSET_SLOTS.map((slot, index) => ({ id: String(index + 1).padStart(2, '0'), name: slot, slot }));
    const textRows = Object.keys(THEME_DEFAULT_TEXTS).map((key, index) => ({ id: `T${String(index + 1).padStart(2, '0')}`, name: `texts.${key}`, key }));
    const assetLegend = legendRows(assetRows);
    const textLegend = legendRows(textRows, true);
    const audioCount = assetRows.filter((row) => row.slot.startsWith('audio.')).length;
    const panels = screenshots.map((shot) =>
      `<article class="panel"><div class="scene-name">${shot.scene} · OVERLAY 1080 × 1920</div><div class="stage"><img src="data:image/png;base64,${shot.base64}">${markerElements(shot.scene, assetRows, textRows)}</div></article>`).join('');
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
type SlotMeasurement = { man: string; x: number; y: number; rong: number; cao: number };
type MapSlotRow = { id: string; lop: number; x: number; y: number; rong: number; cao: number };

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
  return `<svg class="overlay" viewBox="0 0 1080 1920" aria-hidden="true"><defs><mask id="outside"><rect width="1080" height="1920" fill="white"/><rect x="${position.x}" y="${position.y}" width="${position.rong}" height="${position.cao}" fill="black"/></mask></defs>
    <rect width="1080" height="1920" fill="#050816" opacity=".70" mask="url(#outside)"/>
    <rect x="${position.x}" y="${position.y}" width="${position.rong}" height="${position.cao}" fill="none" stroke="#ff243a" stroke-width="4" vector-effect="non-scaling-stroke"/>
    <line x1="${position.x}" y1="${measureY}" x2="${position.x + position.rong}" y2="${measureY}" stroke="#ff243a" stroke-width="3"/>
    <line x1="${position.x}" y1="${measureY - 7}" x2="${position.x}" y2="${measureY + 7}" stroke="#ff243a" stroke-width="3"/>
    <line x1="${position.x + position.rong}" y1="${measureY - 7}" x2="${position.x + position.rong}" y2="${measureY + 7}" stroke="#ff243a" stroke-width="3"/>
    <line x1="${measureX}" y1="${position.y}" x2="${measureX}" y2="${position.y + position.cao}" stroke="#ff243a" stroke-width="3"/>
    <line x1="${measureX - 7}" y1="${position.y}" x2="${measureX + 7}" y2="${position.y}" stroke="#ff243a" stroke-width="3"/>
    <line x1="${measureX - 7}" y1="${position.y + position.cao}" x2="${measureX + 7}" y2="${position.y + position.cao}" stroke="#ff243a" stroke-width="3"/>
    <g><rect x="${Math.max(0, position.x + 4)}" y="${Math.max(0, position.y + 4)}" width="112" height="34" rx="3" fill="#9d1022"/><text x="${Math.max(0, position.x + 10)}" y="${Math.max(0, position.y + 28)}" fill="#fff" font-size="18" font-weight="900" font-family="Segoe UI,Arial">${id} · ${position.x},${position.y}</text></g>
  </svg>`;
}

async function writeInspectionMap(page: Page, image: Buffer, target: ThemeSkinTarget, position: SlotMeasurement, filePath: string) {
  const name = target.ghiChu.replace(/[.]+$/u, '');
  const fullScreen = fullScreenSlot({ rong: position.rong, cao: position.cao });
  const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;background:#e7e9ee;color:#101322;font-family:"Segoe UI",Arial,sans-serif}body{width:1780px;padding:24px}.title{height:44px;font-size:28px;font-weight:900}.layout{display:grid;grid-template-columns:1080px 620px;gap:28px;align-items:start}.stage{position:relative;width:1080px;height:1920px;background:#111}.stage img,.overlay{position:absolute;inset:0;width:1080px;height:1920px}.stage img{object-fit:fill}.overlay{pointer-events:none}.detail{height:1920px;padding:24px;background:#fff;border:2px solid #28345f;border-radius:12px}.detail h2{font-size:26px;margin:0 0 12px}.detail p{font-size:21px;line-height:1.5;margin:0 0 18px}.value{padding:16px;margin:16px 0;border-left:7px solid #ff243a;background:#f1f2f5;font-size:24px;font-weight:800}.note{font-size:17px;color:#455064;line-height:1.5}.caption{color:#8b1022;font-size:18px;font-weight:900}
    </style><body><div class="title">SOI SLOT · ${target.id} · ${ESCAPE(position.man)}</div><div class="layout"><div class="stage"><img src="data:image/png;base64,${image.toString('base64')}">${inspectionSvg(position, target.id)}</div><aside class="detail"><h2>${target.id} · ${ESCAPE(name)}</h2><p>Ảnh chụp thật của màn, vùng ngoài slot làm tối 70%; slot được giữ sáng và viền đỏ.</p><div class="value">Kích thước: ${position.rong} × ${position.cao} px</div><div class="value">Toạ độ: x = ${position.x} px · y = ${position.y} px</div><p class="caption">Đường đỏ là số đo bbox; viền đỏ bao quanh vị trí đã đo.</p><p class="note">${fullScreen ? 'Slot phủ toàn màn: không có vùng bên ngoài để làm tối.' : 'Số đo theo stage 1080 × 1920 px.'}<br>Màn: ${target.scenes.join(', ')}<br>Bao gồm đúng nội dung slot; dữ liệu thay đổi của trận không dùng làm tên hay nhãn.</p></aside></div></body></html>`;
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
    `Màn: ${target.scenes.join(', ')}.`,
    `Soi: soi/${target.id}.png. ${target.ghiChu}`,
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
  const keepChildren = target.keepChildren ?? (target.id === 'K12' || target.id === 'K13' ? ['svg'] : []);
  await capture.evaluate((element, preserved) => {
    const stage = element.closest<HTMLElement>('#stage');
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      ancestor.dataset.themeCaptureAncestor = 'true';
    }
    for (const node of stage?.querySelectorAll<HTMLElement>('*') ?? []) {
      if (node === element || node.contains(element) || element.contains(node)) continue;
      node.dataset.themeMapHidden = 'true';
    }
    for (const node of element.querySelectorAll<HTMLElement>('*')) {
      if (!preserved.some((selector) => node.matches(selector) || node.closest(selector)))
        node.dataset.themeCaptureContentHidden = 'true';
    }
  }, keepChildren);
  const isolationStyle = await page.addStyleTag({ content: [
    '#stage [data-theme-map-hidden="true"],#stage [data-theme-capture-content-hidden="true"]{visibility:hidden!important}',
    '[data-theme-capture-ancestor="true"]{background:transparent!important;background-image:none!important;box-shadow:none!important;border-color:transparent!important;outline:none!important;filter:none!important}',
    '[data-theme-capture-ancestor="true"]::before,[data-theme-capture-ancestor="true"]::after{content:none!important;display:none!important}',
    'html,body,#root,#stage,#stage .v3-stage,#stage .v3-bg{background:transparent!important;background-image:none!important;box-shadow:none!important}',
    '#stage::before,#stage::after,#stage .v3-stage::before,#stage .v3-stage::after,#stage .v3-bg::before,#stage .v3-bg::after{content:none!important;display:none!important}',
    target.nhom === 'K' || target.content === 'label' ? `${target.selector}{color:transparent!important;text-shadow:none!important}` : '',
    target.nhom === 'H' && !target.defaultHidden ? `${target.selector}{opacity:1!important;visibility:visible!important;animation:none!important}` : '',
  ].filter(Boolean).join('\n') });
  try {
    const image = await capture.screenshot({ animations: 'disabled', omitBackground: true });
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
      const stage = element.closest<HTMLElement>('#stage');
      stage?.querySelectorAll<HTMLElement>('[data-theme-map-hidden="true"]').forEach((node) => delete node.dataset.themeMapHidden);
      element.querySelectorAll<HTMLElement>('[data-theme-capture-content-hidden="true"]').forEach((node) => delete node.dataset.themeCaptureContentHidden);
      for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement)
        delete ancestor.dataset.themeCaptureAncestor;
    });
  }
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
  const sceneScreenshots = new Map<string, Buffer>();
  const mapRowsByScene = new Map<string, Array<{ id: string; lop: number; x: number; y: number; rong: number; cao: number }>>();
  const primaryMockByScene = new Map<string, string>();
  const missingSlots = new Set<string>();
  let skinSlots: ThemeSlotRegistry | undefined;
  const slotRegistryPath = join(reviewRoot, 'slots.json');
  if (existsSync(slotRegistryPath)) {
    try {
      const result = ThemeSlotRegistrySchema.safeParse(JSON.parse(readFileSync(slotRegistryPath, 'utf8')) as unknown);
      if (result.success) skinSlots = result.data;
    } catch { /* CLI validation reports malformed slots.json elsewhere. */ }
  }
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
    await page.route('**/api/theme', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resolvedTheme(manifest, skinSlots)) }));
    await page.route('**/api/hud', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DEFAULT_HUD_CONFIG) }));
    await page.route('**/hud-assets/theme-map-review-question-bg', (route) => route.fulfill({
      status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jq5sAAAAASUVORK5CYII=', 'base64'),
    }));
    await page.route('**/themes/**', async (route) => {
      const path = new URL(route.request().url()).pathname.split('/').slice(3).map((part) => decodeURIComponent(part)).join('/');
      const file = await serveDirectory(options.themeDirectory, path);
      if (!file) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: file.contentType, body: file.data });
    });
    await page.route('**/assets/**', async (route) => {
      const path = new URL(route.request().url()).pathname.split('/').slice(2).map((part) => decodeURIComponent(part)).join('/');
      const file = await serveDirectory(options.fallbackAssets, path);
      if (!file) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: file.contentType, body: file.data });
    });

    for (const scene of REVIEW_SCENES) {
      if (!primaryMockByScene.has(scene.id)) primaryMockByScene.set(scene.id, scene.mock);
      await page.goto(`${baseUrl}/?mock=${scene.mock}&role=preview`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !!document.querySelector('[data-testid="stage"]'));
      if ('urgent' in scene && scene.urgent) {
        await page.locator('.v3-timer').evaluate((element) => element.classList.add('is-urgent'));
      }
      await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
      await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))); });
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
      const optionalEffects = THEME_SKIN_TARGETS.filter((target) => target.defaultHidden && target.scenes.includes(scene.id));
      if (optionalEffects.length) await page.addStyleTag({ content: optionalEffects.map((target) =>
        `${stageSelectors(target.selector)}{display:block!important;visibility:visible!important;opacity:1!important;animation:none!important}`,
      ).join('\n') });
      const layerRows: Array<{ id: string; lop: number; x: number; y: number; rong: number; cao: number }> = [];
      for (const target of THEME_SKIN_TARGETS.filter((row) => row.scenes.includes(scene.id))) {
        const locator = page.locator(target.selector);
        const count = await locator.count();
        if (count > 500) throw new Error(`Slot ${target.id} khớp ${count} phần tử ở màn ${scene.id}; vượt giới hạn review 500, cần chia slot hoặc kiểm tra selector.`);
        if (count === 0) continue;
        for (let index = 0; index < count; index += 1) {
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
          layerRows.push({ id: target.id, lop: target.lop, ...position });
          const preferredCaptureScene = !['K22', 'K33'].includes(target.id) || scene.mock === 'throne-locked';
          if (!captureBuffers.has(`${target.id}:default.png`) && options.captureDefaultSkins && target.defaultHidden) {
            const transparentBase64 = await page.evaluate(({ width, height }) => {
              const canvas = document.createElement('canvas');
              canvas.width = width; canvas.height = height;
              return canvas.toDataURL('image/png').split(',')[1] ?? '';
            }, { width: position.rong, height: position.cao });
            captureBuffers.set(`${target.id}:default.png`, Buffer.from(transparentBase64, 'base64'));
          }
          const defaultKey = `${target.id}:default.png`;
          if (preferredCaptureScene && !captureBuffers.has(defaultKey) && options.captureDefaultSkins) {
            captureBuffers.set(defaultKey, await captureSkinElement(page, locator.nth(index), target));
          }
          for (const variant of target.variants ?? []) {
            const variantKey = `${target.id}:${variant.file}`;
            if (!preferredCaptureScene || !options.captureDefaultSkins || captureBuffers.has(variantKey)) continue;
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
            captureBuffers.set(variantKey, await captureSkinElement(page, variantLocator.first(), target));
            await page.locator('[data-theme-synthetic-hidden="true"]').evaluateAll((elements) => elements.forEach((element) => {
              element.classList.remove('is-hidden');
              delete (element as HTMLElement).dataset.themeSyntheticHidden;
            }));
          }
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
      await page.waitForFunction(() => !!document.querySelector('[data-testid="stage"]'));
      await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))); });
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
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
    const contactCards: Array<{ id: string; name: string; image: Buffer }> = [];
    for (const target of THEME_SKIN_TARGETS) {
      const places = measurements.get(target.id) ?? [];
      if (!places.length) { missingSlots.add(target.id); continue; }
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
          fileRows.push({ ten: file, batBuoc: required, trangThai: required ? 'THIEU' : 'CAN_CHUAN_BI' });
          if (required) missingSlots.add(target.id);
        }
      }
      const image = slotImages.get('default.png') ?? slotImages.values().next().value as Buffer | undefined;
      const imageSize = image && image.length >= 24 && image.toString('ascii', 1, 4) === 'PNG'
        ? { width: image.readUInt32BE(16), height: image.readUInt32BE(20) }
        : { width: places[0]!.rong, height: places[0]!.cao };
      if (options.captureDefaultSkins) {
        mkdirSync(absoluteFolder, { recursive: true });
        for (const [file, data] of slotImages) writeFileSync(join(absoluteFolder, file), data);
        writeFileSync(join(absoluteFolder, 'DOC-TOI.txt'), docForSlot(target, imageSize, slotImages.has('default.png') ? 'CO_SAN' : 'THIEU', places), 'utf8');
      }
      if (slotImages.size) skinAssets[target.id] = folder;
      if (image) contactCards.push({ id: target.id, name: target.ghiChu.replace(/[.]+$/u, ''), image });
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
        viTri: places, nam_tren: above, nam_duoi: below, ghiChu: `${target.selector}. ${target.ghiChu}${activation}`,
      });
    }
    const contactPage = await browser.newPage({ viewport: { width: 1780, height: 1200 }, deviceScaleFactor: 1 });
    const contactHtml = `<!doctype html><html lang="vi"><meta charset="utf-8"><style>
      *{box-sizing:border-box}html,body{margin:0;background:#d1d3d8;color:#171923;font-family:"Segoe UI",Arial,sans-serif}body{width:1780px;padding:24px}h1{font-size:30px;margin:0 0 8px}p{font-size:15px;margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(8,1fr);gap:10px}.card{height:168px;background:#b8bac0;border:1px solid #6b6e78;border-radius:6px;padding:7px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:space-between}.card img{width:100%;height:126px;object-fit:contain;background:#b8bac0}.card strong{font-size:14px}.card span{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
      </style><body><h1>DEFAULT-CONTACT · SKIN RGBA</h1><p>Ảnh xem trên nền xám trung tính. ${contactCards.length} khung/biểu tượng/hiệu ứng; nền trong suốt được giữ nguyên.</p><div class="grid">${contactCards.map((card) => `<article class="card"><img src="data:image/png;base64,${card.image.toString('base64')}" alt=""><strong>${card.id}</strong><span>${ESCAPE(card.name)}</span></article>`).join('')}</div></body></html>`;
    await contactPage.setContent(contactHtml, { waitUntil: 'load' });
    writeFileSync(join(reviewRoot, 'default-contact.png'), await contactPage.screenshot({ fullPage: true }));
    await contactPage.close();
    const parsedRegistry = ThemeSlotRegistrySchema.safeParse({ schemaVersion: 1, slots: slotRows });
    if (!parsedRegistry.success) throw new Error('Không tạo được slots.json: ' + parsedRegistry.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
    writeFileSync(join(reviewRoot, 'slots.json'), `${JSON.stringify(parsedRegistry.data, null, 2)}\n`, 'utf8');
    writeFileSync(join(sceneDirectory, 'kiem-phu.json'), `${JSON.stringify({
      viewport: { width: 1080, height: 1920 }, registeredSlots: slotRows.length,
      matchedSlots: slotRows.length - missingSlots.size, missingSlots: [...missingSlots],
      exempt: ['Nền N', 'dữ liệu trận (được Playwright liệt kê theo selector và bbox)', 'bố cục cố định'],
      pixelReport: 'SO-DO/kiem-phu.json được Playwright ghi kết quả diff sau khi chạy theme:export-default và bộ e2e C-0397.',
      result: missingSlots.size ? 'CHUA_DU_SLOT' : 'CHO_PLAYWRIGHT_DO_PIXEL',
    }, null, 2)}\n`, 'utf8');

    // One actual-scene inspection image for every unique ID (including full-screen slots).
    const inspectPage = await browser.newPage({ viewport: { width: 1780, height: 2020 }, deviceScaleFactor: 1 });
    for (const target of THEME_SKIN_TARGETS) {
      const places = [...(measurements.get(target.id) ?? [])].sort((left, right) => right.rong * right.cao - left.rong * left.cao);
      const position = places[0];
      if (!position) continue;
      let screenshot = sceneScreenshots.get(position.man);
      if (target.id === 'K13' || target.id === 'K22' || target.id === 'K33') {
        const mock = target.id === 'K13' ? 'question' : 'throne-locked';
        await page.goto(`${baseUrl}/?mock=${mock}&role=preview`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!document.querySelector('[data-testid="stage"]'));
        if (target.id === 'K13') await page.locator('.v3-timer').evaluate((element) => element.classList.add('is-urgent'));
        await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
        screenshot = await page.screenshot({ type: 'png', animations: 'disabled' });
      }
      if (!screenshot) throw new Error(`Thiếu ảnh màn để soi slot ${target.id} (${position.man}).`);
      await writeInspectionMap(inspectPage, screenshot, target, position, join(inspectDirectory, `${target.id}.png`));
    }
    await inspectPage.close();
    return { registry: parsedRegistry.data, skinAssets, missingSlots: [...missingSlots] };
  } finally {
    await browser?.close();
    child.kill();
    await Promise.race([new Promise<void>((done) => child.once('exit', () => done())), delay(1_000)]);
  }
}
