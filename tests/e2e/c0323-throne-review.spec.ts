import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const outputDirectory = resolve(process.cwd(), '.claude', 'review', 'C0323');
const assetRoots = [
  resolve(process.cwd(), 'assets-local'),
  resolve(process.cwd(), '..', '..', '..', 'assets-local'),
];

function localPng(relativePath: string): string | null {
  for (const root of assetRoots) {
    const path = resolve(root, relativePath);
    if (existsSync(path)) return `data:image/png;base64,${readFileSync(path).toString('base64')}`;
  }
  return null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

const throneEmpty = localPng(join('throne', 'ngai-trong.png'));
const caroline = localPng(join('throne', 'ngai-chibi-007-caroline.png'));
const alvaro = localPng(join('throne', 'ngai-chibi-004-alvaro.png'));
const standingCaroline = localPng(join('chibi', 'chibi-007-caroline.png'));

const sampleCss = `
.c0323-throne-layer { position:absolute; inset:0; z-index:90; pointer-events:none; color:#fff; font-family:inherit; }
.c0323-throne { position:absolute; left:358px; top:965px; width:652px; height:210px; display:flex; align-items:center; gap:22px; }
.v3-stage[data-scene="LOBBY"] .c0323-throne { left:396px; }
.c0323-visual { position:relative; width:210px; height:210px; flex:0 0 210px; filter:drop-shadow(0 0 16px rgba(255,190,55,.24)); }
.c0323-empty, .c0323-owner, .c0323-owner-new { position:absolute; inset:0; width:210px; height:210px; object-fit:contain; }
.c0323-empty { opacity:.98; }
.c0323-owner, .c0323-owner-new { opacity:0; transition:opacity 600ms ease; }
.c0323-throne.is-old .c0323-owner { opacity:1; }
.c0323-throne.is-mid .c0323-owner { opacity:.42; }
.c0323-throne.is-mid .c0323-owner-new { opacity:.58; }
.c0323-throne.is-new .c0323-owner-new { opacity:1; }
.c0323-throne.has-badge .c0323-change-label { display:block; }
.c0323-standing { position:absolute; z-index:2; left:54px; top:44px; width:104px; height:160px; object-fit:contain; filter:drop-shadow(0 4px 8px rgba(0,0,0,.65)); }
.c0323-fallback-shape { position:absolute; inset:10px 15px 5px; border:8px solid #f6bf3f; border-radius:48% 48% 10px 10px; background:linear-gradient(90deg,transparent 0 13%,#952c33 13% 87%,transparent 87%),linear-gradient(180deg,#f8d66c,#9c671b 63%,#49351d); box-shadow:inset 0 0 0 5px #fff0a5,0 8px 0 #784515; clip-path:polygon(0 26%,12% 0,29% 16%,50% 0,71% 16%,88% 0,100% 26%,96% 88%,100% 100%,0 100%,4% 88%); }
.c0323-fallback-shape::after { content:""; position:absolute; left:25%; right:25%; top:38%; bottom:19%; border:6px solid #eab83c; border-radius:42% 42% 12% 12%; background:linear-gradient(180deg,#a92d39,#541b2d); }
.c0323-info { min-width:0; width:420px; display:flex; flex-direction:column; align-items:flex-start; gap:7px; padding:10px 14px; border:2px solid rgba(255,220,121,.76); border-radius:18px; background:linear-gradient(115deg,rgba(22,18,58,.95),rgba(67,39,103,.88)); box-shadow:0 8px 24px rgba(10,6,30,.4),inset 0 0 18px rgba(255,205,82,.12); }
.c0323-kicker { color:#ffdd79; font-size:19px; line-height:23px; font-weight:950; letter-spacing:2px; }
.c0323-name { display:block; width:100%; overflow:hidden; color:#fff; font-size:30px; line-height:38px; font-weight:950; white-space:nowrap; text-overflow:ellipsis; }
.c0323-score-line { display:flex; align-items:baseline; gap:10px; }
.c0323-score { color:#ffd15c; font-size:38px; line-height:44px; font-weight:950; font-variant-numeric:tabular-nums; }
.c0323-score-label { color:#fff1c2; font-size:16px; font-weight:850; letter-spacing:1px; }
.c0323-waiting { align-self:center; margin-top:57px; width:405px; color:#ffe48b; font-size:24px; line-height:32px; font-weight:950; letter-spacing:1px; text-align:center; text-shadow:0 2px 8px #1b0e31; }
.c0323-change-label { position:absolute; z-index:5; left:8px; right:8px; bottom:4px; padding:5px 3px; border:2px solid #ffdf77; border-radius:10px; background:linear-gradient(90deg,#9b4c10,#f9ca49,#9b4c10); color:#321740; font-size:13px; line-height:18px; font-weight:1000; text-align:center; letter-spacing:.35px; box-shadow:0 0 18px 5px rgba(255,197,45,.75); }
.c0323-throne.is-mid .c0323-flash { opacity:1; }
.c0323-flash { position:absolute; z-index:4; inset:-7px; opacity:0; border-radius:50%; background:radial-gradient(ellipse,rgba(255,246,190,.85),rgba(255,193,40,.5) 31%,rgba(255,166,32,.16) 64%,transparent 75%); mix-blend-mode:screen; }
.c0323-change-label { display:none; }
.v3-seat[data-row-index="6"], .v3-seat-name[data-row-index="6"], .v3-step[style*="--r: 6"] { visibility:hidden !important; }
.v3-stage .v3-mc .v3-bubble { top:84px !important; height:105px !important; min-height:105px !important; max-height:105px !important; box-sizing:border-box !important; overflow:hidden !important; }
.v3-bubble p { display:-webkit-box !important; -webkit-box-orient:vertical !important; -webkit-line-clamp:2 !important; overflow:hidden !important; font-size:30px !important; line-height:1.22 !important; }
`;

type Owner = { name: string; score: string };

function throneMarkup(input: {
  owner?: Owner;
  mode: 'old' | 'mid' | 'new' | 'waiting' | 'fallback';
  badge?: boolean;
  image?: string | null;
  oldImage?: string | null;
  standing?: string | null;
  empty?: string | null;
}): string {
  const emptyImage = input.empty ? `<img class="c0323-empty" alt="Ngai vàng trống" src="${input.empty}">` : '<div class="c0323-fallback-shape" aria-label="Mô phỏng ngai vàng trống bằng CSS"></div>';
  const currentImage = input.image ? `<img class="c0323-owner-new" alt="Nhân vật ngồi trên ngai" src="${input.image}">` : '';
  const priorImage = input.oldImage
    ? `<img class="c0323-owner" alt="Chủ ngai trước" src="${input.oldImage}">`
    : input.mode === 'old' && input.image ? `<img class="c0323-owner" alt="Chủ ngai trước" src="${input.image}">` : '';
  const standing = input.standing ? `<img class="c0323-standing" alt="Chibi đứng trước ngai" src="${input.standing}">` : '';
  const owner = input.owner ?? { name: 'FFVN.Kelly', score: '1.850' };
  const waiting = input.mode === 'waiting';
  const fallback = input.mode === 'fallback';
  const longName = owner.name;
  return `<div class="c0323-throne-layer"><section class="c0323-throne is-${input.mode} ${input.badge ? 'has-badge' : ''}" data-testid="c0323-throne">
    <div class="c0323-visual">${emptyImage}${priorImage}${currentImage}${fallback ? standing : ''}<div class="c0323-flash"></div>${input.badge ? '<div class="c0323-change-label">NGAI VÀNG ĐÃ ĐỔI CHỦ</div>' : ''}</div>
    ${waiting ? `<div class="c0323-waiting">NGAI VÀNG ĐANG CHỜ CHỦ</div>` : `<div class="c0323-info"><span class="c0323-kicker">NGAI VÀNG</span><strong class="c0323-name" title="${escapeHtml(longName)}">${escapeHtml(longName)}</strong><div class="c0323-score-line"><strong class="c0323-score">${escapeHtml(owner.score)}</strong><span class="c0323-score-label">ĐIỂM</span></div></div>`}
  </section></div>`;
}

async function installSample(page: Page, input: Parameters<typeof throneMarkup>[0]) {
  await page.locator('.v3-stage').evaluate((stage, { css, markup }) => {
    const style = document.createElement('style');
    style.dataset.c0323 = 'styles';
    style.textContent = css;
    document.head.append(style);
    stage.insertAdjacentHTML('beforeend', markup);
    const bubble = stage.querySelector<HTMLElement>('.v3-bubble p');
    const bubbleFrame = stage.querySelector<HTMLElement>('.v3-bubble');
    if (bubble) bubble.textContent = 'Câu tiếp theo sẽ quyết định ai giữ ngai vàng!';
    if (bubbleFrame) {
      bubbleFrame.style.setProperty('position', 'fixed', 'important');
      bubbleFrame.style.setProperty('left', '411px', 'important');
      bubbleFrame.style.setProperty('top', '844px', 'important');
      bubbleFrame.style.setProperty('width', '568px', 'important');
      bubbleFrame.style.setProperty('height', '105px', 'important');
      bubbleFrame.style.setProperty('min-height', '105px', 'important');
      bubbleFrame.style.setProperty('max-height', '105px', 'important');
      bubbleFrame.style.setProperty('box-sizing', 'border-box', 'important');
      bubbleFrame.style.setProperty('padding', '10px 24px', 'important');
      bubbleFrame.style.setProperty('overflow', 'hidden', 'important');
    }
    const summary = stage.querySelector<HTMLElement>('[data-testid="lobby-seat-count"]');
    if (summary) summary.textContent = '30/35';
  }, { css: sampleCss, markup: throneMarkup(input) });
  await page.waitForTimeout(80);
}

async function saveFullAndZoom(page: Page, prefix: string) {
  await page.screenshot({ path: join(outputDirectory, `${prefix}-1080x1920.png`), animations: 'disabled' });
  await page.screenshot({ path: join(outputDirectory, `${prefix}-throne-zoom.png`), clip: { x: 338, y: 938, width: 684, height: 276 }, animations: 'disabled' });
}

async function sampleMetrics(page: Page, label: string) {
  return page.evaluate((label) => {
    const stage = document.querySelector<HTMLElement>('.v3-stage')!;
    const rect = (selector: string) => {
      const element = stage.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    };
    const throne = rect('[data-testid="c0323-throne"]')!;
    const info = rect('.c0323-info');
    const name = stage.querySelector<HTMLElement>('.c0323-name');
    const bubble = rect('.v3-bubble');
    const bubbleText = stage.querySelector<HTMLElement>('.v3-bubble p');
    const question = rect('.v3-question');
    const plate = rect('.v3-mc-plate');
    const rowLabels = [...stage.querySelectorAll<HTMLElement>('.v3-seat-name')].filter((element) => getComputedStyle(element).visibility !== 'hidden').map((element) => {
      const box = element.getBoundingClientRect();
      return { rowIndex: Number(element.dataset.rowIndex), x: box.x, y: box.y, bottom: box.bottom };
    }).sort((a, b) => a.y - b.y || a.x - b.x);
    const occupiedSeats = [...stage.querySelectorAll<HTMLElement>('.v3-seat:not(.is-empty)')].filter((element) => getComputedStyle(element).visibility !== 'hidden').length;
    return {
      label,
      viewport: { width: innerWidth, height: innerHeight },
      throne,
      panel: info,
      playerName: name ? { text: name.textContent, fontSize: getComputedStyle(name).fontSize, scrollWidth: name.scrollWidth, clientWidth: name.clientWidth, graphemes: [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(name.textContent ?? '')].length } : null,
      scoreFontSize: stage.querySelector<HTMLElement>('.c0323-score') ? getComputedStyle(stage.querySelector<HTMLElement>('.c0323-score')!).fontSize : null,
      bubble,
      bubbleText: bubbleText?.textContent,
      bubbleFontSize: bubbleText ? getComputedStyle(bubbleText).fontSize : null,
      bubbleLineCount: bubbleText ? (() => { const range = document.createRange(); range.selectNodeContents(bubbleText); return range.getClientRects().length; })() : null,
      question,
      mcNameplate: plate,
      clearance: {
        bubbleToThrone: bubble ? throne.y - bubble.bottom : null,
        throneToFirstRemainingAudienceName: rowLabels.length > 0 ? rowLabels[0]!.y - throne.bottom : null,
        mcNameplateToThrone: plate ? throne.x - plate.right : null,
      },
      firstVisibleAudienceRows: [...new Set(rowLabels.map((item) => item.rowIndex))],
      audienceNameRows: rowLabels.slice(0, 8),
      visibleOccupiedSeats: occupiedSeats,
    };
  }, label);
}

test('C-0323 — user throne composites, ownership change, empty and missing-composite mock samples', async ({ page }) => {
  mkdirSync(outputDirectory, { recursive: true });
  await page.setViewportSize({ width: 1080, height: 1920 });
  const measurements: Record<string, unknown> = {};
  const owner = { name: 'FFVN.Kelly', score: '1.850' };
  const longOwner = { name: 'Nguyễn Bảo Minh Tường Vi', score: '2.400' };

  for (const hud of ['1', '0'] as const) {
    await page.goto(`/?mock=question-longest&hud=${hud}&role=program`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.v3-stage')).toBeVisible();
    await installSample(page, { mode: 'new', owner, image: caroline, empty: throneEmpty });
    await saveFullAndZoom(page, `question-owner-caroline-hud-${hud}`);
    const measured = await sampleMetrics(page, `question-owner-caroline-hud-${hud}`);
    measurements[`questionHud${hud}`] = measured;
    expect((measured as { throne: { x: number; y: number; bottom: number } }).throne.x).toBeGreaterThanOrEqual(358);
    expect((measured as { throne: { y: number; bottom: number } }).throne.y).toBeGreaterThanOrEqual(965);
    expect((measured as { throne: { bottom: number } }).throne.bottom).toBeLessThanOrEqual(1176);
    expect((measured as { clearance: { bubbleToThrone: number | null; mcNameplateToThrone: number | null } }).clearance.bubbleToThrone).toBeGreaterThanOrEqual(16);
    expect((measured as { clearance: { mcNameplateToThrone: number | null } }).clearance.mcNameplateToThrone).toBeGreaterThanOrEqual(16);
    expect((measured as { clearance: { throneToFirstRemainingAudienceName: number | null } }).clearance.throneToFirstRemainingAudienceName).toBeGreaterThanOrEqual(16);
    expect((measured as { bubbleLineCount: number }).bubbleLineCount).toBeLessThanOrEqual(2);
    expect((measured as { bubbleFontSize: string }).bubbleFontSize).toBe('30px');
  }

  await page.goto('/?mock=reveal&hud=1&role=program', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.v3-stage')).toBeVisible();
  await installSample(page, { mode: 'old', owner: { name: 'Alvaro', score: '2.310' }, image: alvaro, empty: throneEmpty });
  await saveFullAndZoom(page, 'reveal-owner-change-01-old-alvaro');
  await installSample(page, { mode: 'mid', owner, oldImage: alvaro, image: caroline, empty: throneEmpty, badge: true });
  await saveFullAndZoom(page, 'reveal-owner-change-02-crossfade-gold-flash');
  await page.waitForTimeout(600);
  await installSample(page, { mode: 'new', owner, image: caroline, empty: throneEmpty, badge: true });
  await saveFullAndZoom(page, 'reveal-owner-change-03-new-caroline-badge');
  measurements.reveal = await sampleMetrics(page, 'reveal-owner-change-03-new-caroline-badge');

  await page.goto('/?mock=lobby-35-countdown&role=program', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-testid="lobby-seat-count"]')).toHaveText('35/35');
  await installSample(page, { mode: 'waiting', empty: throneEmpty });
  await saveFullAndZoom(page, 'lobby-empty-throne-waiting-30-seats');
  measurements.lobby = await sampleMetrics(page, 'lobby-empty-throne-waiting-30-seats');
  expect((measurements.lobby as { visibleOccupiedSeats: number }).visibleOccupiedSeats).toBe(30);
  expect((measurements.lobby as { clearance: { mcNameplateToThrone: number | null } }).clearance.mcNameplateToThrone).toBeGreaterThanOrEqual(16);

  await page.goto('/?mock=question-long-name&hud=1&role=program', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.v3-stage')).toBeVisible();
  await installSample(page, { mode: 'new', owner: longOwner, image: caroline, empty: throneEmpty });
  await saveFullAndZoom(page, 'question-owner-name-24-graphemes');
  measurements.longName = await sampleMetrics(page, 'question-owner-name-24-graphemes');
  expect((measurements.longName as { playerName: { graphemes: number } }).playerName.graphemes).toBe(24);
  expect((measurements.longName as { playerName: { fontSize: string } }).playerName.fontSize).toBe('30px');
  expect((measurements.longName as { scoreFontSize: string }).scoreFontSize).toBe('38px');

  await page.goto('/?mock=question&hud=1&role=program', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.v3-stage')).toBeVisible();
  await installSample(page, { mode: 'fallback', owner, standing: standingCaroline, empty: throneEmpty });
  await saveFullAndZoom(page, 'question-missing-owner-composite-standing-chibi');
  measurements.missingComposite = await sampleMetrics(page, 'question-missing-owner-composite-standing-chibi');

  measurements.localAssets = {
    emptyThrone: Boolean(throneEmpty),
    carolineComposite: Boolean(caroline),
    alvaroComposite: Boolean(alvaro),
    standingCaroline: Boolean(standingCaroline),
  };
  const questionMetrics = measurements.questionHud1 as { throne: { x: number; y: number; width: number; height: number; bottom: number }; bubble: { y: number; bottom: number; height: number }; mcNameplate: { right: number }; audienceNameRows: Array<{ rowIndex: number; y: number }> };
  const lobbyMetrics = measurements.lobby as { throne: { x: number; y: number; bottom: number }; clearance: { mcNameplateToThrone: number | null; throneToFirstRemainingAudienceName: number | null }; visibleOccupiedSeats: number };
  const longNameMetrics = measurements.longName as { playerName: { text: string; graphemes: number; fontSize: string; scrollWidth: number; clientWidth: number }; scoreFontSize: string };
  const assetList = Object.entries(measurements.localAssets as Record<string, boolean>).map(([name, present]) => `${name}=${present ? 'có' : 'dùng fallback CSS/đứng'}`).join(', ');
  const report = [
    '# C-0323 — mock ngai vàng dùng ảnh ghép của người dùng',
    '',
    'Các ảnh PNG trong thư mục này là artifact review bị ignore; không đưa ảnh vào commit. Lần chạy này nạp ảnh ghép Caroline/Alvaro, ngai trống và chibi đứng từ `assets-local/`. Nếu checkout thiếu ảnh ghép, sample tự dùng ngai CSS và vẫn chạy được.',
    '',
    `Asset local đã dùng: ${assetList}.`,
    '',
    'Cặp QUESTION gồm `hud=1` và không HUD; REVEAL có ba ảnh chủ cũ → khung crossfade/flash → chủ mới và nhãn đổi chủ; LOBBY có ngai trống, nhãn chờ chủ, 30/35 ghế; thêm bản tên 24 grapheme và fallback dùng ngai trống cùng chibi đứng trước ngai. Khung crossfade minh hoạ 600 ms; nhãn đổi chủ là trạng thái mock khoảng 2 giây, chưa có runtime.',
    '',
    '## Khoảng hở trên QUESTION',
    '',
    '| Phần tử | Toạ độ/kích thước | Khoảng hở |',
    '|---|---:|---:|',
    `| Ngai/panel | x=${questionMetrics.throne.x}, y=${questionMetrics.throne.y}, ${questionMetrics.throne.width}×${questionMetrics.throne.height} | — |`,
    `| Bubble MC | y=${questionMetrics.bubble.y}–${questionMetrics.bubble.bottom}, cao ${questionMetrics.bubble.height}px | đến ngai: ${questionMetrics.throne.y - questionMetrics.bubble.bottom}px |`,
    `| Bảng tên MC | mép phải x=${questionMetrics.mcNameplate.right} | đến ngai: ${questionMetrics.throne.x - questionMetrics.mcNameplate.right}px |`,
    `| Hàng tên đầu tiên còn lại (row ${questionMetrics.audienceNameRows[0]?.rowIndex}) | y=${questionMetrics.audienceNameRows[0]?.y} | từ đáy ngai: ${questionMetrics.audienceNameRows[0]!.y - questionMetrics.throne.bottom}px |`,
    '',
    `Lobby chuyển ngai sang x=${lobbyMetrics.throne.x}; MC nameplate cách ${lobbyMetrics.clearance.mcNameplateToThrone}px, hàng đầu còn lại cách đáy ngai ${lobbyMetrics.clearance.throneToFirstRemainingAudienceName}px; số ghế hiện ${lobbyMetrics.visibleOccupiedSeats}.`,
    `Tên dài: ${longNameMetrics.playerName.graphemes} grapheme, chữ ${longNameMetrics.playerName.fontSize}, điểm ${longNameMetrics.scoreFontSize}; nội dung vượt khung (${longNameMetrics.playerName.scrollWidth}px trên ${longNameMetrics.playerName.clientWidth}px) nên hiện dấu … theo yêu cầu.`,
    '',
    'Chỉ thay DOM/CSS trong bài test để dựng ảnh duyệt; không triển khai hành vi ngai, không vẽ SVG và không sửa sản phẩm.',
  ].join('\n');
  writeFileSync(join(outputDirectory, 'c0323-throne-clearance-measurements.json'), JSON.stringify(measurements, null, 2), 'utf8');
  writeFileSync(join(outputDirectory, 'c0323-throne-review.md'), report, 'utf8');
  console.info(`[C-0323] throne sample, screenshots and measurements: ${outputDirectory}`);
});
