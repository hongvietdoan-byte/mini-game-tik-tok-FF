import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { relative, resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { DEFAULT_HUD_CONFIG, THEME_ASSET_SLOTS, THEME_DEFAULT_ACHIEVEMENTS, THEME_DEFAULT_TEXTS, type ThemeAssetSlot, type ThemeManifest } from '@quiz/contracts';

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

function resolvedTheme(manifest: ThemeManifest) {
  const id = manifest.id;
  const url = (path: string) => `/themes/${encodeURIComponent(id)}/${path.split('/').map(encodeURIComponent).join('/')}?v=1`;
  const assets = Object.fromEntries(Object.entries(manifest.assets).flatMap(([slot, path]) => path ? [[slot, url(path)]] : []));
  return {
    id, name: manifest.name, version: 1, tokens: manifest.tokens,
    fonts: manifest.fonts.map((font) => ({ family: font.family, url: url(font.file), weight: font.weight, style: font.style })),
    assets, texts: { ...THEME_DEFAULT_TEXTS, ...(manifest.texts ?? {}) },
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
    await page.route('**/api/hud', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DEFAULT_HUD_CONFIG) }));
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
      { id: 'LOBBY', mock: 'lobby' }, { id: 'QUESTION', mock: 'question' },
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
