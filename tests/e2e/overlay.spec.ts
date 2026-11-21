import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { DEFAULT_HUD_CONFIG, THEME_DEFAULT_TEXTS, THEME_DEFAULT_TOKENS, ThemeManifestSchema, type HudConfig, type ResolvedTheme, type ThemeAssetSlot } from '@quiz/contracts';
import { getE2eAssetDirectory, getE2eTempDirectory } from './assets';
import { makeMockSnapshot } from '../../apps/overlay/src/mock/snapshots';

const scenes = [
  { name: 'lobby', scene: 'LOBBY' },
  { name: 'prepare', scene: 'QUESTION' },
  { name: 'reading', scene: 'QUESTION' },
  { name: 'reading-longest', scene: 'QUESTION' },
  { name: 'question', scene: 'QUESTION' },
  { name: 'reveal', scene: 'REVEAL' },
  { name: 'top10', scene: 'INTERIM_TOP10' },
  { name: 'top10-short', scene: 'INTERIM_TOP10' },
  { name: 'top10-long-name', scene: 'INTERIM_TOP10' },
  { name: 'round-winner', scene: 'ROUND_WINNER' },
  { name: 'victory', scene: 'VICTORY' },
  { name: 'victory-tie', scene: 'VICTORY' },
  { name: 'intermission', scene: 'INTERMISSION' },
  { name: 'connection-lost', scene: 'CONNECTION_LOST' },
  { name: 'paused', scene: 'QUESTION' },
] as const;

const screenshotDirectory = join(getE2eTempDirectory(), 'e2e', 'screenshots');
const c0166ReviewDirectory = join(getE2eTempDirectory(), 'e2e', 'screenshots', 'c0166');
mkdirSync(c0166ReviewDirectory, { recursive: true });
mkdirSync(screenshotDirectory, { recursive: true });
const roundCardMinimums = { title: 26, count: 44 };
const roundCardHeight = 95;
const localAssetDirectory = getE2eAssetDirectory();
const c0386ReviewDirectory = resolve(process.cwd(), 'assets-local/review/c-theme-kit');
const hasLocalCharacterAssets = existsSync(join(localAssetDirectory, 'chibi', 'manifest.json'));
const hasLocalKellyAsset = existsSync(join(localAssetDirectory, 'mc', 'kelly.png'));
const hasLocalEventLogo = existsSync(join(localAssetDirectory, 'brand', 'logo.png'));
const hasLocalVictoryBackground = existsSync(join(localAssetDirectory, 'victory', 'bg-user-cover.jpg'));

let closestSafeMargin = Number.POSITIVE_INFINITY;
let closestSafeScene = '';

test.afterAll(() => {
  console.log(`Cảnh sát biên vùng an toàn nhất: ${closestSafeScene} (${closestSafeMargin.toFixed(1)}px).`);
});

test.beforeAll(() => mkdirSync(screenshotDirectory, { recursive: true }));

function watchPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const pathname = new URL(response.url()).pathname;
    const optionalMcManifest = pathname === '/assets/mc/kelly/manifest.json';
    const optionalArenaAsset = pathname.startsWith('/assets/arena/');
    const optionalAudioAssetMissing = pathname.startsWith('/assets/audio/') && response.status() === 404;
    const optionalEventLogo = pathname === '/assets/brand/logo.png' && !hasLocalEventLogo;
    const optionalVictoryBackground = pathname === '/assets/victory/bg-user-cover.jpg' && !hasLocalVictoryBackground;
    const absentLocalAssetBank = !hasLocalCharacterAssets || !hasLocalKellyAsset;
    if (optionalMcManifest || optionalArenaAsset || optionalAudioAssetMissing || optionalEventLogo || optionalVictoryBackground || (absentLocalAssetBank && pathname.startsWith('/assets/'))) return;
    errors.push(`http ${response.status()}: ${pathname}`);
  });
  return errors;
}

async function openScene(page: Page, sceneName: string, expectedScene: string, role: 'preview' | 'program' = 'preview') {
  const errors = watchPageErrors(page);
  const query = new URLSearchParams({ mock: sceneName, role });
  await page.goto(`/?${query.toString()}`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle('Nhà Thông Thái Free Fire · Overlay');
  const stage = page.locator(`[data-testid="stage"][data-scene="${expectedScene}"]`);
  await expect(stage).toBeVisible();
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  return { stage, errors };
}

async function captureThemeFrameStyles(stage: Locator) {
  return stage.evaluate((root) => {
    const selectors = [
      '.v3-top10', '.v3-top10 li', '.v3-board', '.v3-board-tab', '.v3-timer', '.v3-question',
      '.v3-options', '.v3-option', '.v3-option-text', '.v3-option-count', '.v3-option-meter',
      '.v3-leaderboard-full', '.v3-full-row', '.v3-round-card', '.v3-event-mark',
      '.v3-mc .v3-bubble', '.v3-mc .v3-mc-plate', '.v3-intermission', '.v3-connection-lost',
      '.v3v-nameplate', '.v3v-title', '.v3v-subtitle',
    ].join(',');
    return Array.from(root.querySelectorAll<HTMLElement>(selectors)).map((element) => {
      const style = getComputedStyle(element);
      return {
        className: element.className.toString(),
        position: style.position,
        left: style.left,
        top: style.top,
        width: style.width,
        height: style.height,
        boxSizing: style.boxSizing,
        display: style.display,
        gridTemplateColumns: style.gridTemplateColumns,
        gridTemplateRows: style.gridTemplateRows,
        gap: style.gap,
        padding: style.padding,
        border: style.border,
        borderRadius: style.borderRadius,
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
        color: style.color,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        clipPath: style.clipPath,
        opacity: style.opacity,
      };
    });
  });
}

async function captureThemeFrameBoxes(stage: Locator) {
  const selectors = [
    '.v3-header', '.v3-title', '.v3-logo-frame', '.v3-event-mark', '.v3-round-card',
    '.v3-board', '.v3-question', '.v3-options', '.v3-option', '.v3-top10', '.v3-leaderboard-full',
    '.v3-full-row', '.v3v-header', '.v3v-trophy', '.v3v-podium', '.v3v-nameplate',
  ];
  return stage.evaluate((root, frameSelectors) => frameSelectors.flatMap((selector) =>
    Array.from(root.querySelectorAll<HTMLElement>(selector)).map((element, index) => {
      const bounds = element.getBoundingClientRect();
      return { selector: `${selector}[${index}]`, bounds: [bounds.x, bounds.y, bounds.width, bounds.height] };
    })), selectors);
}

function readThemeFixture(id: string) {
  const manifestPath = resolve(process.cwd(), 'fixtures/themes', id, 'theme.json');
  return ThemeManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
}

function resolvedFixtureTheme(id: string, version: number): ResolvedTheme {
  const manifest = readThemeFixture(id);
  const assets: Partial<Record<ThemeAssetSlot, string>> = {};
  for (const [slot, path] of Object.entries(manifest.assets)) {
    if (path) assets[slot as ThemeAssetSlot] = `/themes/${encodeURIComponent(id)}/${path.split('/').map(encodeURIComponent).join('/')}?v=${version}`;
  }
  return {
    id: manifest.id,
    name: manifest.name,
    version,
    tokens: manifest.tokens,
    fonts: manifest.fonts.map((font) => ({
      family: font.family,
      weight: font.weight,
      style: font.style,
      url: `/themes/${encodeURIComponent(id)}/${font.file.split('/').map(encodeURIComponent).join('/')}?v=${version}`,
    })),
    assets,
    texts: { ...THEME_DEFAULT_TEXTS, ...(manifest.texts ?? {}) },
    achievements: manifest.achievements as ResolvedTheme['achievements'],
  };
}

test('theme mặc định giữ phong cách CSS fallback trên sáu cảnh', async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.clock.install({ time: new Date('2026-11-17T12:00:00.000Z') });
  await page.addInitScript(() => {
    let state = 0x0279;
    Math.random = () => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state / 0x1_0000_0000;
    };
  });
  const fallbackTheme: ResolvedTheme = { id: 'default', name: 'Giao diện mặc định', version: 1, tokens: {}, fonts: [], assets: {} };
  const defaultTheme: ResolvedTheme = { ...fallbackTheme, version: 2, tokens: { ...THEME_DEFAULT_TOKENS } };
  let activeTheme = fallbackTheme;
  await page.route('**/api/theme', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(activeTheme) }));

  const scenesToCompare = [
    { mock: 'lobby', scene: 'LOBBY', state: 'LOBBY' },
    { mock: 'reading', scene: 'QUESTION', state: 'READING' },
    { mock: 'question', scene: 'QUESTION', state: 'ACCEPTING' },
    { mock: 'reveal', scene: 'REVEAL', state: 'LEADERBOARD' },
    { mock: 'top10', scene: 'INTERIM_TOP10', state: 'LEADERBOARD' },
    { mock: 'victory', scene: 'VICTORY', state: 'VICTORY' },
  ];

  for (const entry of scenesToCompare) {
    activeTheme = fallbackTheme;
    await openScene(page, entry.mock, entry.scene);
    await expect(page.locator('html')).toHaveAttribute('data-theme-version', '1');
    const fallbackStage = page.locator(`[data-testid="stage"][data-state="${entry.state}"]`);
    await expect(fallbackStage).toBeVisible();
    await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    const screenshotOptions = { animations: 'disabled' as const, mask: [page.locator('[data-testid="timer"]')], maskColor: '#ff00ff' };
    const fallbackStyles = await captureThemeFrameStyles(fallbackStage);
    await page.screenshot({ ...screenshotOptions, path: join(screenshotDirectory, `theme-baseline-${entry.mock}.png`) });

    activeTheme = defaultTheme;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme-version', '2');
    const defaultStage = page.locator(`[data-testid="stage"][data-state="${entry.state}"]`);
    await expect(defaultStage).toBeVisible();
    await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    const defaultStyles = await captureThemeFrameStyles(defaultStage);
    expect(defaultStyles, `${entry.mock}: default tokens must preserve the fallback frame styles`).toEqual(fallbackStyles);
    await page.screenshot({ ...screenshotOptions, path: join(screenshotDirectory, `theme-default-${entry.mock}.png`) });
  }
});

test('C-0386: đổi theme trên overlay program và preview không tải lại trang, giữ nguyên bbox', async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.clock.install({ time: new Date('2026-11-17T12:00:00.000Z') });
  await page.addInitScript(() => {
    let state = 0x0279;
    Math.random = () => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state / 0x1_0000_0000;
    };
  });
  const defaultTheme = resolvedFixtureTheme('default', 1);
  const sampleTheme = resolvedFixtureTheme('mau-kiem-tra', 2);
  let activeTheme = defaultTheme;
  let activeHud: HudConfig = structuredClone(DEFAULT_HUD_CONFIG);
  let failBrandLogos = false;
  const defaultAsset = '<svg xmlns="http://www.w3.org/2000/svg" width="440" height="350"><rect width="440" height="350" fill="#2D387F"/><circle cx="220" cy="170" r="120" fill="#FFCC58"/></svg>';
  const sampleAsset = '<svg xmlns="http://www.w3.org/2000/svg" width="440" height="350"><rect width="440" height="350" fill="#32104D"/><path d="M40 300 220 30 400 300Z" fill="#53D8C7"/></svg>';
  await page.route('**/api/theme', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(activeTheme) }));
  await page.route('**/api/hud', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(activeHud) }));
  await page.route('**/themes/**', (route) => {
    const url = route.request().url();
    if (failBrandLogos && /\/brand\/logo\.(?:svg|png)(?:\?|$)/u.test(url)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: url.includes('/mau-kiem-tra/') ? sampleAsset : defaultAsset,
    });
  });
  await page.route('**/assets/brand/logo.png', (route) => failBrandLogos
    ? route.fulfill({ status: 404, body: '' })
    : route.continue());
  mkdirSync(c0386ReviewDirectory, { recursive: true });

  const scenesToCompare = [
    { mock: 'lobby', scene: 'LOBBY', state: 'LOBBY', name: 'lobby' },
    { mock: 'question', scene: 'QUESTION', state: 'ACCEPTING', name: 'question' },
    { mock: 'top3-throne-empty-short-reveal', scene: 'REVEAL', state: 'REVEAL', name: 'reveal' },
    { mock: 'top10', scene: 'INTERIM_TOP10', state: 'LEADERBOARD', name: 'leaderboard' },
    { mock: 'victory', scene: 'VICTORY', state: 'VICTORY', name: 'victory' },
  ];

  for (const role of ['preview', 'program'] as const) {
    for (const entry of scenesToCompare) {
      activeTheme = resolvedFixtureTheme('default', 1);
      activeHud = structuredClone(DEFAULT_HUD_CONFIG);
      const { stage } = await openScene(page, entry.mock, entry.scene, role);
      await expect(page.locator('html')).toHaveAttribute('data-theme-version', '1');
      const logo = entry.name === 'victory' ? page.locator('.v3v-event-logo') : page.locator('.v3-brand-logo').first();
      await expect(logo).toBeVisible();
      await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
      const defaultBoxes = await captureThemeFrameBoxes(stage);
      expect(defaultBoxes.length, `${entry.name} must include measurable fixed frames`).toBeGreaterThan(0);
      let navigations = 0;
      const countNavigation = (frame: import('@playwright/test').Frame) => { if (frame === page.mainFrame()) navigations += 1; };
      page.on('framenavigated', countNavigation);
      const navigationCountBeforeSwitch = navigations;
      if (role === 'preview') {
        await page.screenshot({ path: join(c0386ReviewDirectory, `default-before-${entry.name}.png`), animations: 'disabled' });
      }

      activeTheme = sampleTheme;
      activeHud = {
        ...DEFAULT_HUD_CONFIG,
        texts: { ...DEFAULT_HUD_CONFIG.texts, ...(sampleTheme.texts ?? {}) },
        version: 2,
      };
      await page.clock.fastForward(2_500);
      await expect(page.locator('html')).toHaveAttribute('data-theme-version', '2');
      if (entry.name === 'victory') {
        await expect(logo).toHaveAttribute('alt', `${sampleTheme.texts!.legacyBrandTitle} — ${sampleTheme.texts!.brandTagline}`);
      } else {
        await expect.poll(() => page.locator('.v3-title').first().getAttribute('aria-label'))
          .toBe(`${sampleTheme.texts?.kicker} · ${sampleTheme.texts?.arenaTitle}`);
        await expect(page.locator('.v3-title-ribbon').first()).toContainText(sampleTheme.texts!.arenaTitle);
        await expect(logo).toHaveAttribute('alt', `${sampleTheme.texts!.legacyBrandTitle} — ${sampleTheme.texts!.brandTagline}`);
      }
      await expect(logo).toHaveAttribute('src', /\/themes\/mau-kiem-tra\/assets\/brand\/logo\.svg\?v=2/u);
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--theme-gold').trim()))
        .toBe(sampleTheme.tokens.gold);
      if (entry.name === 'victory') await expect(page.locator('.v3v-hud-title')).toHaveText(sampleTheme.texts!.victoryTitle);
      if (entry.name === 'reveal') await expect(page.getByTestId('question-top3')).toContainText('TỐC ĐỘ SẮC MÀU');
      await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
      expect(await captureThemeFrameBoxes(stage), `${entry.name}/${role}: theme must not move or resize a frame`).toEqual(defaultBoxes);
      if (role === 'preview') await page.screenshot({ path: join(c0386ReviewDirectory, `mau-kiem-tra-${entry.name}.png`), animations: 'disabled' });

      activeTheme = resolvedFixtureTheme('default', 3);
      activeHud = structuredClone(DEFAULT_HUD_CONFIG);
      await page.clock.fastForward(2_500);
      await expect(page.locator('html')).toHaveAttribute('data-theme-version', '3');
      if (entry.name !== 'victory') await expect.poll(() => page.locator('.v3-title').first().getAttribute('aria-label'))
        .toBe(`${THEME_DEFAULT_TEXTS.kicker} · ${THEME_DEFAULT_TEXTS.arenaTitle}`);
      await expect(logo).toHaveAttribute('src', /\/themes\/default\/assets\/brand\/logo\.png\?v=3/u);
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--theme-gold').trim()))
        .toBe('');
      if (entry.name === 'victory') await expect(page.locator('.v3v-hud-title')).toHaveCount(0);
      if (entry.name === 'reveal') await expect(page.getByTestId('question-top3')).toContainText('TOP 3 NHANH NHẤT');
      await expect(page.locator('html')).toHaveAttribute('data-theme-version', '3');
      expect(navigations).toBe(navigationCountBeforeSwitch);
      expect(await captureThemeFrameBoxes(stage), `${entry.name}/${role}: restored default must keep fixed frame bounds`).toEqual(defaultBoxes);
      if (role === 'preview') await page.screenshot({ path: join(c0386ReviewDirectory, `default-after-${entry.name}.png`), animations: 'disabled' });
      page.off('framenavigated', countNavigation);
    }
  }

  failBrandLogos = true;
  activeTheme = sampleTheme;
  activeHud = {
    ...DEFAULT_HUD_CONFIG,
    texts: { ...DEFAULT_HUD_CONFIG.texts, ...(sampleTheme.texts ?? {}) },
    version: 2,
  };
  expect(sampleTheme.texts!.brandTitleLine1.trim().split(/\s+/u)).toHaveLength(1);
  expect([...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(sampleTheme.texts!.brandTitleLine2)]).toHaveLength(24);
  expect([...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(sampleTheme.texts!.brandTagline)]).toHaveLength(40);
  const assertBrandTextFits = async (stage: Locator) => {
    const brandTitle = stage.locator('.v3-title-main span');
    const brandLine1 = brandTitle.nth(0);
    const brandLine2 = brandTitle.nth(1);
    const brandTagline = stage.locator('.v3-title-tagline');
    await expect(brandLine1).toHaveText(sampleTheme.texts!.brandTitleLine1);
    await expect(brandLine2).toHaveText(sampleTheme.texts!.brandTitleLine2);
    await expect(brandTagline).toHaveText(sampleTheme.texts!.brandTagline);
    const frameWidth = await stage.locator('.v3-logo-frame').evaluate((frame) => frame.clientWidth);
    for (const [textLocator, minFontSize, maxFontSize] of [
      [brandLine1, 8, 61],
      [brandLine2, 8, 61],
      [brandTagline, 5, 11],
    ] as const) {
      const layout = await textLocator.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        maxWidth: getComputedStyle(element).maxWidth,
        whiteSpace: getComputedStyle(element).whiteSpace,
      }));
      expect(layout.maxWidth).toBe(`${frameWidth}px`);
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
      expect(layout.whiteSpace).toBe('nowrap');
      expect(layout.fontSize).toBeGreaterThanOrEqual(minFontSize);
      expect(layout.fontSize).toBeLessThanOrEqual(maxFontSize);
    }
  };
  const { stage: longTextLobby } = await openScene(page, 'lobby', 'LOBBY', 'preview');
  await assertBrandTextFits(longTextLobby);
  await page.screenshot({ path: join(c0386ReviewDirectory, 'mau-kiem-tra-long-text.png'), animations: 'disabled' });
  const { stage: longTextQuestion } = await openScene(page, 'question', 'QUESTION', 'preview');
  await assertBrandTextFits(longTextQuestion);
  await page.screenshot({ path: join(c0386ReviewDirectory, 'mau-kiem-tra-long-text-question.png'), animations: 'disabled' });
});

test('C-0287: copy sảnh đủ lớn, không tràn khung ở các trạng thái ghế', async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  let frameGeometry: { board: number[]; question: number[] } | undefined;
  for (const preview of [
    { scene: 'lobby-0', count: '0/35', status: 'reminder', screenshot: 'c0287-lobby-0.png' },
    { scene: 'lobby-12', count: '12/35', status: 'reminder', screenshot: 'c0287-lobby-12.png' },
    { scene: 'lobby-35', count: '35/35', status: 'full', screenshot: 'c0287-lobby-35-full.png' },
    { scene: 'lobby-35-countdown', count: '35/35', status: '10', screenshot: 'c0287-lobby-35-countdown-10.png' },
    { scene: 'lobby-35-countdown-3', count: '35/35', status: '3', screenshot: 'c0287-lobby-35-countdown-3.png' },
  ]) {
    const { stage } = await openScene(page, preview.scene, 'LOBBY');
    const question = stage.getByTestId('question-prompt');
    await expect(question).toContainText('SẮP BẮT ĐẦU');
    await expect(stage.getByTestId('lobby-seat-count')).toHaveText(preview.count);
    await expect(stage.getByText('GHẾ ĐÃ CÓ CHỦ', { exact: true })).toBeVisible();
    if (preview.status === 'reminder') {
      await expect(stage.getByTestId('lobby-reminder')).toHaveText('Comment FREE FIRE để giành ghế!');
      await expect(stage.getByTestId('lobby-countdown')).toHaveCount(0);
    } else if (preview.status === 'full') {
      await expect(stage.getByTestId('lobby-full')).toHaveText('ĐÃ ĐỦ GHẾ!');
      await expect(stage.getByTestId('lobby-countdown')).toHaveCount(0);
    } else {
      await expect(stage.getByTestId('lobby-countdown-label')).toHaveText('VÀO TRẬN SAU');
      await expect(stage.getByTestId('lobby-countdown')).toHaveText(preview.status);
    }

    const layout = await stage.evaluate((root) => {
      const read = (element: Element | null) => {
        if (!(element instanceof HTMLElement)) throw new Error('Missing lobby layout element');
        return { offset: [element.offsetLeft, element.offsetTop, element.offsetWidth, element.offsetHeight], scroll: [element.scrollWidth, element.scrollHeight, element.clientWidth, element.clientHeight], fits: element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight };
      };
      const fontSize = (selector: string) => {
        const element = root.querySelector(selector);
        if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
        return Number.parseFloat(getComputedStyle(element).fontSize);
      };
      const copy = root.querySelector('.v3-lobby-copy');
      const seatSummary = root.querySelector('.v3-lobby-seat-summary');
      const status = root.querySelector('[data-testid="lobby-status"]');
      const question = root.querySelector('[data-testid="question-prompt"]');
      const board = root.querySelector('.v3-board');
      if (!(copy instanceof HTMLElement) || !(seatSummary instanceof HTMLElement) || !(status instanceof HTMLElement) || !(question instanceof HTMLElement) || !(board instanceof HTMLElement)) throw new Error('Missing lobby copy, seat summary, question, board or status');
      const boardRect = board.getBoundingClientRect();
      const statusRect = status.getBoundingClientRect();
      const boardBorderBottom = Number.parseFloat(getComputedStyle(board).borderBottomWidth);
      const statusChildrenWithinStatus = Array.from(status.children).every((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top >= statusRect.top && rect.bottom <= statusRect.bottom;
      });
      const seatLabel = root.querySelector('.v3-lobby-seat-label');
      const reminder = root.querySelector('.v3-lobby-reminder');
      const full = root.querySelector('.v3-lobby-full');
      const countdown = root.querySelector('.v3-lobby-countdown');
      return {
        board: read(board),
        boardWithinViewport: boardRect.left >= 0 && boardRect.top >= 0 && boardRect.right <= innerWidth && boardRect.bottom <= innerHeight,
        statusWithinBoard: statusRect.top >= boardRect.top && statusRect.bottom <= boardRect.bottom - boardBorderBottom + 1,
        statusChildrenWithinStatus,
        question: read(root.querySelector('[data-testid="question-prompt"]')),
        status: read(status),
        statusChildren: Array.from(status.children).map((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { tag: element.tagName, rect: [rect.top, rect.bottom, rect.height], lineHeight: style.lineHeight, margin: [style.marginTop, style.marginBottom], shadow: style.textShadow };
        }),
        questionStatusGap: status.offsetTop - question.offsetTop - question.offsetHeight,
        titleFont: fontSize('.v3-lobby-copy > strong'),
        seatFont: fontSize('.v3-lobby-seat-count'),
        labelFont: seatLabel ? Number.parseFloat(getComputedStyle(seatLabel).fontSize) : 0,
        statusFont: reminder || full || countdown ? Number.parseFloat(getComputedStyle(reminder ?? full ?? countdown!).fontSize) : 0,
        countdownLabelFont: (() => {
          const label = root.querySelector('.v3-lobby-countdown-label');
          return label instanceof HTMLElement ? Number.parseFloat(getComputedStyle(label).fontSize) : 0;
        })(),
        copyGap: Number.parseFloat(getComputedStyle(copy).rowGap),
        seatSummaryGap: Number.parseFloat(getComputedStyle(seatSummary).rowGap),
        statusGap: Number.parseFloat(getComputedStyle(status).gap),
      };
    });
    expect(layout.board.offset).toEqual([416, 345, 567, 470]);
    expect(layout.question.offset).toEqual([18, 145, 527, 160]);
    expect(layout.boardWithinViewport && layout.statusWithinBoard && layout.statusChildrenWithinStatus && layout.question.fits, JSON.stringify(layout)).toBe(true);
    expect(layout.questionStatusGap).toBeGreaterThanOrEqual(12);
    expect(layout.titleFont).toBeGreaterThanOrEqual(24);
    expect(layout.seatFont).toBeGreaterThanOrEqual(64);
    expect(layout.labelFont).toBeGreaterThanOrEqual(22);
    expect(layout.copyGap).toBeGreaterThanOrEqual(12);
    expect(layout.seatSummaryGap).toBeGreaterThanOrEqual(12);
    expect(layout.statusGap).toBeGreaterThanOrEqual(12);
    if (preview.status === 'reminder') expect(layout.statusFont).toBeGreaterThanOrEqual(28);
    if (preview.status === 'full') expect(layout.statusFont).toBeGreaterThanOrEqual(32);
    if (preview.status === '10' || preview.status === '3') {
      expect(layout.countdownLabelFont).toBeGreaterThanOrEqual(22);
      expect(layout.statusFont).toBeGreaterThanOrEqual(96);
    }
    const geometry = { board: layout.board.offset, question: layout.question.offset };
    if (frameGeometry) expect(geometry).toEqual(frameGeometry);
    else frameGeometry = geometry;
    await page.screenshot({ path: join(screenshotDirectory, preview.screenshot), animations: 'disabled' });
  }
});

test('overlay tải theme khi mở, cập nhật theo version và gỡ token cũ', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-17T12:00:00.000Z') });
  let activeTheme: ResolvedTheme = { id: 'event', name: 'Sự kiện', version: 1, tokens: { deep: '#123456' }, fonts: [], assets: {} };
  await page.route('**/api/theme', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(activeTheme) }));
  await page.goto('/?mock=lobby', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-theme-version', '1');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--theme-deep').trim())).toBe('#123456');

  activeTheme = { ...activeTheme, version: 2, tokens: { deep: '#abcdef' } };
  await page.clock.runFor(2_600);
  await expect(page.locator('html')).toHaveAttribute('data-theme-version', '2');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--theme-deep').trim())).toBe('#abcdef');

  activeTheme = { ...activeTheme, version: 3, tokens: {} };
  await page.clock.runFor(2_600);
  await expect(page.locator('html')).toHaveAttribute('data-theme-version', '3');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--theme-deep').trim())).toBe('');
});

async function openLobbyWithTenLeaderboardEntries(page: Page) {
  const base = makeMockSnapshot('question');
  if (!base) throw new Error('Missing question mock for lobby leaderboard check.');
  const snapshot = { ...base, scene: 'LOBBY' as const, state: 'LOBBY' as const, question: null, answerCount: 0 };
  const errors = watchPageErrors(page);
  await page.routeWebSocket('/ws', (socket) => {
    socket.onMessage((message) => {
      const incoming = JSON.parse(String(message)) as { type?: string };
      if (incoming.type !== 'HELLO') return;
      socket.send(JSON.stringify({
        v: 1,
        type: 'STATE_SNAPSHOT',
        seq: 1,
        sessionId: snapshot.sessionId,
        stateVersion: snapshot.stateVersion,
        serverTimeMs: Date.now(),
        payload: snapshot,
      }));
    });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const stage = page.locator('[data-testid="stage"][data-scene="LOBBY"]');
  await expect(stage).toBeVisible();
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  return { stage, errors };
}

async function expectInsideSafeZone(page: Page, stage: ReturnType<Page['locator']>, sceneName: string) {
  const viewport = page.viewportSize();
  expect(viewport, `${sceneName}: viewport has a measurable size`).not.toBeNull();
  const stageBox = await stage.boundingBox();
  expect(stageBox, `${sceneName}: stage has a bounding box`).not.toBeNull();
  if (!stageBox) return;

  const safe = await stage.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      top: Number.parseFloat(style.getPropertyValue('--safe-top')),
      right: Number.parseFloat(style.getPropertyValue('--safe-right')),
      bottom: Number.parseFloat(style.getPropertyValue('--safe-bottom')),
      left: Number.parseFloat(style.getPropertyValue('--safe-left')),
      rightFromY: Number.parseFloat(style.getPropertyValue('--safe-right-from-y')) || 0,
    };
  });
  const scaleX = stageBox.width / 1080;
  const scaleY = stageBox.height / 1920;
  const edges = {
    left: stageBox.x + safe.left * scaleX,
    right: stageBox.x + (1080 - safe.right) * scaleX,
    top: stageBox.y + safe.top * scaleY,
    bottom: stageBox.y + (1920 - safe.bottom) * scaleY,
  };

  const selectors = [
    '[data-testid="question-prompt"]',
    '[data-testid^="option-"]',
    '[data-testid="timer"]',
    '[data-testid="leaderboard-row"]',
  ];
  if (sceneName !== 'victory' && sceneName !== 'victory-tie') selectors.push('[data-testid^="podium-slot-"] .nameplate');
  for (const selector of selectors) {
    const locators = page.locator(selector);
    for (let index = 0; index < await locators.count(); index += 1) {
      const box = await locators.nth(index).boundingBox();
      if (!box) continue;
      // Dải cấm phải chỉ áp dụng cho phần tử chạm tới vùng y ≥ rightFromY (thanh nút TikTok ở nửa dưới).
      const reachesRightBand = box.y + box.height > stageBox.y + safe.rightFromY * scaleY;
      const margins = [
        box.x - edges.left,
        reachesRightBand ? edges.right - (box.x + box.width) : stageBox.x + stageBox.width - (box.x + box.width),
        box.y - edges.top,
        edges.bottom - (box.y + box.height),
      ];
      const top10RowsMayExtendTo73Percent = sceneName.toLowerCase().startsWith('top10') && selector === '[data-testid="leaderboard-row"]';
      const bottomLimit = top10RowsMayExtendTo73Percent ? stageBox.y + stageBox.height * 0.73 : edges.bottom;
      const safeMargins = [...margins.slice(0, 3), bottomLimit - (box.y + box.height)];
      const margin = Math.min(...safeMargins);
      if (margin < closestSafeMargin) {
        closestSafeMargin = margin;
        closestSafeScene = sceneName;
      }
      expect(margin, `${sceneName} ${selector} is within the safe zone`).toBeGreaterThanOrEqual(-1);
    }
  }
}

for (const { name, scene } of scenes) {
  test(`mock scene: ${name}`, async ({ page }) => {
    if (name === 'question') await page.setViewportSize({ width: 921, height: 2000 });
    if (name === 'victory' || name === 'victory-tie') await page.setViewportSize({ width: 1080, height: 1920 });
    const { stage, errors } = await openScene(page, name, scene);
    if (name === 'victory' || name === 'victory-tie' || name === 'round-winner') {
      await expect(stage.getByTestId('victory-background')).toBeVisible();
      if (hasLocalEventLogo) await expect(stage.getByTestId('v3v-event-logo')).toBeVisible();
      else await expect(stage.locator('.v3v-logo-fallback .v3-title')).toBeVisible();
      await expect(stage.locator('.v3v-trophy, .v3v-trophy-glow, .v3v-side-lightning')).toHaveCount(0);
    } else {
      await expect(stage.locator('.v3-title-ribbon')).toHaveText('ĐẤU TRƯỜNG BÃO TỐ');
    }
    await expectInsideSafeZone(page, stage, name);
    if (name === 'victory' || name === 'victory-tie' || name === 'round-winner') {
      await page.waitForTimeout(8_100);
    }
    if (name === 'question') console.log(`Ảnh nghiệm thu: ${join(screenshotDirectory, 'question.png')}`);
    await page.screenshot({ path: join(screenshotDirectory, `${name}.png`), animations: 'disabled' });
    // So ảnh chuẩn chỉ khi bật E2E_SCREENSHOTS=1 (bố cục V3 còn đổi, chưa commit ảnh chuẩn — BOARD #15)
    if (process.env.E2E_SCREENSHOTS === '1') await expect(page).toHaveScreenshot(`${name}.png`, { maxDiffPixelRatio: 0.01 });
    expect(errors, `${name}: no console or page errors`).toEqual([]);
  });
}

test('preview fits the full 9:16 stage in landscape and portrait, while program stays transparent', async ({ page }) => {
  await page.goto('/?mock=question', { waitUntil: 'domcontentloaded' });
  const viewport = page.locator('.viewport');
  const stage = page.getByTestId('stage');
  await expect(stage).toBeVisible();

  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await expect.poll(async () => {
      const box = await stage.boundingBox();
      return box && box.width <= size.width + 0.5 && box.height <= size.height + 0.5 &&
        box.x >= -0.5 && box.y >= -0.5 && box.x + box.width <= size.width + 0.5 &&
        box.y + box.height <= size.height + 0.5;
    }).toBe(true);
    await expect(viewport).toHaveAttribute('data-fit', 'contain');
    await expect(viewport).toHaveAttribute('data-role', 'preview');
    await expect(viewport).toHaveCSS('background-color', 'rgb(8, 13, 43)');
  }

  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto('/?mock=question&role=program', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('stage')).toBeVisible();
  await expect(viewport).toHaveAttribute('data-fit', 'contain');
  await expect(viewport).toHaveAttribute('data-role', 'program');
  await expect(viewport).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const programBox = await page.getByTestId('stage').boundingBox();
  expect(programBox).toMatchObject({ x: 0, y: 0, width: 1080, height: 1920 });
});

test('prepare, reading and question do not expose the correct answer', async ({ page }) => {
  for (const name of ['prepare', 'reading', 'question']) {
    const { errors } = await openScene(page, name, 'QUESTION');
    const html = await page.locator('body').innerHTML();
    expect(html).not.toContain('correctOptionId');
    expect(await page.locator('[data-testid^="option-"][class*="correct"], [data-testid^="option-"][data-correct]').count()).toBe(0);
    expect(errors, `${name}: no console or page errors`).toEqual([]);
  }
});

test('READING shows the question and four answers without starting the answer countdown', async ({ page }) => {
  const { stage, errors } = await openScene(page, 'reading', 'QUESTION');
  await expect(stage.getByTestId('question-prompt')).toBeVisible();
  await expect(stage.locator('[data-testid^="option-"]:not([data-testid="option-list"])')).toHaveCount(4);
  await expect(stage.getByTestId('reading-status')).toHaveText('MC ĐANG ĐỌC');
  await expect(stage.getByTestId('timer')).toHaveCount(0);
  await expect(stage.getByTestId('answer-count')).toHaveCount(0);
  const askAnimation = await stage.locator('.v3-mc-figure').evaluate((element) => getComputedStyle(element).animationName);
  expect(askAnimation).toBe('v3-mc-ask');
  expect(errors).toEqual([]);
});

test('C-0279 keeps the approved fixed question frame and readable answer grid for short, longest and clamped text', async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  const reviewDirectory = join(process.cwd(), 'test-results', 'c0279');
  mkdirSync(reviewDirectory, { recursive: true });
  const phases = [
    { name: 'question', scene: 'QUESTION', phase: 'short-answer', long: false, reveal: false },
    { name: 'question-longest', scene: 'QUESTION', phase: 'longest-prompt', long: false, reveal: false },
    { name: 'question-grid-balance', scene: 'QUESTION', phase: 'grid-balance', long: true, reveal: false },
    { name: 'question-clamp-text', scene: 'QUESTION', phase: 'clamp-text', long: true, reveal: false },
    { name: 'reveal', scene: 'REVEAL', phase: 'short-reveal', long: false, reveal: true },
    { name: 'reveal-grid-balance', scene: 'REVEAL', phase: 'grid-balance-reveal', long: true, reveal: true },
    { name: 'reveal-clamp-text', scene: 'REVEAL', phase: 'clamp-reveal', long: true, reveal: true },
  ] as const;

  for (const entry of phases) {
    const { stage } = await openScene(page, entry.name, entry.scene);
    expect(stage).not.toHaveClass(/has-long-labels/);
    const [boardBox, promptBox, top10Box] = await Promise.all([
      stage.locator('.v3-board').boundingBox(), stage.locator('.v3-question').boundingBox(), stage.locator('.v3-top10').boundingBox(),
    ]);
    expect(boardBox).toMatchObject({ x: 410, y: 348, width: 600, height: 465 });
    expect(promptBox).toMatchObject({ x: 428, y: 502, width: 564, height: 124 });
    expect(top10Box).toMatchObject({ x: 70, y: 348, width: 317, height: 462 });
    expect(top10Box!.x).toBeGreaterThanOrEqual(0);
    expect(boardBox!.x - (top10Box!.x + top10Box!.width)).toBeGreaterThanOrEqual(12);
    expect(promptBox!.y + promptBox!.height + 12).toBeLessThanOrEqual(boardBox!.y + 2 + 292);
    expect(Number.parseFloat(await stage.locator('.v3-question').evaluate((element) => getComputedStyle(element).fontSize)), `${entry.phase}: question text never renders below 24px`).toBeGreaterThanOrEqual(24);

    const timer = stage.getByTestId('timer');
    if (entry.name === 'question' || entry.name === 'reveal') {
      await expect(timer).toHaveCSS('width', '124px');
      await expect(timer).toHaveCSS('height', '124px');
    }
    expect(await stage.locator('.v3-question').evaluate((element) => {
      const node = element as HTMLElement;
      const truncated = node.dataset.promptTruncated === 'true';
      const copy = node.querySelector<HTMLElement>('[data-testid="question-prompt-copy"]');
      return node.scrollHeight <= node.clientHeight || (truncated && copy?.textContent?.endsWith('…') === true && Number.parseFloat(getComputedStyle(node).fontSize) >= 24);
    }), `${entry.phase}: prompt stays inside the fixed card`).toBe(true);

    const cards = stage.locator('.v3-option');
    const boxes = await cards.evaluateAll((elements) => elements.map((element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    }));
    expect(boxes).toHaveLength(4);
    for (const box of boxes.slice(1)) {
      expect(Math.abs(box.width - boxes[0]!.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(box.height - boxes[0]!.height)).toBeLessThanOrEqual(1);
    }
    expect(boxes[0]!.height).toBe(72);
    expect(boxes[1]!.x - (boxes[0]!.x + boxes[0]!.width)).toBeGreaterThanOrEqual(12);
    expect(boxes[2]!.y - (boxes[0]!.y + boxes[0]!.height)).toBeGreaterThanOrEqual(12);

    for (const id of ['A', 'B', 'C', 'D'] as const) {
      const card = stage.getByTestId(`option-${id}`);
      const answer = card.locator('.v3-option-text');
      const label = card.locator('.v3-letter');
      if (entry.long) {
        expect(Number.parseFloat(await answer.evaluate((element) => getComputedStyle(element).fontSize))).toBe(entry.reveal ? 15 : 17);
      } else {
        await expect(answer).toBeVisible();
      }
      await expect(label).toHaveText(id);
      expect(Number.parseFloat(await label.evaluate((element) => getComputedStyle(element).fontSize))).toBe(22);
      const [labelBox, answerBox] = await Promise.all([label.boundingBox(), answer.boundingBox()]);
      expect(labelBox).not.toBeNull();
      expect(answerBox).not.toBeNull();
      expect(labelBox!.x + labelBox!.width).toBeLessThanOrEqual(answerBox!.x + 1);
      const metrics = await answer.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const lineTops = [...new Set(Array.from(range.getClientRects()).filter((rect) => rect.width && rect.height).map((rect) => Math.round(rect.top)))];
        const cellBox = element.closest('.v3-option')!.getBoundingClientRect();
        const textRects = Array.from(range.getClientRects()).filter((rect) => rect.width && rect.height);
        return {
          widthFits: textRects.every((rect) => rect.left >= cellBox.left + 2 && rect.right <= cellBox.right - 2),
          heightFits: textRects.every((rect) => rect.top >= cellBox.top + 2 && rect.bottom <= cellBox.bottom - 2),
          lines: lineTops.length,
          clientWidth: element.clientWidth,
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
          fontSize: getComputedStyle(element).fontSize,
        };
      });
      expect(metrics.widthFits, `${entry.phase}/${id}: full answer fits its width (${JSON.stringify(metrics)})`).toBe(true);
      expect(metrics.heightFits, `${entry.phase}/${id}: answer fits its height (${JSON.stringify(metrics)})`).toBe(true);
      expect(metrics.lines, `${entry.phase}/${id}: answer respects its line limit (${JSON.stringify(metrics)})`).toBeLessThanOrEqual(entry.reveal && entry.long ? 3 : 2);
      if (entry.reveal) {
        const [countBox, meterBox] = await Promise.all([card.locator('.v3-option-count').boundingBox(), card.locator('.v3-option-meter').boundingBox()]);
        expect(countBox).not.toBeNull();
        expect(meterBox).not.toBeNull();
        expect(countBox!.x).toBeGreaterThan(answerBox!.x + answerBox!.width);
        expect(meterBox!.x).toBeGreaterThanOrEqual(countBox!.x);
        expect(meterBox!.x + meterBox!.width).toBeLessThanOrEqual(countBox!.x + countBox!.width);
      }
    }
    await page.screenshot({ path: join(reviewDirectory, `${entry.phase}.png`), animations: 'disabled' });
  }
});

test('C-0279 captures all 12 approved overlay scenes at 1080×1920', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1080, height: 1920 });
  const reviewDirectory = join(process.cwd(), 'test-results', 'c0279', 'scenes');
  mkdirSync(reviewDirectory, { recursive: true });
  const scenes = [
    { mock: 'lobby', scene: 'LOBBY', file: '01-lobby.png' },
    { mock: 'prepare', scene: 'QUESTION', file: '02-prepare.png' },
    { mock: 'reading', scene: 'QUESTION', file: '03-reading.png' },
    { mock: 'question', scene: 'QUESTION', file: '04-question.png' },
    { mock: 'reveal', scene: 'REVEAL', file: '05-reveal.png' },
    { mock: 'fastest-a', scene: 'REVEAL', file: '06-fastest-a.png' },
    { mock: 'top10', scene: 'INTERIM_TOP10', file: '07-top10.png' },
    { mock: 'round-winner', scene: 'ROUND_WINNER', file: '08-round-winner.png' },
    { mock: 'victory', scene: 'VICTORY', file: '09-victory.png' },
    { mock: 'intermission', scene: 'INTERMISSION', file: '10-intermission.png' },
    { mock: 'paused', scene: 'QUESTION', file: '11-paused.png' },
    { mock: 'connection-lost', scene: 'CONNECTION_LOST', file: '12-connection-lost.png' },
  ] as const;
  for (const entry of scenes) {
    const { stage, errors } = await openScene(page, entry.mock, entry.scene);
    expect(errors, `${entry.file}: browser console stays clean`).toEqual([]);
    await page.screenshot({ path: join(reviewDirectory, entry.file), animations: 'disabled' });
  }
});

test('C-0278 renders two- and four-digit scores without padding on Top 10, interim, Victory and fastest-correct surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  const reviewDirectory = join(process.cwd(), 'test-results', 'c0278');
  mkdirSync(reviewDirectory, { recursive: true });

  const compact = await openScene(page, 'fastest-score-width', 'REVEAL');
  await expect(compact.stage.getByTestId('fastest-callout')).toBeVisible();
  const compactScores = compact.stage.locator('.v3-score');
  await expect(compactScores.nth(0)).toHaveText('75');
  await expect(compactScores.nth(1)).toHaveText('1.250');
  await expect(compact.stage.getByTestId('leaderboard-row').filter({ hasText: 'StormKing' }).locator('.v3-score')).toHaveText('1.250');
  await page.screenshot({ path: join(reviewDirectory, 'fastest-correct.png'), animations: 'disabled' });

  const interim = await openScene(page, 'top10-score-width', 'INTERIM_TOP10');
  const interimScores = interim.stage.locator('.v3-full-score');
  await expect(interimScores.nth(0)).toHaveText('75điểm');
  await expect(interimScores.nth(1)).toHaveText('1.250điểm');
  await page.screenshot({ path: join(reviewDirectory, 'top10-scores-2-and-4-digits.png'), animations: 'disabled' });

  const victory = await openScene(page, 'victory-score-width', 'VICTORY');
  await expect(victory.stage.getByTestId('podium-slot-2')).toHaveAttribute('data-score', '75');
  await expect(victory.stage.getByTestId('podium-slot-2').locator('i')).toContainText('75 PTS');
  await expect(victory.stage.getByTestId('podium-slot-1')).toHaveAttribute('data-score', '1250');
  await expect(victory.stage.getByTestId('podium-slot-1').locator('i')).toContainText('1.250 PTS');
  await page.screenshot({ path: join(reviewDirectory, 'victory-scores-2-and-4-digits.png'), animations: 'disabled' });

  for (const scoreSurface of [compactScores, interimScores, victory.stage.locator('.v3v-slot i')]) {
    for (const score of await scoreSurface.allTextContents()) expect(score).not.toMatch(/(^|\s)0\d/);
  }
  expect(interim.errors).toEqual([]);
  expect(victory.errors).toEqual([]);
});

test('mock-only badge stays hidden unless debug is enabled', async ({ page }) => {
  await openScene(page, 'question', 'QUESTION');
  await expect(page.getByTestId('demo-badge')).toHaveCount(0);
  await page.goto('/?mock=question&debug=1', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-testid="stage"][data-scene="QUESTION"]')).toBeVisible();
  await expect(page.getByTestId('demo-badge')).toBeVisible();
});

test('Storm Arena header matches the ref hierarchy and MC states animate without a bolt icon', async ({ page }) => {
  const { stage, errors } = await openScene(page, 'question', 'QUESTION');
  const logo = stage.getByTestId('brand-logo');
  const logoFrame = stage.getByTestId('brand-logo-frame');
  const eventMark = stage.getByTestId('event-mark');
  const roundCard = stage.getByTestId('round-card');
  const participantCount = roundCard.getByTestId('participant-count');
  const participantLabel = roundCard.locator('.v3-round-label');
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('src', '/assets/brand/logo.png');
  await expect(eventMark).toBeVisible();
  await expect(roundCard).toContainText('VÒNG 1');
  await expect(participantCount).toHaveText('57');
  await expect(participantLabel).toHaveText('ĐANG CHƠI');
  const [logoBox, eventBox, roundBox, boardBox, subtitleBox] = await Promise.all([
    logoFrame.boundingBox(), eventMark.boundingBox(), roundCard.boundingBox(), stage.locator('.v3-board').boundingBox(), stage.locator('.v3-title-ribbon').boundingBox(),
  ]);
  expect(logoBox).not.toBeNull();
  expect(eventBox).not.toBeNull();
  expect(roundBox).not.toBeNull();
  expect(logoBox!.width).toBe(255);
  expect(logoBox!.y + logoBox!.height).toBeLessThan(270);
  expect(eventBox!.x + eventBox!.width).toBeLessThan(logoBox!.x);
  expect(logoBox!.x + logoBox!.width).toBeLessThan(roundBox!.x);
  expect(boardBox).not.toBeNull();
  expect(subtitleBox).not.toBeNull();
  expect(logoBox!.y + logoBox!.height).toBeLessThan(subtitleBox!.y);
  expect(subtitleBox!.y + subtitleBox!.height).toBeLessThanOrEqual(boardBox!.y - 16);
  expect(parseFloat(await stage.locator('.v3-title-ribbon').evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(21);
  expect(parseFloat(await roundCard.locator('.v3-round-title').evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(roundCardMinimums.title);
  expect(parseFloat(await participantCount.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(roundCardMinimums.count);
  expect(parseFloat(await participantLabel.evaluate((element) => getComputedStyle(element).fontSize))).toBeLessThan(parseFloat(await participantCount.evaluate((element) => getComputedStyle(element).fontSize)));
  expect(await roundCard.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(await roundCard.evaluate((element) => element.clientWidth));
  expect(await logo.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const [bubbleBox, firstAudienceLabel] = await Promise.all([
    stage.getByTestId('mc-bubble').boundingBox(), stage.locator('.v3-nametags .v3-seat-name').first().boundingBox(),
  ]);
  expect(bubbleBox).not.toBeNull();
  expect(firstAudienceLabel).not.toBeNull();
  expect(bubbleBox!.y + bubbleBox!.height).toBeLessThanOrEqual(firstAudienceLabel!.y);
  await expect(stage.locator('.v3-bubble .v3-bolt')).toHaveCount(0);
  const idleAnimation = await stage.locator('.v3-mc-figure').evaluate((element) => getComputedStyle(element).animationName);
  expect(idleAnimation).toBe('v3-mc-breathe');

  const { errors: prepareErrors } = await openScene(page, 'prepare', 'QUESTION');
  const askAnimation = await page.locator('.v3-mc-figure').evaluate((element) => getComputedStyle(element).animationName);
  expect(askAnimation).toBe('v3-mc-ask');
  expect(errors).toEqual([]);
  expect(prepareErrors).toEqual([]);
});

test('mock overlay applies HUD text and uploaded images, then reloads config without refresh', async ({ page }) => {
  const backgroundBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, '#090b31');
    gradient.addColorStop(.52, '#26105f');
    gradient.addColorStop(1, '#070d29');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#db52ff';
    ctx.lineWidth = 12;
    ctx.shadowColor = '#a33fff';
    ctx.shadowBlur = 38;
    ctx.strokeRect(46, 52, 988, 1816);
    ctx.strokeStyle = '#57dfff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(56, 680);
    ctx.lineTo(420, 510);
    ctx.lineTo(686, 760);
    ctx.lineTo(1024, 530);
    ctx.stroke();
    return canvas.toDataURL('image/png').split(',')[1]!;
  });
  const logoBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 600, 400);
    gradient.addColorStop(0, '#25105b');
    gradient.addColorStop(.5, '#141b63');
    gradient.addColorStop(1, '#42125e');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(18, 18, 564, 364, 54);
    ctx.fill();
    ctx.strokeStyle = '#f179ff';
    ctx.lineWidth = 12;
    ctx.shadowColor = '#ce47ff';
    ctx.shadowBlur = 24;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '900 112px sans-serif';
    ctx.fillText('NOVA', 300, 174);
    ctx.fillStyle = '#ffd652';
    ctx.font = '800 60px sans-serif';
    ctx.fillText('ARENA', 300, 258);
    return canvas.toDataURL('image/png').split(',')[1]!;
  });
  const background = Buffer.from(backgroundBase64, 'base64');
  const logo = Buffer.from(logoBase64, 'base64');
  const backgroundId = createHash('sha256').update(background).digest('hex') + '.png';
  const logoId = createHash('sha256').update(logo).digest('hex') + '.png';
  const missingLogoId = `${'f'.repeat(64)}.png`;
  const missingBackgroundId = `${'e'.repeat(64)}.png`;
  const reviewDirectory = join(process.cwd(), '.claude', 'review', 'C0193');
  mkdirSync(reviewDirectory, { recursive: true });
  let hudConfig: HudConfig = DEFAULT_HUD_CONFIG;
  await page.route('**/api/hud', (route) => route.fulfill({ json: hudConfig }));
  await page.route('**/hud-assets/**', (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1);
    if (id === missingLogoId || id === missingBackgroundId) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: 'image/png', body: id === logoId ? logo : background });
  });

  await page.goto('/?mock=question', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('event-mark')).toHaveAttribute('aria-label', 'STORM ARENA');
  await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', '/assets/brand/logo.png');
  await expect(page.getByTestId('arena-background')).toHaveAttribute('src', '/assets/arena/bg-question-user.jpg');
  await expect.poll(() => page.getByTestId('brand-logo').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect.poll(() => page.getByTestId('arena-background').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  console.log('C0193 default pill style:', JSON.stringify(await page.locator('.v3-title-ribbon').evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, box: element.getBoundingClientRect().toJSON(), font: getComputedStyle(element).fontSize, padding: getComputedStyle(element).padding, text: element.textContent }))));
  expect(await page.locator('.v3-title-ribbon').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const readLayout = () => page.evaluate(() => {
    const selectors = {
      title: '.v3-header .v3-title.is-wide',
      logoFrame: '[data-testid="brand-logo-frame"]',
      logo: '[data-testid="brand-logo-frame"]',
      event: '.v3-event-mark',
      ribbon: '.v3-title-ribbon',
      roundCard: '[data-testid="round-card"]',
      top10: '[data-testid="v3-top10"]',
      board: '.v3-board',
      question: '.v3-question',
    } as const;
    return Object.fromEntries(Object.entries(selectors).map(([name, selector]) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      if (!rect) throw new Error(`Missing layout element: ${selector}`);
      return [name, { x: rect.x, y: rect.y, width: rect.width, height: rect.height }];
    }));
  });
  const assertHeaderDoesNotOverlap = async () => {
    const overlaps = await page.evaluate(() => {
      const selectors = ['.v3-event-mark', '[data-testid="brand-logo-frame"]', '.v3-title-ribbon', '[data-testid="round-card"]'];
      const rects = selectors.map((selector) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing header element: ${selector}`);
        return { selector, rect: element.getBoundingClientRect() };
      });
      const result: string[] = [];
      for (let left = 0; left < rects.length; left += 1) for (let right = left + 1; right < rects.length; right += 1) {
        const a = rects[left]!;
        const b = rects[right]!;
        const overlapX = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
        const overlapY = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
        if (overlapX > 1 && overlapY > 1) result.push(`${a.selector} intersects ${b.selector}`);
      }
      return result;
    });
    expect(overlaps).toEqual([]);
  };
  const defaultLayout = await readLayout();
  console.log('C0193 HUD default geometry:', JSON.stringify(defaultLayout));
  const c0168Approved = {
    title: { x: 400, y: 30, width: 255, height: 292 },
    logoFrame: { x: 400, y: 30, width: 255, height: 210 },
    logo: { x: 400, y: 30, width: 255, height: 210 },
    event: { x: 82, y: 133, width: 230, height: 92 },
    ribbon: { x: 220, y: 250, width: 635, height: 72 },
    roundCard: { x: 770, y: 133, width: 230, height: 95 },
    top10: { x: 70, y: 348, width: 317, height: 462 },
    board: { x: 410, y: 348, width: 600, height: 465 },
    question: { x: 428, y: 502, width: 564, height: 124 },
  } as const;
  for (const key of Object.keys(c0168Approved) as Array<keyof typeof c0168Approved>) {
    for (const dimension of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(defaultLayout[key]![dimension] - c0168Approved[key][dimension]), `hud default ${key}.${dimension} matches approved C-0168/C-0210 header A`).toBeLessThanOrEqual(1);
    }
  }
  await assertHeaderDoesNotOverlap();
  await page.screenshot({ path: join(reviewDirectory, 'default-question.png'), animations: 'disabled' });

  hudConfig = {
    ...DEFAULT_HUD_CONFIG,
    version: 1,
    texts: {
      ...DEFAULT_HUD_CONFIG.texts,
      kicker: 'NOVA ARENA',
      arenaTitle: 'ĐẤU TRƯỜNG MỚI',
      playingLabel: 'ĐANG XEM',
      roundLabel: 'VÒNG',
      leaderboardTitle: 'TOP CHIẾN BINH',
      victoryTitle: 'NHÀ VÔ ĐỊCH',
    },
    images: { logo: logoId, bgQuestion: backgroundId, bgLobby: backgroundId, bgVictory: null },
  };
  // Preview mocks poll public config; switching this response must update the active frame without navigation.
  await expect(page.getByTestId('event-mark')).toHaveAttribute('aria-label', 'NOVA ARENA', { timeout: 4_000 });
  await expect(page.locator('.v3-title-ribbon')).toHaveText('ĐẤU TRƯỜNG MỚI');
  expect(await page.locator('.v3-title-ribbon').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(page.locator('.v3-round-title')).toHaveText('VÒNG 1');
  await expect(page.getByTestId('participant-count')).toHaveText('57');
  await expect(page.locator('.v3-round-label')).toHaveText('ĐANG XEM');
  await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', `/hud-assets/${logoId}`);
  await expect(page.getByTestId('arena-background')).toHaveAttribute('src', `/hud-assets/${backgroundId}`);
  await expect.poll(() => page.getByTestId('brand-logo').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect.poll(() => page.getByTestId('arena-background').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId('brand-logo')).toHaveCSS('object-fit', 'contain');
  const customLayout = await readLayout();
  console.log('C0193 HUD custom geometry:', JSON.stringify(customLayout));
  for (const key of Object.keys(defaultLayout) as Array<keyof typeof defaultLayout>) {
    for (const dimension of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(customLayout[key]![dimension] - defaultLayout[key]![dimension]), `${key}.${dimension}`).toBeLessThanOrEqual(1);
    }
  }
  await assertHeaderDoesNotOverlap();
  await page.screenshot({ path: join(reviewDirectory, 'custom-question.png'), animations: 'disabled' });
  await expect(page).toHaveURL(/mock=question/);

  await page.goto('/?mock=top10', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.v3-full-heading .eyebrow')).toHaveText('TOP CHIẾN BINH');
  await expect(page.getByTestId('arena-background')).toHaveAttribute('src', `/hud-assets/${backgroundId}`);
  await page.screenshot({ path: join(reviewDirectory, 'custom-top10.png'), animations: 'disabled' });

  await page.goto('/?mock=victory', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('v3v-event-logo')).toHaveAttribute('src', `/hud-assets/${logoId}`);
  await expect(page.getByTestId('victory-background')).toHaveAttribute('src', '/assets/victory/bg-user-cover.jpg');
  await expect(page.locator('.v3v-hud-title')).toHaveText('NHÀ VÔ ĐỊCH');
  await expect(page.getByTestId('victory-background')).toHaveCSS('object-fit', 'cover');
  await expect.poll(() => page.getByTestId('v3v-event-logo').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect.poll(() => page.getByTestId('victory-background').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId('victory-background')).toHaveAttribute('src', '/assets/victory/bg-user-cover.jpg');
  await page.screenshot({ path: join(reviewDirectory, 'custom-victory.png'), animations: 'disabled' });

  hudConfig = { ...hudConfig, version: 3, images: { ...hudConfig.images, bgVictory: backgroundId } };
  await expect(page.getByTestId('victory-background')).toHaveAttribute('src', `/hud-assets/${backgroundId}`);
  await page.screenshot({ path: join(reviewDirectory, 'nen-thu-victory.png'), animations: 'disabled' });

  hudConfig = {
    ...hudConfig,
    version: 2,
    images: { logo: missingLogoId, bgQuestion: missingBackgroundId, bgLobby: null, bgVictory: missingBackgroundId },
  };
  await page.goto('/?mock=question', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', '/assets/brand/logo.png');
  await expect(page.getByTestId('arena-background')).toHaveAttribute('src', '/assets/arena/bg-question-user.jpg');
  await expect.poll(() => page.getByTestId('brand-logo').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect.poll(() => page.getByTestId('arena-background').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.goto('/?mock=victory', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('v3v-event-logo')).toHaveAttribute('src', '/assets/brand/logo.png');
  await expect(page.getByTestId('victory-background')).toHaveAttribute('src', '/assets/victory/bg-user-cover.jpg');
  await expect.poll(() => page.getByTestId('v3v-event-logo').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect.poll(() => page.getByTestId('victory-background').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});

test('real participant counts format and fit the B2 card; capture the displayed values', async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  const base = makeMockSnapshot('question');
  if (!base) throw new Error('Missing question mock for participant count test.');
  let participantCount = 57;
  await page.routeWebSocket('/ws', (socket) => {
    socket.onMessage((message) => {
      const incoming = JSON.parse(String(message)) as { type?: string };
      if (incoming.type !== 'HELLO') return;
      const snapshot = { ...base, participantCount };
      socket.send(JSON.stringify({
        v: 1,
        type: 'STATE_SNAPSHOT',
        seq: 1,
        sessionId: snapshot.sessionId,
        stateVersion: snapshot.stateVersion,
        serverTimeMs: Date.now(),
        payload: snapshot,
      }));
    });
  });

  const samples = [
    { count: 57, text: '57' },
    { count: 9_876, text: '9.876' },
    { count: 10_500, text: '10,5K' },
    { count: 1_234_567, text: '1,2M' },
  ];
  const reviewDirectory = join(getE2eTempDirectory(), 'e2e', 'screenshots', 'c0168');
  mkdirSync(reviewDirectory, { recursive: true });
  for (const sample of samples) {
    participantCount = sample.count;
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const stage = page.locator('[data-testid="stage"][data-scene="QUESTION"]');
    await expect(stage).toBeVisible();
    const count = stage.getByTestId('participant-count');
    const card = stage.getByTestId('round-card');
    await expect(count).toHaveText(sample.text);
    expect(await card.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(await card.evaluate((element) => element.clientWidth));
    const cardBox = await card.boundingBox();
    expect(cardBox).toMatchObject({ x: 770, y: 133, width: 230, height: roundCardHeight });
    await page.screenshot({
      path: join(reviewDirectory, `after-count-${sample.count}.png`),
      clip: { x: 740, y: 0, width: 300, height: 220 },
    });
  }
});

test('C-0175 keeps the pill, Top 10 and question content inside their frame padding', async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  const { stage } = await openScene(page, 'question', 'QUESTION');
  const ribbon = stage.locator('.v3-title-ribbon');
  const pillSpace = await ribbon.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const text = range.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return { left: text.left - box.left, right: box.right - text.right, top: text.top - box.top, bottom: box.bottom - text.bottom };
  });
  expect(pillSpace.left).toBeGreaterThanOrEqual(40);
  expect(pillSpace.right).toBeGreaterThanOrEqual(40);
  expect(pillSpace.top).toBeGreaterThanOrEqual(10);
  expect(pillSpace.bottom).toBeGreaterThanOrEqual(10);

  const top10 = stage.locator('.v3-top10');
  const topBox = await top10.boundingBox();
  const titleBox = await top10.locator('.v3-top10-title').boundingBox();
  const rows = top10.locator('li[data-testid="leaderboard-row"]');
  expect(topBox).not.toBeNull();
  expect(titleBox).not.toBeNull();
  expect(await rows.count()).toBe(10);
  if (!topBox || !titleBox) return;
  expect(titleBox.x - topBox.x).toBeGreaterThanOrEqual(20);
  expect(titleBox.y - topBox.y).toBeGreaterThanOrEqual(20);
  for (let index = 0; index < await rows.count(); index += 1) {
    const row = rows.nth(index);
    const rowBox = await row.boundingBox();
    expect(rowBox).not.toBeNull();
    if (!rowBox) continue;
    expect(rowBox.x - topBox.x).toBeGreaterThanOrEqual(20);
    expect(topBox.x + topBox.width - rowBox.x - rowBox.width).toBeGreaterThanOrEqual(20);
    expect(rowBox.y - topBox.y).toBeGreaterThanOrEqual(20);
    expect(topBox.y + topBox.height - rowBox.y - rowBox.height).toBeGreaterThanOrEqual(18);
    const name = row.locator('.v3-name-text');
    expect(parseFloat(await name.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(22);
    const scoreBox = await row.locator('.v3-score').boundingBox();
    expect(scoreBox).not.toBeNull();
    if (scoreBox) {
      expect(scoreBox.x - topBox.x).toBeGreaterThanOrEqual(20);
      expect(topBox.x + topBox.width - scoreBox.x - scoreBox.width).toBeGreaterThanOrEqual(20);
    }
    const badge = row.getByTestId('top1-badge');
    if (await badge.count()) {
      const badgeBox = await badge.boundingBox();
      expect(badgeBox).not.toBeNull();
      if (badgeBox) {
        expect(badgeBox.x - topBox.x).toBeGreaterThanOrEqual(20);
        expect(topBox.x + topBox.width - badgeBox.x - badgeBox.width).toBeGreaterThanOrEqual(20);
      }
    }
  }

  const board = stage.locator('.v3-board');
  const boardBox = await board.boundingBox();
  expect(boardBox).not.toBeNull();
  expect(boardBox?.y).toBe(348);
  if (!boardBox || !topBox) return;
  expect(boardBox.x - (topBox.x + topBox.width)).toBeGreaterThanOrEqual(18);
  const framedItems = [
    stage.getByTestId('question-tab'),
    stage.getByTestId('timer'),
    stage.getByTestId('question-prompt'),
    stage.getByTestId('option-A'),
    stage.getByTestId('option-B'),
    stage.getByTestId('option-C'),
    stage.getByTestId('option-D'),
  ];
  for (const item of framedItems) {
    const box = await item.boundingBox();
    expect(box).not.toBeNull();
    if (!box) continue;
    const itemLabel = await item.getAttribute('data-testid') ?? await item.evaluate((element) => String(element.className));
    const minHorizontalPadding = itemLabel === 'timer' || itemLabel.startsWith('option-') ? 16 : itemLabel === 'question-prompt' ? 10 : 18;
    const minTopPadding = itemLabel === 'timer' ? 0 : 18;
    expect(box.x - boardBox.x).toBeGreaterThanOrEqual(minHorizontalPadding);
    expect(boardBox.x + boardBox.width - box.x - box.width).toBeGreaterThanOrEqual(minHorizontalPadding);
    expect(box.y - boardBox.y, `${itemLabel} stays inside the approved question frame`).toBeGreaterThanOrEqual(minTopPadding);
    expect(boardBox.y + boardBox.height - box.y - box.height).toBeGreaterThanOrEqual(12);
  }
  const bubbleBox = await stage.getByTestId('mc-bubble').boundingBox();
  expect(bubbleBox).not.toBeNull();
  if (bubbleBox) expect(bubbleBox.y - boardBox.y - boardBox.height).toBeGreaterThanOrEqual(16);
});

test('event name and participant count stay readable on every shared header scene', async ({ page }) => {
  for (const { name, scene } of [
    { name: 'lobby', scene: 'LOBBY' },
    { name: 'prepare', scene: 'QUESTION' },
    { name: 'reading', scene: 'QUESTION' },
    { name: 'question', scene: 'QUESTION' },
    { name: 'reveal', scene: 'REVEAL' },
    { name: 'top10', scene: 'INTERIM_TOP10' },
    { name: 'intermission', scene: 'INTERMISSION' },
    { name: 'connection-lost', scene: 'CONNECTION_LOST' },
  ]) {
    const { stage } = await openScene(page, name, scene);
    const ribbon = stage.locator('.v3-title-ribbon');
    const count = stage.getByTestId('participant-count');
    const label = stage.locator('.v3-round-label');
    await expect(ribbon).toHaveText('ĐẤU TRƯỜNG BÃO TỐ');
    expect(parseFloat(await ribbon.evaluate((element) => getComputedStyle(element).fontSize)), name).toBeGreaterThanOrEqual(['lobby', 'prepare', 'reading', 'question', 'reveal'].includes(name) ? 21 : 24);
    expect(await ribbon.evaluate((element) => getComputedStyle(element).whiteSpace), name).toBe('nowrap');
    expect(parseFloat(await stage.getByTestId('round-card').locator('.v3-round-title').evaluate((element) => getComputedStyle(element).fontSize)), name).toBeGreaterThanOrEqual(roundCardMinimums.title);
    expect(parseFloat(await count.evaluate((element) => getComputedStyle(element).fontSize)), name).toBeGreaterThanOrEqual(roundCardMinimums.count);
    expect(parseFloat(await label.evaluate((element) => getComputedStyle(element).fontSize)), name).toBeLessThan(parseFloat(await count.evaluate((element) => getComputedStyle(element).fontSize)));
    const roundBox = await stage.getByTestId('round-card').boundingBox();
    expect(roundBox).toMatchObject({ x: 770, y: 133, width: 230, height: roundCardHeight });
    expect(await stage.getByTestId('round-card').evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(await stage.getByTestId('round-card').evaluate((element) => element.clientWidth));

    if (name === 'question') {
      const ribbonBox = await ribbon.boundingBox();
      const boardBox = await stage.locator('.v3-board').boundingBox();
      expect(ribbonBox).not.toBeNull();
      expect(boardBox).not.toBeNull();
      expect(boardBox!.y).toBe(348);
      expect(ribbonBox!.x).toBeGreaterThanOrEqual(0);
      expect(ribbonBox!.x + ribbonBox!.width).toBeLessThanOrEqual(1080);
      expect(ribbonBox!.y + ribbonBox!.height).toBeLessThanOrEqual(boardBox!.y - 16);
    }
  }
});

test('reveal marks exactly one correct option', async ({ page }) => {
  const { errors } = await openScene(page, 'reveal', 'REVEAL');
  const correctOptions = page.locator('[data-testid^="option-"].is-correct');
  await expect(correctOptions).toHaveCount(1);
  await expect(correctOptions).toHaveAttribute('data-testid', 'option-B');
  const percentages = await Promise.all(['A', 'B', 'C', 'D'].map(async (id) => {
    const option = page.getByTestId(`option-${id}`);
    return {
      label: await option.locator('.v3-option-count').innerText(),
      share: await option.evaluate((element) => getComputedStyle(element).getPropertyValue('--answer-share').trim()),
    };
  }));
  expect(percentages.map(({ label }) => label)).toEqual(['12%', '45%', '29%', '14%']);
  expect(percentages.map(({ share }) => share)).toEqual(['12%', '45%', '29%', '14%']);
  expect(errors).toEqual([]);
});

test('cắt câu hỏi và đáp án dài theo grapheme ở QUESTION và REVEAL', async ({ page }) => {
  const cases = [
    { name: 'question-clamp-text', scene: 'QUESTION', screenshot: 'c0163-question.png' },
    { name: 'reveal-clamp-text', scene: 'REVEAL', screenshot: 'c0163-reveal.png' },
  ];
  const segmenter = new Intl.Segmenter('vi', { granularity: 'grapheme' });
  const countGraphemes = (text: string) => Array.from(segmenter.segment(text)).length;

  for (const { name, scene, screenshot } of cases) {
    const source = makeMockSnapshot(name);
    if (!source?.question) throw new Error(`Missing ${name} mock question.`);
    const fullPrompt = source.question.prompt;
    const fullAnswer = source.question.options.find((option) => option.id === 'B')!.text;
    expect(countGraphemes(fullPrompt)).toBe(220);
    expect(countGraphemes(fullAnswer)).toBe(80);

    const { stage, errors } = await openScene(page, name, scene);
    const prompt = stage.getByTestId('question-prompt');
    const displayedPrompt = await prompt.innerText();
    const displayedAnswer = await stage.getByTestId('option-B').locator('.v3-option-text').innerText();
    if (scene === 'REVEAL') await expect(stage.getByTestId('option-B')).toHaveClass(/is-correct/);
    const promptTruncated = await prompt.getAttribute('data-prompt-truncated') === 'true';
    if (promptTruncated) {
      await expect(prompt).toHaveAttribute('title', fullPrompt);
      await expect(stage.getByTestId('prompt-truncation-warning')).toBeVisible();
      await expect(stage.getByTestId('question-prompt-copy')).toContainText(/…$/);
    } else {
      expect(displayedPrompt).toBe(fullPrompt);
    }
    for (const [label, fullText, displayedText, max] of [
      ['answer', fullAnswer, displayedAnswer, 45],
    ] as const) {
      expect(displayedText.endsWith('…'), `${name}: ${label} ends with ellipsis`).toBe(true);
      expect(countGraphemes(displayedText)).toBeLessThanOrEqual(max + 1);
      const visibleText = displayedText.slice(0, -1);
      expect(fullText.startsWith(visibleText), `${name}: ${label} remains a source prefix`).toBe(true);
      expect(fullText.slice(visibleText.length), `${name}: ${label} ends at a word boundary`).toMatch(/^\s/u);
    }
    await page.screenshot({ path: join(screenshotDirectory, screenshot), animations: 'disabled' });
    expect(errors, `${name}: no console or page errors`).toEqual([]);
  }
});

test('Top 10 đủ 10 hàng, tên cuối nhận tương tác trên MC ở sảnh và bốn pha câu hỏi', async ({ page }) => {
  const cases = [
    { name: 'lobby', scene: 'LOBBY' },
    { name: 'prepare', scene: 'QUESTION' },
    { name: 'reading', scene: 'QUESTION' },
    { name: 'question', scene: 'QUESTION' },
    { name: 'reveal', scene: 'REVEAL' },
  ];
  const stackingIssues: string[] = [];

  for (const { name, scene } of cases) {
    const { stage, errors } = name === 'lobby'
      ? await openLobbyWithTenLeaderboardEntries(page)
      : await openScene(page, name, scene);
    const top10 = stage.getByTestId('v3-top10');
    const rows = top10.locator('[data-testid="leaderboard-row"]');
    await expect(rows).toHaveCount(10);
    await page.screenshot({ path: join(screenshotDirectory, `${name}-top10-layer.png`), animations: 'disabled' });

    const [top10Z, mcZ, nameBox, mcBox] = await Promise.all([
      top10.evaluate((element) => Number.parseInt(getComputedStyle(element).zIndex, 10)),
      stage.locator('.v3-mc').evaluate((element) => Number.parseInt(getComputedStyle(element).zIndex, 10)),
      rows.last().locator('.v3-name-text').boundingBox(),
      stage.locator('.v3-mc-figure').boundingBox(),
    ]);
    if (top10Z <= mcZ) stackingIssues.push(`${name}: Top 10 z-index ${top10Z} is not above MC ${mcZ}`);
    if (!nameBox || !mcBox) {
      stackingIssues.push(`${name}: tenth row name or MC frame has no box`);
      continue;
    }

    // C-0207 restores the approved main layout where Kelly's transparent portrait edge
    // can overlap the Top 10 panel; the Top 10 remains the hit-test layer.
    const hitRemainsInTop10 = await page.evaluate(({ x, y }) =>
      document.elementFromPoint(x, y)?.closest('.v3-top10') !== null,
    { x: nameBox.x + nameBox.width / 2, y: nameBox.y + nameBox.height / 2 });
    if (!hitRemainsInTop10) stackingIssues.push(`${name}: hit test at tenth-row name lands under MC`);
    expect(errors, `${name}: no console or page errors`).toEqual([]);
  }
  expect(stackingIssues).toEqual([]);
});

test('sảnh, câu hỏi, reveal và Top 10 giữa vòng dùng nền C-0133 không có cờ rời', async ({ page }) => {
  const cases = [
    { name: 'lobby', scene: 'LOBBY' },
    { name: 'question-longest', scene: 'QUESTION' },
    { name: 'reveal', scene: 'REVEAL' },
    { name: 'top10', scene: 'INTERIM_TOP10' },
  ];
  for (const { name, scene } of cases) {
    const { stage } = await openScene(page, name, scene);
    const background = stage.locator('.v3-arena-backdrop-image');
    await expect(background).toHaveAttribute('src', '/assets/arena/bg-question-user.jpg');
    await expect(background).toHaveCSS('object-fit', 'cover');
    await expect(stage.locator('.v3-arena-flag')).toHaveCount(0);
  }
});

test('question frames stay fixed across phases and lengths; the comment cue appears only while accepting', async ({ page }) => {
  const cases = [
    { name: 'prepare', scene: 'QUESTION' },
    { name: 'reading', scene: 'QUESTION' },
    { name: 'question', scene: 'QUESTION' },
    { name: 'reveal', scene: 'REVEAL' },
  ];
  let reference: Record<string, unknown> | undefined;
  for (const { name, scene } of cases) {
    const { stage } = await openScene(page, name, scene);
    if (name === 'reveal') await page.waitForTimeout(700); // Chờ animation báo đáp án kết thúc trước khi đo vị trí.
    const geometry = await page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
      };
      const layoutBox = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) return null;
        return { x: element.offsetLeft, y: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight };
      };
      return {
        board: box('.v3-board'), prompt: box('.v3-question'), options: box('.v3-options'), top10: box('.v3-top10'),
        mcFrame: box('.v3-mc-figure'), bubble: box('[data-testid="mc-bubble"]'),
        mc: box('.v3-mc'), mcFigure: (() => { const element = document.querySelector<HTMLElement>('.v3-mc-figure')!; return { x: element.offsetLeft, y: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight }; })(),
        mcPlate: box('.v3-mc-plate'), logo: box('[data-testid="brand-logo-frame"]'),
        answers: ['A', 'B', 'C', 'D'].map((id) => box(`[data-testid="option-${id}"]`)),
        timer: layoutBox('[data-testid="timer"]'),
        promptFits: document.querySelector<HTMLElement>('.v3-question')!.scrollHeight <= document.querySelector<HTMLElement>('.v3-question')!.clientHeight,
        blankAnswers: [...document.querySelectorAll<HTMLElement>('.v3-option-text')].every((option) => option.innerText === ''),
      };
    });
    expect(geometry.board, `${name}: fixed board exists`).not.toBeNull();
    expect(geometry.prompt, `${name}: fixed prompt box exists`).not.toBeNull();
    expect(geometry.options, `${name}: fixed answer region exists`).not.toBeNull();
    expect(geometry.answers, `${name}: four answer boxes exist`).toHaveLength(4);
    expect(geometry.answers.every(Boolean), `${name}: all answer boxes remain in place`).toBe(true);
    for (const region of ['board', 'top10'] as const) {
      const box = geometry[region];
      const expected = region === 'top10'
        ? { y: 348, height: 462 }
        : { y: 348, height: 465 };
      expect(box, `${name}: ${region} exists`).not.toBeNull();
      expect(Math.abs(box!.y - expected.y), `${name}: ${region} matches the C-0219 180px lift`).toBeLessThanOrEqual(1);
      expect(Math.abs(box!.height - expected.height), `${name}: ${region} matches the fixed origin/main height`).toBeLessThanOrEqual(1);
    }
    expect(geometry.mcFrame, `${name}: MC has the approved frame`).not.toBeNull();
    expect(Math.abs(geometry.mcFrame!.width - 205), `${name}: MC portrait matches user reference width`).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.mcFrame!.height - 158), `${name}: MC portrait uses the C-0317 frame height to clear the chibi row`).toBeLessThanOrEqual(1);
    expect(geometry.bubble, `${name}: fixed speech bubble exists`).not.toBeNull();
    expect(Math.abs(geometry.bubble!.x - 410), `${name}: bubble x matches C-0133`).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.bubble!.y - 860), `${name}: bubble matches C-0219 y`).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.bubble!.width - 575), `${name}: bubble matches C-0219 width`).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.bubble!.height - 145), `${name}: MC bubble matches C-0219 height`).toBeLessThanOrEqual(1);
    expect(geometry.promptFits, `${name}: prompt fits without enlarging its card`).toBe(true);
    expect(geometry.mcFigure, `${name}: Kelly has a visible fixed portrait frame`).not.toBeNull();
    expect(geometry.mcPlate, `${name}: Kelly nameplate has a fixed position`).not.toBeNull();
    expect(Math.abs(geometry.mcPlate!.y - 1013), `${name}: C-0317 keeps a 29px portrait-to-nameplate gap`).toBeLessThanOrEqual(1);
    expect(geometry.logo!.y + geometry.logo!.height, `${name}: logo remains above the baked flags`).toBeLessThanOrEqual(270);
    if (name === 'prepare') expect(geometry.blankAnswers).toBe(true);
    if (!reference) reference = geometry;
    else {
      expect(geometry.board, `${name}: board position and size match`).toEqual(reference.board);
      expect(geometry.prompt, `${name}: prompt position and size match`).toEqual(reference.prompt);
      expect(geometry.options, `${name}: answer region position and size match`).toEqual(reference.options);
      expect(geometry.top10, `${name}: Top 10 position and size match`).toEqual(reference.top10);
      expect(geometry.mc, `${name}: MC position and size match`).toEqual(reference.mc);
      expect(geometry.mcFrame, `${name}: MC frame matches`).toEqual(reference.mcFrame);
      expect(geometry.bubble, `${name}: MC bubble matches`).toEqual(reference.bubble);
      expect(geometry.mcFigure, `${name}: Kelly frame position and size match`).toEqual(reference.mcFigure);
      expect(geometry.mcPlate, `${name}: Kelly plate position and size match`).toEqual(reference.mcPlate);
      expect(geometry.logo, `${name}: header logo position and size match`).toEqual(reference.logo);
      const referenceAnswers = reference.answers as typeof geometry.answers;
      expect(geometry.answers).toHaveLength(referenceAnswers.length);
      for (const [index, answer] of geometry.answers.entries()) {
        const referenceAnswer = referenceAnswers[index];
        expect(answer, `${name}: answer ${index + 1} remains present`).not.toBeNull();
        expect(referenceAnswer, `${name}: reference answer ${index + 1} remains present`).not.toBeNull();
        for (const dimension of ['x', 'y', 'width', 'height'] as const) {
          expect(Math.abs(answer![dimension] - referenceAnswer![dimension]), `${name}: answer ${index + 1} ${dimension} stays within two pixels`).toBeLessThanOrEqual(2);
        }
      }
      if (geometry.timer && reference.timer) {
        for (const dimension of ['x', 'y', 'width', 'height'] as const) {
          expect(Math.abs(geometry.timer[dimension] - (reference.timer as Record<typeof dimension, number>)[dimension]), `${name}: timer ${dimension} stays within two pixels`).toBeLessThanOrEqual(2);
        }
      }
    }
    const cue = stage.getByTestId('mc-bubble');
    if (name === 'reveal') {
      // REVEAL đổi sang lời phản hồi có đáp án; chỉ hướng dẫn comment mới dành riêng cho pha nhận câu trả lời.
      await expect(cue).toBeVisible();
      await expect(cue).toContainText('Đáp án B');
    } else {
      await expect(cue).toBeVisible();
      if (name === 'question' || name === 'question-longest' || name === 'question-long-answer') await expect(cue).toContainText('comment A, B, C hoặc D');
      else await expect(cue).not.toContainText('comment A');
    }
    const [figureBox, boardBox, top10Box] = await Promise.all([stage.locator('.v3-mc-figure').boundingBox(), stage.locator('.v3-board').boundingBox(), stage.locator('.v3-top10').boundingBox()]);
    expect(figureBox).not.toBeNull();
    expect(boardBox).not.toBeNull();
    expect(top10Box).not.toBeNull();
    const overlaps = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    expect(overlaps(figureBox!, boardBox!), `${name}: quiz frame does not cover Kelly`).toBe(false);
    // C-0133 đưa Kelly lên trước hàng ghế; panel Top 10 có thể giao khung ảnh ở phần đệm cuối.
    // Khung quiz vẫn phải tách khỏi Kelly và các panel giữ nguyên vị trí qua mọi pha.
  }
});

test('XSS shaped names render as text', async ({ page }) => {
  const { errors } = await openScene(page, 'top10-xss', 'INTERIM_TOP10');
  const nameTitles = await page.locator('.player-name').evaluateAll((elements) => elements.map((element) => element.getAttribute('title')));
  expect(nameTitles).toContain('<script>window.__xss=1</script>');
  expect(nameTitles).toContain('<img src=x onerror="window.__xss=1">');
  await expect(page.locator('.player-name script, .player-name img')).toHaveCount(0);
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as Window & { __xss?: number }).__xss)).toBeUndefined();
  const firstRow = page.locator('[data-testid="v3-top10-large"] [data-testid="leaderboard-row"]').first();
  const name = firstRow.locator('.v3-full-name-text');
  const badge = firstRow.locator('[data-testid="top1-badge"]');
  const score = firstRow.locator('.v3-full-score');
  await expect(badge).toHaveText('x3');
  await expect(badge).toBeVisible();
  const boxes = await Promise.all([name.boundingBox(), badge.boundingBox(), score.boundingBox()]);
  expect(boxes.every(Boolean)).toBe(true);
  expect(boxes[1]!.y).toBeGreaterThanOrEqual(boxes[0]!.y + boxes[0]!.height - 2);
  expect(boxes[1]!.x + boxes[1]!.width).toBeLessThanOrEqual(boxes[2]!.x);
  expect(errors).toEqual([]);
});

test('compact Top 10 stays within 45 percent and shows 14-character names beside Kelly', async ({ page }) => {
  const { errors } = await openScene(page, 'top10-long-name', 'INTERIM_TOP10');
  const panel = page.getByTestId('v3-top10-large');
  const panelBox = await panel.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.y).toBeGreaterThanOrEqual(268);
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(1120);
  expect(panelBox!.height).toBeLessThanOrEqual(864);
  const rows = panel.locator('[data-testid="leaderboard-row"]');
  await expect(rows).toHaveCount(10);
  const [firstRow, lastRow] = await Promise.all([rows.first().boundingBox(), rows.last().boundingBox()]);
  expect(firstRow).not.toBeNull();
  expect(lastRow).not.toBeNull();
  expect(lastRow!.y + lastRow!.height).toBeLessThanOrEqual(panelBox!.y + panelBox!.height - 40);
  const name = rows.first().locator('.v3-full-name-text');
  const badge = rows.first().locator('[data-testid="top1-badge"]');
  await expect(name).toHaveText('StormKingAlpha');
  await expect(badge).toHaveText('x3');
  const [nameBox, badgeBox] = await Promise.all([name.boundingBox(), badge.boundingBox()]);
  expect(nameBox).not.toBeNull();
  expect(badgeBox).not.toBeNull();
  expect(badgeBox!.y).toBeGreaterThanOrEqual(nameBox!.y + nameBox!.height - 2);
  expect(await name.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const guide = page.getByTestId('top10-guide');
  await expect(guide).toBeVisible();
  await expect(guide.getByTestId('mc-bubble')).toBeVisible();
  const figure = guide.locator('.v3-mc-figure');
  await expect(figure).toHaveCSS('animation-name', 'none');
  const [figureBox, bubbleBox] = await Promise.all([figure.boundingBox(), guide.getByTestId('mc-bubble').boundingBox()]);
  expect(figureBox).not.toBeNull();
  expect(bubbleBox).not.toBeNull();
  expect(bubbleBox).toMatchObject({ x: 115, y: 1178, width: 633, height: 145 });
  expect(Math.abs(bubbleBox!.y + bubbleBox!.height / 2 - (figureBox!.y + figureBox!.height / 2))).toBeLessThanOrEqual(1);
  await page.waitForTimeout(8_100);
  await page.screenshot({ path: join(screenshotDirectory, 'top10.png'), animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('top10-short shows only its three real entries', async ({ page }) => {
  const { errors } = await openScene(page, 'top10-short', 'INTERIM_TOP10');
  const rows = page.locator('[data-testid="leaderboard-row"]');
  await expect(rows).toHaveCount(3);
  for (let index = 0; index < await rows.count(); index += 1) {
    await expect(rows.nth(index).locator('.player-name')).not.toHaveText('');
  }
  expect(errors).toEqual([]);
});

test('question scene uses the official logo, approved Kelly/chibi assets and arena background', async ({ page }) => {
  test.skip(!hasLocalCharacterAssets || !hasLocalKellyAsset, 'Local character assets are excluded from Git; validate when the asset bank is available.');
  const { errors } = await openScene(page, 'question', 'QUESTION');
  await expect(page.locator('.v3-arena-backdrop')).toHaveCount(0);
  const background = page.locator('.v3-arena-backdrop-image');
  await expect(background).toHaveAttribute('src', '/assets/arena/bg-question-user.jpg');
  await expect(background).toHaveCSS('filter', 'none');
  await expect(page.locator('.v3-arena-environment')).toBeHidden();
  await expect(page.locator('.v3-arena-flag')).toHaveCount(0);
  const brandLogo = page.getByTestId('brand-logo');
  await expect(brandLogo).toBeVisible();
  if (hasLocalEventLogo) {
    await expect(brandLogo).toHaveAttribute('src', '/assets/brand/logo.png');
    expect(await brandLogo.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('.v3-title-tagline')).toHaveCount(0);
  } else {
    await expect(brandLogo).toContainText('BÁ VƯƠNG');
    await expect(brandLogo).toContainText('ĐẠI CHIẾN');
  }
  await expect(page.locator('.v3-title-ribbon')).toHaveText('ĐẤU TRƯỜNG BÃO TỐ');
  const kelly = page.locator('.v3-mc-figure img.mc-sequence');
  await expect(kelly).toBeVisible();
  await expect.poll(() => kelly.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const mcCrop = await kelly.evaluate((image: HTMLImageElement) => ({
    parentHeight: image.parentElement?.clientHeight ?? 0,
    imageWidth: image.offsetWidth,
    imageHeight: image.offsetHeight,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    overflow: image.parentElement ? getComputedStyle(image.parentElement).overflow : '',
  }));
  expect(mcCrop.overflow).toBe('hidden');
  expect(mcCrop.parentHeight).toBe(158);
  expect(mcCrop.imageWidth).toBe(168);
  expect(mcCrop.imageHeight).toBeGreaterThan(mcCrop.parentHeight);
  expect(mcCrop.imageHeight / mcCrop.imageWidth).toBeCloseTo(mcCrop.naturalHeight / mcCrop.naturalWidth, 2);

  const chibis = page.locator('.v3-chibi-img img');
  await expect(chibis).toHaveCount(35);
  await expect.poll(() => chibis.evaluateAll((images) => images.filter((image) => {
    const candidate = image as HTMLImageElement;
    return candidate.complete && candidate.naturalWidth > 0;
  }).length)).toBe(35);
  await expect.poll(() => chibis.first().evaluate((image) => getComputedStyle(image).objectFit)).toBe('cover');
  await expect.poll(() => chibis.first().evaluate((image) => getComputedStyle(image).objectPosition)).toBe('50% 0%');
  await expect(page.locator('.v3-mc-placeholder, .v3-chibi')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('header falls back to BrandMark when the official logo asset is missing', async ({ page }) => {
  await page.route('**/assets/brand/logo.png', (route) => route.fulfill({ status: 404, body: 'missing logo' }));
  await page.goto('/?mock=question', { waitUntil: 'domcontentloaded' });
  const stage = page.locator('[data-testid="stage"][data-scene="QUESTION"]');
  await expect(stage).toBeVisible();
  await expect(stage.locator('.v3-title img[data-testid="brand-logo"]')).toHaveCount(0);
  const fallback = stage.locator('.v3-title-main[data-testid="brand-logo"]');
  await expect(fallback).toContainText('BÁ VƯƠNG');
  await expect(fallback).toContainText('ĐẠI CHIẾN');
  await expect(stage.locator('.v3-title-ribbon')).toHaveText('ĐẤU TRƯỜNG BÃO TỐ');
});

test('question crowd labels stay clear of the quiz and Top 1 badge fits its score column', async ({ page }) => {
  const { errors } = await openScene(page, 'question-long-name', 'QUESTION');
  const top10 = page.locator('[data-testid="v3-top10"]');
  const mcFigure = page.locator('.v3-mc-figure');
  const [top10Box, mcBox] = await Promise.all([top10.boundingBox(), mcFigure.boundingBox()]);
  expect(top10Box).not.toBeNull();
  expect(mcBox).not.toBeNull();
  const boardBox = await page.locator('.v3-board').boundingBox();
  expect(boardBox).not.toBeNull();
  expect(top10Box!.x).toBeGreaterThanOrEqual(68);
  expect(top10Box!.x + top10Box!.width).toBeLessThan(boardBox!.x);
  expect(boardBox!.x + boardBox!.width).toBeLessThanOrEqual(1010);
  expect(mcBox!.y).toBeGreaterThanOrEqual(815);

  const seatNames = page.locator('.v3-seat-name');
  await expect(page.locator('[data-testid="audience-seat"]')).toHaveCount(35);
  await expect(page.locator('.v3-seat-back')).toHaveCount(35);
  await expect(seatNames).toHaveCount(35);

  const leaderboardRows = top10.locator('[data-testid="leaderboard-row"]');
  await expect(leaderboardRows).toHaveCount(10);
  const [lastRowBox, firstNameBox] = await Promise.all([
    leaderboardRows.last().boundingBox(),
    leaderboardRows.first().locator('.v3-name-text').boundingBox(),
  ]);
  expect(lastRowBox).not.toBeNull();
  expect(firstNameBox).not.toBeNull();
  expect(lastRowBox!.y + lastRowBox!.height).toBeLessThanOrEqual(top10Box!.y + top10Box!.height - 10);
  expect(firstNameBox!.width).toBeGreaterThanOrEqual(96);

  const queue = page.locator('.v3-queue');
  await expect(queue).toBeHidden();

  const overlaps = await page.evaluate(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="question-prompt"], [data-testid^="option-"]'));
    const names = Array.from(document.querySelectorAll<HTMLElement>('.v3-seat-name'));
    const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    return names.flatMap((name, nameIndex) => {
      const nameBox = name.getBoundingClientRect();
      return targets.flatMap((target, targetIndex) => intersects(nameBox, target.getBoundingClientRect()) ? [`name ${nameIndex} overlaps target ${targetIndex}`] : []);
    });
  });
  expect(overlaps, 'all 35 audience nameplates stay clear of question and answer boxes').toEqual([]);

  const firstRow = page.locator('[data-testid="v3-top10"] [data-testid="leaderboard-row"]').first();
  const name = firstRow.locator('.v3-name-text');
  const badge = firstRow.locator('[data-testid="top1-badge"]');
  const score = firstRow.locator('.v3-score');
  await expect(badge).toHaveText('x3');
  await expect(badge).toBeVisible();
  const boxes = await Promise.all([name.boundingBox(), badge.boundingBox(), score.boundingBox()]);
  expect(boxes.every(Boolean)).toBe(true);
  expect(boxes[0]!.x + boxes[0]!.width).toBeLessThanOrEqual(boxes[1]!.x);
  expect(boxes[1]!.x + boxes[1]!.width).toBeLessThanOrEqual(boxes[2]!.x);
  const nameLayout = await name.evaluate((element) => ({
    visibleName: element.textContent?.trim() ?? '',
    fullName: element.getAttribute('title') ?? element.textContent?.trim() ?? '',
    clipped: element.scrollWidth > element.clientWidth,
    overflow: getComputedStyle(element).textOverflow,
  }));
  const visibleGraphemeCount = Array.from(new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(nameLayout.visibleName)).length;
  const fullGraphemeCount = Array.from(new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(nameLayout.fullName)).length;
  expect(visibleGraphemeCount).toBeLessThanOrEqual(16);
  if (fullGraphemeCount > 16) expect(nameLayout.visibleName).toContain('…');
  if (nameLayout.clipped) expect(nameLayout.overflow).toBe('ellipsis');
  else if (fullGraphemeCount > 16) expect(nameLayout.visibleName).toContain('…');
  await expect(score).toHaveText('1.500');
  expect(errors).toEqual([]);
});

  test('question and Top 10 use C-0219 positions over the unchanged baked flags', async ({ page }) => {
  await openScene(page, 'question', 'QUESTION');
  for (const selector of ['.v3-top10', '.v3-board', '.v3-timer']) {
    const box = await page.locator(selector).boundingBox();
    expect(box, `${selector} has a measurable position`).not.toBeNull();
    expect(box!.y).toBe(selector === '.v3-timer' ? 364 : 348);
  }
});

test('TikTok HUD overlays the same quiz layout while critical quiz content stays readable', async ({ page }) => {
  await page.setViewportSize({ width: 921, height: 2000 });
  const selectors = ['.v3-header', '.v3-title', '.v3-top10', '.v3-board', '.v3-timer', '.v3-mc'];
  const captureLayout = async (hud: boolean) => {
    await page.goto(`/?mock=question${hud ? '&hud=1' : ''}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="stage"][data-scene="QUESTION"]')).toBeVisible();
    await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
    return Promise.all(selectors.map(async (selector) => {
      const box = await page.locator(selector).boundingBox();
      expect(box, `${selector} has a measurable position with hud=${hud}`).not.toBeNull();
      return box && [box.x, box.y, box.width, box.height].map((value) => Math.round(value * 100) / 100);
    }));
  };
  const withoutHud = await captureLayout(false);
  const withHud = await captureLayout(true);
  expect(withHud).toEqual(withoutHud);

  const stageBox = await page.locator('[data-testid="stage"]').boundingBox();
  const logoBox = await page.getByTestId('brand-logo-frame').boundingBox();
  expect(stageBox).not.toBeNull();
  expect(logoBox).not.toBeNull();
  expect(logoBox!.width / stageBox!.width).toBeGreaterThanOrEqual(0.22);
  expect(logoBox!.width / stageBox!.width).toBeLessThanOrEqual(0.25);

  const overlap = await page.evaluate(() => {
    const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const box = (selector: string) => document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
    const eventBanner = box('.tiktok-hud-event-banner');
    const timerText = box('.v3-timer b');
    const comments = box('.tiktok-hud-comments');
    const important = Array.from(document.querySelectorAll<HTMLElement>(
      '.v3-top10, .v3-board, .v3-mc-figure, .v3-mc-plate, .v3-mc .v3-bubble',
    ))
      .map((element) => element.getBoundingClientRect());
    return {
      bannerCoversTimerText: !!eventBanner && !!timerText && intersects(eventBanner, timerText),
      commentsCoverQuiz: !!comments && important.some((target) => intersects(comments, target)),
    };
  });
  // Theo quyết định người dùng C-0073, HUD host/viewers được phép phủ một phần logo BVĐC.
  expect(overlap).toEqual({ bannerCoversTimerText: false, commentsCoverQuiz: false });
});

test('question uses the baked stadium, audience ranks and the accepting instruction', async ({ page }) => {
  await openScene(page, 'question', 'QUESTION');
  await expect(page.locator('.v3-bg--question-user .v3-arena-backdrop-image')).toBeVisible();
  await expect(page.locator('.v3-arena-flag')).toHaveCount(0);
  await expect(page.locator('.v3-env-wrap')).toBeHidden();
  const steps = page.locator('.v3-step');
  await expect(steps).toHaveCount(7);
  const [backRow, frontRow] = await Promise.all([steps.first().boundingBox(), steps.last().boundingBox()]);
  expect(backRow).not.toBeNull();
  expect(frontRow).not.toBeNull();
  expect(backRow!.height).toBeGreaterThanOrEqual(90);
  expect(frontRow!.width).toBeGreaterThan(backRow!.width);
  await expect(page.getByTestId('question-tab')).toHaveText(/^CÂU HỎI \d+$/);
  const rankShield = page.locator('.v3-rank-1 .v3-rank');
  await expect(rankShield).toBeVisible();
  expect(await rankShield.evaluate((element) => getComputedStyle(element).clipPath)).toContain('polygon');
  const bubble = page.getByTestId('mc-bubble');
  await expect(bubble).toContainText('Trả lời bằng cách');
  await expect(bubble).toContainText('comment A, B, C hoặc D');
  await expect(bubble).not.toContainText('để tham gia ngay!');
  expect(await bubble.evaluate((element) => getComputedStyle(element, '::before').content)).not.toBe('none');
  expect(await bubble.locator('p').evaluate((element) => getComputedStyle(element).whiteSpace)).toBe('pre-line');
  const instructionBox = await bubble.boundingBox();
  const boardBox = await page.locator('.v3-board').boundingBox();
  expect(instructionBox).not.toBeNull();
  expect(boardBox).not.toBeNull();
  const instructionCenterX = instructionBox!.x + instructionBox!.width / 2;
  const boardCenterX = boardBox!.x + boardBox!.width / 2;
  expect(Math.abs(instructionCenterX - boardCenterX)).toBeLessThanOrEqual(13);
  expect(instructionBox!.y).toBeGreaterThanOrEqual(boardBox!.y + boardBox!.height);
});

test('TikTok LIVE HUD uses room chrome, comments and phone safe zone', async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.setViewportSize({ width: 921, height: 2000 });
  await page.goto('/?mock=question&hud=1&fit=cover&safeTop=180&safeRight=140&safeBottom=120&safeLeft=20&safeRightFromY=700', { waitUntil: 'domcontentloaded' });
  const stage = page.locator('[data-testid="stage"][data-scene="QUESTION"]');
  await expect(stage).toBeVisible();
  await expect(page.getByTestId('tiktok-hud')).toBeVisible();
  const stageBox = await stage.boundingBox();
  expect(stageBox).not.toBeNull();
  expect(stageBox!.width).toBeGreaterThan(921);
  expect(stageBox!.height).toBeGreaterThanOrEqual(1999);
  expect(stageBox!.height).toBeLessThanOrEqual(2001);
  for (const selector of ['.v3-top10 ol', '.v3-board', '.v3-timer', '.v3-question', '[data-testid="option-A"]']) {
    const box = await page.locator(selector).boundingBox();
    expect(box, `${selector} stays visible after phone side crop`).not.toBeNull();
    // The shifted panel border may bleed into the crop; its title/rows remain inside the safe area.
    expect(box!.x).toBeGreaterThanOrEqual(selector === '.v3-top10 ol' ? -12 : -2);
    const rightLimit = selector === '.v3-top10 ol' ? 935
      : selector === '.v3-board' ? 951
        : selector === '.v3-timer' ? 936
          : selector === '.v3-question' ? 934 : 923;
    expect(box!.x + box!.width).toBeLessThanOrEqual(rightLimit);
  }
  await expect(page.getByTestId('tiktok-status-bar')).toBeVisible();
  await expect(page.getByTestId('tiktok-live-info')).toContainText('FFVN.Kelly');
  await expect(page.getByTestId('tiktok-viewers')).toContainText('6,5K');
  await expect(page.getByTestId('tiktok-live-chips')).toContainText('Bảng xếp hạng chơi game');
  await expect(page.getByTestId('tiktok-event-banner')).toContainText('LIVE FEST 2026');
  await expect(page.getByTestId('tiktok-actions')).toHaveCount(0);
  await expect(page.getByTestId('tiktok-comments').locator('p')).toHaveCount(5);
  await expect(page.getByTestId('tiktok-comments')).toContainText('đã tham gia');
  await expect(page.getByTestId('tiktok-gift-toast')).toBeVisible();
  await expect(page.getByTestId('tiktok-share-float')).toBeVisible();
  await expect(page.getByTestId('tiktok-comment-bar')).toContainText('Nhập…');
  await expect(page.getByTestId('safe-zone-guides')).toHaveCount(0);
  await expect(page.getByTestId('tiktok-hud-demo-label')).toHaveCount(0);
  for (const selector of ['.tiktok-hud-host', '.tiktok-hud-viewers', '.tiktok-hud-event-banner', '.tiktok-hud-comments', '.tiktok-hud-comment-bar']) {
    const box = await page.locator(selector).boundingBox();
    expect(box, `${selector} stays on the phone screen`).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-2);
    expect(box!.x + box!.width).toBeLessThanOrEqual(923);
  }
  const [hostBox, chipsBox, eventBox, commentsBox, giftBox, inputBox] = await Promise.all([
    page.getByTestId('tiktok-live-info').boundingBox(),
    page.getByTestId('tiktok-live-chips').boundingBox(),
    page.getByTestId('tiktok-event-banner').boundingBox(),
    page.getByTestId('tiktok-comments').boundingBox(),
    page.getByTestId('tiktok-gift-toast').boundingBox(),
    page.getByTestId('tiktok-comment-bar').boundingBox(),
  ]);
  expect(hostBox!.y).toBeGreaterThanOrEqual(120);
  expect(hostBox!.y + hostBox!.height).toBeLessThanOrEqual(205);
  expect(chipsBox!.y).toBeGreaterThanOrEqual(200);
  expect(chipsBox!.y + chipsBox!.height).toBeLessThanOrEqual(275);
  expect(eventBox!.y + eventBox!.height).toBeLessThanOrEqual(370);
  expect(commentsBox!.y).toBeGreaterThanOrEqual(1380);
  expect(commentsBox!.y + commentsBox!.height).toBeLessThanOrEqual(1855);
  expect(giftBox!.y).toBeGreaterThanOrEqual(1230);
  expect(giftBox!.y).toBeLessThanOrEqual(1370);
  expect(inputBox!.y).toBeGreaterThanOrEqual(1830);
  expect(inputBox!.y + inputBox!.height).toBeLessThanOrEqual(1945);
  const values = await stage.evaluate((element) => {
    const style = getComputedStyle(element);
    return ['--safe-top', '--safe-right', '--safe-bottom', '--safe-left', '--safe-right-from-y']
      .map((name) => style.getPropertyValue(name).trim());
  });
  expect(values).toEqual(['180px', '140px', '120px', '20px', '700px']);
  await page.screenshot({ path: join(screenshotDirectory, 'question-hud.png'), fullPage: true });
  await page.goto('/?mock=question&hud=1&debug=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('safe-zone-guides')).toBeVisible();
  await expect(page.getByTestId('tiktok-hud-demo-label')).toBeVisible();
  expect(errors).toEqual([]);
});

test('question with 35 seats sustains 55 FPS over 10 seconds', async ({ page }) => {
  const { errors } = await openScene(page, 'question', 'QUESTION');
  await expect(page.locator('[data-testid="audience-seat"]')).toHaveCount(35);
  const seatEffects = await page.locator('.v3-seat-back, .v3-seat-back svg path, .v3-seat-name, .v3-chibi-hair, .v3-chibi-img img').evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return { boxShadow: style.boxShadow, filter: style.filter, animationCount: style.animationIterationCount };
  }));
  expect(seatEffects).toHaveLength(35 * 4);
  expect(seatEffects.every((effect) => effect.boxShadow === 'none' && effect.filter === 'none' && effect.animationCount !== 'infinite')).toBe(true);
  const top10Rows = await page.locator('[data-testid="v3-top10"] [data-testid="leaderboard-row"]').evaluateAll((elements) => elements.map((element) => getComputedStyle(element).animationIterationCount));
  expect(top10Rows.every((count) => count !== 'infinite')).toBe(true);
  const renderStats = await page.evaluate(() => new Promise<{ averageFps: number; p5Fps: number; frames: number }>((resolve) => {
    let start = 0;
    let previous = 0;
    const intervals: number[] = [];
    const sample = (timestamp: number) => {
      if (start === 0) {
        start = timestamp;
        previous = timestamp;
      } else {
        intervals.push(timestamp - previous);
        previous = timestamp;
      }
      if (timestamp - start >= 10_000) {
        const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const sorted = [...intervals].sort((a, b) => a - b);
        const p95Interval = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? averageInterval;
        resolve({ averageFps: 1000 / averageInterval, p5Fps: 1000 / p95Interval, frames: intervals.length });
        return;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  console.log(`FPS câu hỏi 10 giây / 35 ghế: trung bình ${renderStats.averageFps.toFixed(1)}, p5 ${renderStats.p5Fps.toFixed(1)}, ${renderStats.frames} khung hình.`);
  expect(renderStats.averageFps).toBeGreaterThanOrEqual(55);
  expect(renderStats.p5Fps).toBeGreaterThanOrEqual(55);
  expect(errors).toEqual([]);
});

test('audio creates WebAudio and dispatches one cue per mock phase transition', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const testWindow = window as typeof window & { __audioProbe?: { contexts: number; oscillatorStarts: number; bufferStarts: number } };
    testWindow.__audioProbe = { contexts: 0, oscillatorStarts: 0, bufferStarts: 0 };
    const param = () => ({ value: 0, setTargetAtTime() {}, setValueAtTime() {}, cancelScheduledValues() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
    class FakeAudioContext {
      state: AudioContextState = 'suspended';
      currentTime = 0;
      sampleRate = 44_100;
      destination = {} as AudioDestinationNode;
      onstatechange: ((this: BaseAudioContext, ev: Event) => unknown) | null = null;
      constructor() { testWindow.__audioProbe!.contexts += 1; }
      createGain() { return { gain: param(), connect() {} } as unknown as GainNode; }
      createOscillator() {
        return {
          type: 'sine', frequency: param(), connect() {},
          start: () => { testWindow.__audioProbe!.oscillatorStarts += 1; },
          stop() {}, onended: null,
        } as unknown as OscillatorNode;
      }
      createBufferSource() { return { buffer: null, connect() {}, start: () => { testWindow.__audioProbe!.bufferStarts += 1; }, stop() {}, loop: false, onended: null } as unknown as AudioBufferSourceNode; }
      createBuffer(_channels: number, length: number, sampleRate: number) { return { duration: length / sampleRate, getChannelData: () => new Float32Array(length) } as unknown as AudioBuffer; }
      createBiquadFilter() { return { type: 'lowpass', frequency: param(), Q: param(), connect() {} } as unknown as BiquadFilterNode; }
      decodeAudioData() { return Promise.resolve({ duration: 0.2 } as AudioBuffer); }
      resume() { this.state = 'running'; this.onstatechange?.call(this as unknown as BaseAudioContext, new Event('statechange')); return Promise.resolve(); }
      close() { this.state = 'closed'; return Promise.resolve(); }
    }
    (window as typeof window & { AudioContext: typeof AudioContext }).AudioContext = FakeAudioContext as unknown as typeof AudioContext;
  });
  await page.route('**/assets/audio/**', (route) => route.fulfill({ status: 404, body: 'optional audio absent' }));
  await page.route('**/assets/audio/question-enter.mp3', (route) => route.fulfill({ status: 200, contentType: 'audio/mpeg', body: 'mock audio file' }));
  const errors = watchPageErrors(page);
  await page.goto('/?mock=cycle&cycleMs=500&role=program&sfx=0.6&bgm=0&fx=low', { waitUntil: 'domcontentloaded' });
  const runtime = page.getByTestId('overlay-audio-runtime');
  await expect(runtime).toHaveAttribute('data-audio-state', 'running');
  await expect(runtime).toHaveAttribute('data-bgm', '0');
  await expect(page.getByTestId('stage')).toHaveAttribute('data-fx-level', 'low');
  await expect(page.locator('.overlay-fx-particle')).toHaveCount(4);
  await expect.poll(() => runtime.getAttribute('data-cues')).toContain('question-enter');
  await expect(page.getByTestId('stage')).toHaveAttribute('data-state', 'READING');
  await expect(runtime).toHaveAttribute('data-cues', 'question-enter');
  await expect.poll(() => runtime.getAttribute('data-cues'), { timeout: 15_000 }).toContain('correct-answer');
  await expect.poll(() => runtime.getAttribute('data-cues'), { timeout: 15_000 }).toContain('top10');
  await expect.poll(() => runtime.getAttribute('data-cues'), { timeout: 15_000 }).toContain('victory');
  const cues = (await runtime.getAttribute('data-cues'))?.split(',') ?? [];
  for (const cue of ['question-enter', 'correct-answer', 'top10', 'victory'])
    expect(cues.filter((value) => value === cue)).toHaveLength(1);
  const probe = await page.evaluate(() => (window as typeof window & { __audioProbe: { contexts: number; oscillatorStarts: number; bufferStarts: number } }).__audioProbe);
  expect(probe.contexts).toBe(1);
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __audioProbe: { bufferStarts: number } }).__audioProbe.bufferStarts)).toBe(2);
  expect(probe.oscillatorStarts).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('program audio retries silently at phase changes without an unlock hint', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const testWindow = window as typeof window & { __audioProbe?: { resumePhases: string[]; oscillatorStarts: number } };
    testWindow.__audioProbe = { resumePhases: [], oscillatorStarts: 0 };
    const param = () => ({ value: 0, setTargetAtTime() {}, setValueAtTime() {}, cancelScheduledValues() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
    class SuspendedAudioContext {
      state: AudioContextState = 'suspended';
      currentTime = 0;
      sampleRate = 44_100;
      destination = {} as AudioDestinationNode;
      onstatechange: ((this: BaseAudioContext, ev: Event) => unknown) | null = null;
      createGain() { return { gain: param(), connect() {} } as unknown as GainNode; }
      createOscillator() {
        return {
          type: 'sine', frequency: param(), connect() {},
          start: () => { testWindow.__audioProbe!.oscillatorStarts += 1; },
          stop() {}, onended: null,
        } as unknown as OscillatorNode;
      }
      createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {}, loop: false, onended: null } as unknown as AudioBufferSourceNode; }
      createBuffer(_channels: number, length: number, sampleRate: number) { return { duration: length / sampleRate, getChannelData: () => new Float32Array(length) } as unknown as AudioBuffer; }
      createBiquadFilter() { return { type: 'lowpass', frequency: param(), Q: param(), connect() {} } as unknown as BiquadFilterNode; }
      decodeAudioData() { return Promise.resolve({ duration: 0.2 } as AudioBuffer); }
      resume() {
        const phase = document.querySelector('[data-testid="stage"]')?.getAttribute('data-state') ?? 'unmounted';
        testWindow.__audioProbe!.resumePhases.push(phase);
        if (new Set(testWindow.__audioProbe!.resumePhases).size < 2)
          return Promise.reject(new Error('autoplay policy'));
        this.state = 'running';
        this.onstatechange?.call(this as unknown as BaseAudioContext, new Event('statechange'));
        return Promise.resolve();
      }
      close() { this.state = 'closed'; return Promise.resolve(); }
    }
    (window as typeof window & { AudioContext: typeof AudioContext }).AudioContext = SuspendedAudioContext as unknown as typeof AudioContext;
  });
  await page.route('**/assets/audio/**', (route) => route.fulfill({ status: 404, body: 'optional audio absent' }));
  await page.goto('/?mock=cycle&cycleMs=250&role=program&sfx=0.6&bgm=0&fx=low', { waitUntil: 'domcontentloaded' });
  const runtime = page.getByTestId('overlay-audio-runtime');
  await expect(page.locator('.overlay-fx-particle')).toHaveCount(0);
  await expect(page.locator('.overlay-fx-confetti')).toHaveCount(0);
  await expect(page.getByTestId('audio-unlock')).toHaveCount(0);
  await expect(page.getByText(/bấm để bật âm/i)).toHaveCount(0);
  await expect(runtime).toHaveAttribute('data-bgm', '0');
  await expect(runtime).toHaveAttribute('data-audio-state', 'running', { timeout: 10_000 });
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __audioProbe: { oscillatorStarts: number } }).__audioProbe.oscillatorStarts)).toBeGreaterThan(0);
  await page.screenshot({ path: join(c0166ReviewDirectory, 'no-audio-button-bottom-left.png'), clip: { x: 0, y: 1500, width: 440, height: 420 }, animations: 'disabled' });
  const resumePhases = await page.evaluate(() => (window as typeof window & { __audioProbe: { resumePhases: string[] } }).__audioProbe.resumePhases);
  expect(new Set(resumePhases).size).toBeGreaterThanOrEqual(2);
});

test('victory-tie labels the tie and orders podium slots by x coordinate', async ({ page }) => {
  const { errors } = await openScene(page, 'victory-tie', 'VICTORY');
  await expect(page.getByTestId('victory-background')).toHaveAttribute('src', '/assets/victory/bg-user-cover.jpg');
  await expect(page.getByTestId('victory-background')).toHaveCSS('object-fit', 'cover');
  await expect(page.getByTestId('victory-background')).toHaveCSS('filter', 'none');
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  await page.waitForTimeout(2_000);
  await expect(page.getByText('ĐỒNG HẠNG').first()).toBeVisible();
  await expect(page.getByTestId('podium-slot-2').locator('.v3v-player-name')).toHaveText('StormKing');
  const champion = page.getByTestId('podium-slot-1');
  await expect(champion.locator('.v3v-player-name')).toHaveText('FFVN.Kelly');
  const runnerUp = page.getByTestId('podium-slot-2');
  const third = page.getByTestId('podium-slot-3');
  await expect(champion).toHaveAttribute('data-rank', '1');
  await expect(runnerUp).toHaveAttribute('data-rank', '1');
  await expect(champion).toHaveAttribute('data-score', '1500');
  await expect(runnerUp).toHaveAttribute('data-score', '1500');
  await expect(champion.getByTestId('podium-rank')).toHaveText('TOP 1 · ĐỒNG HẠNG');
  await expect(runnerUp.getByTestId('podium-rank')).toHaveText('TOP 1 · ĐỒNG HẠNG');
  await expect(third).toHaveAttribute('data-rank', '3');
  await expect(third.getByTestId('podium-rank')).toHaveText('TOP 3');
  await expect(runnerUp.getByText('ĐỒNG HẠNG')).toBeVisible();
  const [firstNameplate, secondNameplate, firstColor, secondColor] = await Promise.all([
    champion.locator('.v3v-nameplate').boundingBox(), runnerUp.locator('.v3v-nameplate').boundingBox(),
    champion.locator('.v3v-nameplate').evaluate((el) => getComputedStyle(el).getPropertyValue('--rank-color').trim()),
    runnerUp.locator('.v3v-nameplate').evaluate((el) => getComputedStyle(el).getPropertyValue('--rank-color').trim()),
  ]);
  expect(firstNameplate?.y).toBe(secondNameplate?.y);
  expect(firstNameplate?.height).toBe(secondNameplate?.height);
  expect(firstColor).toBe(secondColor);
  const badge = champion.locator('[data-testid="top1-badge"]').first();
  const name = champion.locator('.v3v-player-name').first();
  await expect(badge).toHaveText('x3');
  await expect(badge).toBeVisible();
  const [nameTextBox, badgeBox] = await Promise.all([
    name.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rect = range.getBoundingClientRect();
      return { x: rect.x, width: rect.width };
    }),
    badge.boundingBox(),
  ]);
  expect(badgeBox).not.toBeNull();
  expect(nameTextBox.x + nameTextBox.width).toBeLessThanOrEqual(badgeBox!.x);
  const xCoordinates: number[] = [];
  for (const place of [2, 1, 3]) {
    const box = await page.getByTestId(`podium-slot-${place}`).boundingBox();
    expect(box, `podium slot ${place} has a bounding box`).not.toBeNull();
    xCoordinates.push(box!.x);
  }
  expect(xCoordinates[0]).toBeLessThan(xCoordinates[1]!);
  expect(xCoordinates[1]).toBeLessThan(xCoordinates[2]!);
  await page.screenshot({ path: join(screenshotDirectory, 'victory-tie-approved-layout.png'), animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('Victory keeps 16-character podium names readable at the same size in tied and regular plates', async ({ page }) => {
  const { errors } = await openScene(page, 'victory-name-test', 'VICTORY');
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  await page.waitForTimeout(2_000);

  const tiedName = page.getByTestId('podium-slot-1').locator('.v3v-player-name');
  const regularName = page.getByTestId('podium-slot-3').locator('.v3v-player-name').first();
  const truncatedName = page.getByTestId('podium-slot-3').locator('.v3v-player-name').nth(1);
  await expect(tiedName).toHaveText('BVD.Championship');
  await expect(regularName).toHaveText('BVD.Championship');
  const truncatedText = await truncatedName.innerText();
  await expect(truncatedName).toContainText('…');
  expect(Array.from(new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(truncatedText)).length).toBeLessThanOrEqual(16);
  const [tiedStyle, regularStyle, fits, truncatedMetrics, truncatedFontSize] = await Promise.all([
    tiedName.evaluate((element) => getComputedStyle(element).fontSize),
    regularName.evaluate((element) => getComputedStyle(element).fontSize),
    Promise.all([tiedName, regularName].map((locator) => locator.evaluate((element) => element.scrollWidth <= element.clientWidth))),
    truncatedName.evaluate((element) => ({
      widthFits: element.scrollWidth <= element.clientWidth,
      heightFits: element.scrollHeight <= element.clientHeight,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      fontSize: getComputedStyle(element).fontSize,
    })),
    truncatedName.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  ]);
  expect(tiedStyle).toBe(regularStyle);
  expect(fits).toEqual([true, true]);
  expect(truncatedMetrics.widthFits, JSON.stringify(truncatedMetrics)).toBe(true);
  expect(truncatedMetrics.heightFits, JSON.stringify(truncatedMetrics)).toBe(true);
  expect(truncatedFontSize).toBeGreaterThanOrEqual(22);
  expect(errors).toEqual([]);
});

test('question and Top 10 giữa vòng giữ nền C-0133, không dựng cờ rời', async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  const { stage } = await openScene(page, 'question', 'QUESTION');
  const flags = stage.locator('[data-testid^="arena-flag-"]');
  await expect(flags).toHaveCount(0);
  const background = stage.locator('.v3-arena-backdrop-image');
  await expect(background).toHaveAttribute('src', '/assets/arena/bg-question-user.jpg');
  await expect(background).toHaveCSS('object-fit', 'cover');
  await expect.poll(() => background.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBe(1080);
  await expect.poll(() => background.evaluate((image) => (image as HTMLImageElement).naturalHeight)).toBe(1920);
  await expect(stage.locator('.v3-question-banner-mask')).toHaveCount(0);
  const [boardBox, top10Box, bubbleBox] = await Promise.all([
    stage.locator('.v3-board').boundingBox(), stage.locator('.v3-top10').boundingBox(), stage.getByTestId('mc-bubble').boundingBox(),
  ]);
  expect(boardBox?.y).toBe(348);
  expect(top10Box?.y).toBe(348);
  expect(bubbleBox?.y).toBeGreaterThanOrEqual(boardBox!.y + boardBox!.height + 16);
  const plateBox = await stage.locator('[data-layer="kelly"] .v3-mc-plate').boundingBox();
  const nameTags = stage.locator('.v3-nametags .v3-seat-name');
  const speechBox = await stage.getByTestId('mc-bubble').boundingBox();
  expect(plateBox).not.toBeNull();
  expect(speechBox).not.toBeNull();
  for (let i = 0; i < await nameTags.count(); i += 1) {
    const tagBox = await nameTags.nth(i).boundingBox();
    if (!tagBox || !plateBox) continue;
    const overlaps = plateBox.x < tagBox.x + tagBox.width && plateBox.x + plateBox.width > tagBox.x && plateBox.y < tagBox.y + tagBox.height && plateBox.y + plateBox.height > tagBox.y;
    expect(overlaps, `MC plate overlaps audience name tag ${i + 1}`).toBe(false);
    const bubbleOverlaps = speechBox!.x < tagBox.x + tagBox.width && speechBox!.x + speechBox!.width > tagBox.x && speechBox!.y < tagBox.y + tagBox.height && speechBox!.y + speechBox!.height > tagBox.y;
    expect(bubbleOverlaps, `MC speech bubble overlaps audience name tag ${i + 1}`).toBe(false);
  }
  await page.screenshot({ path: join(screenshotDirectory, 'arena-question.png'), animations: 'disabled' });

  const top10 = await openScene(page, 'top10', 'INTERIM_TOP10');
  const panel = top10.stage.getByTestId('v3-top10-large');
  const panelBox = await panel.boundingBox();
  expect(panelBox?.height).toBeLessThanOrEqual(864);
  const top10Logo = top10.stage.getByTestId('brand-logo-frame');
  const top10LogoBox = await top10Logo.boundingBox();
  expect(top10LogoBox).not.toBeNull();
  expect(top10LogoBox!.width).toBeGreaterThanOrEqual(255);
  expect(top10LogoBox!.y + top10LogoBox!.height).toBeLessThan(panelBox!.y);
  await expect(top10.stage.getByTestId('top10-guide')).toBeVisible();
  await expect(top10.stage.locator('.v3-arena-backdrop-image')).toHaveAttribute('src', '/assets/arena/bg-question-user.jpg');
  const bubble = top10.stage.getByTestId('mc-bubble');
  await expect(bubble).toContainText('BXH trực tiếp');
  await expect(bubble).not.toContainText('comment A');
  const bubbleFont = await bubble.locator('p').evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(bubbleFont).toBeGreaterThanOrEqual(16);
  await expect(top10.stage.locator('[data-testid^="arena-flag-"]')).toHaveCount(0);
  await page.screenshot({ path: join(screenshotDirectory, 'arena-top10.png'), animations: 'disabled' });
});

test('Victory uses the selected background unchanged and keeps podium labels on adjustable anchors', async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto('/?mock=victory', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-testid="stage"][data-scene="VICTORY"]')).toBeVisible();
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  await page.waitForTimeout(8_100);

  const geometry = await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('[data-testid="stage"]')?.getBoundingClientRect();
    const scale = stage ? stage.height / 1920 : 1;
    const slots = [1, 2, 3].map((place) => {
      const slot = document.querySelector<HTMLElement>(`[data-testid="podium-slot-${place}"]`);
      const figure = slot?.querySelector<HTMLElement>('.v3v-figure')?.getBoundingClientRect();
      const image = slot?.querySelector<HTMLImageElement>('.v3v-figure img')?.getBoundingClientRect();
      const plateElement = slot?.querySelector<HTMLElement>('.v3v-nameplate');
      const plate = plateElement?.getBoundingClientRect();
      return {
        footY: stage && figure ? (figure.bottom - stage.top) / scale : 0,
        figureHeight: figure ? figure.height / scale : 0,
        imageHeight: image ? image.height / scale : 0,
        plateTop: stage && plate ? (plate.top - stage.top) / scale : 0,
        plateBottom: stage && plate ? (plate.bottom - stage.top) / scale : 0,
        plateLeft: stage && plate ? (plate.left - stage.left) / scale : 0,
        plateRight: stage && plate ? (plate.right - stage.left) / scale : 0,
        plateWidth: plate ? plate.width / scale : 0,
        plateReflection: plateElement ? getComputedStyle(plateElement).getPropertyValue('-webkit-box-reflect') : '',
        place,
        centerX: stage && slot ? ((slot.getBoundingClientRect().left + slot.getBoundingClientRect().width / 2) - stage.left) / scale : 0,
        plateText: slot?.querySelector<HTMLElement>('.v3v-nameplate')?.innerText ?? '',
      };
    });
    const background = document.querySelector<HTMLImageElement>('[data-testid="victory-background"]');
    const logoElement = document.querySelector<HTMLElement>('.v3v-event-logo, .v3v-logo-fallback .v3-title');
    let logo = logoElement?.getBoundingClientRect();
    if (logoElement instanceof HTMLImageElement && logoElement.complete && logoElement.naturalWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = logoElement.naturalWidth;
      canvas.height = logoElement.naturalHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(logoElement, 0, 0);
        const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
        let left = width; let top = height; let right = -1; let bottom = -1;
        for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
          if (data[(y * width + x) * 4 + 3]! < 64) continue;
          left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
        }
        if (right > left && bottom > top && logo) {
          const fit = getComputedStyle(logoElement).objectFit;
          const scaleX = logo.width / width;
          const scaleY = logo.height / height;
          const scale = fit === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
          const contentWidth = width * scale;
          const contentHeight = height * scale;
          const offsetX = logo.left + (logo.width - contentWidth) / 2;
          const offsetY = logo.top + (logo.height - contentHeight) / 2;
          logo = new DOMRect(offsetX + left * scale, offsetY + top * scale, (right - left) * scale, (bottom - top) * scale);
        }
      }
    }
    const logoWidthRatio = stage && logo ? logo.width / stage.width : 0;
    const logoHeightRatio = stage && logo ? logo.height / stage.height : 0;
    const logoLeftRatio = stage && logo ? (logo.left - stage.left) / stage.width : 0;
    const logoRightRatio = stage && logo ? (logo.right - stage.left) / stage.width : 0;
    const logoTopRatio = stage && logo ? (logo.top - stage.top) / stage.height : 0;
    return { slots, logoTopRatio, logoLeftRatio, logoRightRatio, logoWidthRatio, logoHeightRatio, background: background ? {
      src: new URL(background.currentSrc || background.src).pathname,
      naturalWidth: background.naturalWidth,
      naturalHeight: background.naturalHeight,
      filter: getComputedStyle(background).filter,
      objectFit: getComputedStyle(background).objectFit,
    } : null };
  });
  expect(geometry.slots).toHaveLength(3);
  for (const slot of geometry.slots) {
    const center = slot.place === 1;
    const expectedCenterX = 1080 * (slot.place === 1 ? 0.5 : slot.place === 2 ? 0.18 : 0.82);
    expect(Math.abs(slot.centerX - expectedCenterX)).toBeLessThanOrEqual(5);
    expect(slot.footY).toBeGreaterThanOrEqual(1195);
    expect(slot.footY).toBeLessThanOrEqual(1205);
    expect(slot.figureHeight).toBeGreaterThanOrEqual(center ? 515 : 415);
    expect(slot.figureHeight).toBeLessThanOrEqual(center ? 525 : 425);
    expect(slot.imageHeight).toBeGreaterThanOrEqual(slot.figureHeight - 2);
    expect(slot.imageHeight).toBeLessThanOrEqual(slot.figureHeight * 1.3);
    expect(slot.plateTop).toBeGreaterThanOrEqual(1200);
    expect(slot.plateTop).toBeLessThanOrEqual(1225);
    expect(slot.plateBottom).toBeLessThanOrEqual(1420);
    expect(slot.plateLeft).toBeGreaterThanOrEqual(0);
    expect(slot.plateRight).toBeLessThanOrEqual(1080);
    expect(slot.plateWidth).toBe(slot.place === 1 ? 340 : 280);
    expect(slot.plateText).toContain('PTS');
    expect(slot.plateReflection).toBe('none');
  }
  expect(geometry.background?.src).toBe('/assets/victory/bg-user-cover.jpg');
  expect(geometry.background?.filter).toBe('none');
  expect(geometry.background?.objectFit).toBe('cover');
  if (hasLocalVictoryBackground) expect([geometry.background?.naturalWidth, geometry.background?.naturalHeight]).toEqual([1080, 1920]);
  await expect(page.locator('.v3v .v3-mc-portrait')).toHaveCount(0);
  await expect(page.locator('.v3v-medal')).toHaveCount(0);
  await expect(page.locator('.v3v-score-reflection, .v3v-nameplate-reflection')).toHaveCount(0);
  await expect(page.locator('.v3v-trophy, .v3v-trophy-stage, .v3v-bg-dim, .v3v-fan-lights, .v3v-side-lightning')).toHaveCount(0);
  expect(geometry.logoWidthRatio).toBeGreaterThanOrEqual(0.339);
  expect(geometry.logoWidthRatio).toBeLessThanOrEqual(0.35);
  expect(geometry.logoLeftRatio).toBeGreaterThanOrEqual(0.25);
  expect(geometry.logoRightRatio).toBeLessThanOrEqual(0.75);
  expect(geometry.logoTopRatio).toBeGreaterThanOrEqual(0.014);
  expect(geometry.logoTopRatio + geometry.logoHeightRatio).toBeLessThanOrEqual(0.22);
  // Đỉnh cúp trong background Victory C-0131 đã duyệt nằm tại y≈24.2%; đo đáy logo theo alpha bbox.
  expect(0.242 - (geometry.logoTopRatio + geometry.logoHeightRatio)).toBeGreaterThanOrEqual(0.02);
  await expect(page.locator('.v3v-header')).not.toContainText('VINH DANH TOP 3');
  await page.screenshot({ path: join(screenshotDirectory, 'victory-approved-layout.png'), animations: 'disabled' });
  expect(errors).toEqual([]);
});
