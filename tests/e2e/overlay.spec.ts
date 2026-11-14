import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { getE2eAssetDirectory } from './assets';
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

const screenshotDirectory = join(process.cwd(), 'test-results', 'e2e', 'screenshots');
mkdirSync(screenshotDirectory, { recursive: true });
const c0166ReviewDirectory = join(process.cwd(), 'assets-local', 'review', 'c0166');
mkdirSync(c0166ReviewDirectory, { recursive: true });
const localAssetDirectory = getE2eAssetDirectory();
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

async function openScene(page: Page, sceneName: string, expectedScene: string) {
  const errors = watchPageErrors(page);
  const query = new URLSearchParams({ mock: sceneName });
  await page.goto(`/?${query.toString()}`, { waitUntil: 'domcontentloaded' });
  const stage = page.locator(`[data-testid="stage"][data-scene="${expectedScene}"]`);
  await expect(stage).toBeVisible();
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  return { stage, errors };
}

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
  await expect(viewport).toHaveAttribute('data-fit', 'cover');
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
  const eventMark = stage.getByTestId('event-mark');
  const roundCard = stage.getByTestId('round-card');
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('src', '/assets/brand/logo.png');
  await expect(eventMark).toBeVisible();
  await expect(roundCard).toContainText('VÒNG 1');
  await expect(roundCard).toContainText('57 ĐANG CHƠI');
  const [logoBox, eventBox, roundBox, boardBox, subtitleBox] = await Promise.all([
    logo.boundingBox(), eventMark.boundingBox(), roundCard.boundingBox(), stage.locator('.v3-board').boundingBox(), stage.locator('.v3-title-ribbon').boundingBox(),
  ]);
  expect(logoBox).not.toBeNull();
  expect(eventBox).not.toBeNull();
  expect(roundBox).not.toBeNull();
  expect(logoBox!.width).toBeGreaterThanOrEqual(210);
  expect(logoBox!.width).toBeLessThanOrEqual(240);
  expect(logoBox!.y + logoBox!.height).toBeLessThan(270);
  expect(eventBox!.x + eventBox!.width).toBeLessThan(logoBox!.x);
  expect(logoBox!.x + logoBox!.width).toBeLessThan(roundBox!.x);
  expect(boardBox).not.toBeNull();
  expect(subtitleBox).not.toBeNull();
  expect(logoBox!.y + logoBox!.height).toBeLessThan(subtitleBox!.y);
  expect(subtitleBox!.y + subtitleBox!.height).toBeLessThan(boardBox!.y);
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

test('reveal marks exactly one correct option', async ({ page }) => {
  const { errors } = await openScene(page, 'reveal', 'REVEAL');
  const correctOptions = page.locator('[data-testid^="option-"].is-correct');
  await expect(correctOptions).toHaveCount(1);
  await expect(correctOptions).toHaveAttribute('data-testid', 'option-B');
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
    const displayedPrompt = await stage.getByTestId('question-prompt').innerText();
    const displayedAnswer = await stage.getByTestId('option-B').locator('.v3-option-text').innerText();
    if (scene === 'REVEAL') await expect(stage.getByTestId('option-B')).toHaveClass(/is-correct/);
    for (const [label, fullText, displayedText, max] of [
      ['question', fullPrompt, displayedPrompt, 160],
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

test('Top 10 đủ 10 hàng nằm trên tóc MC ở sảnh và bốn pha câu hỏi', async ({ page }) => {
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

    const textOverlapsMc = nameBox.x < mcBox.x + mcBox.width
      && nameBox.x + nameBox.width > mcBox.x
      && nameBox.y < mcBox.y + mcBox.height
      && nameBox.y + nameBox.height > mcBox.y;
    if (!textOverlapsMc) stackingIssues.push(`${name}: tenth-row name does not reach the overlapping MC image area`);
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
        mcPlate: box('.v3-mc-plate'), logo: box('[data-testid="brand-logo"]'),
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
      const approvedBottom = region === 'top10' ? 811 : 815;
      expect(box, `${name}: ${region} exists`).not.toBeNull();
      expect(Math.abs(box!.y - 345), `${name}: ${region} starts at the approved y=345`).toBeLessThanOrEqual(2);
      expect(Math.abs(box!.y + box!.height - approvedBottom), `${name}: ${region} ends at the approved y=${approvedBottom}`).toBeLessThanOrEqual(2);
    }
    expect(geometry.mcFrame, `${name}: MC has the approved frame`).not.toBeNull();
    expect(Math.abs(geometry.mcFrame!.width - 280), `${name}: MC frame is 280px wide`).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.mcFrame!.height - 390), `${name}: MC frame is 390px tall`).toBeLessThanOrEqual(2);
    expect(geometry.bubble, `${name}: fixed speech bubble exists`).not.toBeNull();
    expect(Math.abs(geometry.bubble!.x - 410), `${name}: bubble x matches C-0133`).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.bubble!.y - 844), `${name}: bubble y matches C-0133`).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.bubble!.width - 568), `${name}: bubble width matches the approved C-0133 review`).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.bubble!.height - 220), `${name}: bubble height matches C-0133`).toBeLessThanOrEqual(2);
    expect(geometry.promptFits, `${name}: prompt fits without enlarging its card`).toBe(true);
    expect(geometry.mcFigure, `${name}: Kelly has a visible fixed portrait frame`).not.toBeNull();
    expect(geometry.mcPlate, `${name}: Kelly nameplate has a fixed position`).not.toBeNull();
    expect(geometry.mcPlate!.y, `${name}: Kelly nameplate sits below the half-body crop`).toBeGreaterThanOrEqual(geometry.mc!.y + geometry.mcFigure!.y + geometry.mcFigure!.height);
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
  const [figureBox, bubbleBox] = await Promise.all([guide.locator('.v3-mc-figure').boundingBox(), guide.getByTestId('mc-bubble').boundingBox()]);
  expect(figureBox).not.toBeNull();
  expect(bubbleBox).not.toBeNull();
  expect(bubbleBox!.y).toBeGreaterThanOrEqual(figureBox!.y + figureBox!.height - 2);
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
    imageHeight: image.offsetHeight,
    overflow: image.parentElement ? getComputedStyle(image.parentElement).overflow : '',
  }));
  expect(mcCrop.overflow).toBe('hidden');
  expect(mcCrop.parentHeight).toBe(390);
  expect(mcCrop.imageHeight).toBe(mcCrop.parentHeight);
  expect(await kelly.evaluate((image) => getComputedStyle(image).objectFit)).toBe('cover');
  expect(await kelly.evaluate((image) => getComputedStyle(image).objectPosition)).toBe('50% 0%');

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
  expect(top10Box!.x).toBeGreaterThanOrEqual(97);
  expect(top10Box!.x + top10Box!.width).toBeLessThan(boardBox!.x);
  expect(boardBox!.x + boardBox!.width).toBeLessThanOrEqual(983);
  expect(mcBox!.y).toBeGreaterThanOrEqual(752);

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
  const queueBox = await queue.boundingBox();
  expect(queueBox).not.toBeNull();
  expect(queueBox!.x).toBeGreaterThanOrEqual(97);
  expect(queueBox!.x + queueBox!.width).toBeLessThanOrEqual(983);
  const audienceOverlapsQueue = await page.evaluate(() => {
    const queue = document.querySelector<HTMLElement>('.v3-queue');
    if (!queue) return ['queue badge is missing'];
    const q = queue.getBoundingClientRect();
    const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    return Array.from(document.querySelectorAll<HTMLElement>('.v3-seat-name, .v3-seat-back'))
      .flatMap((element, index) => intersects(q, element.getBoundingClientRect()) ? [`audience item ${index}`] : []);
  });
  expect(audienceOverlapsQueue, 'queue count stays clear of seats and name tags').toEqual([]);

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

test('question and Top 10 stay below the 14 percent TikTok top safe zone', async ({ page }) => {
  await openScene(page, 'question', 'QUESTION');
  for (const selector of ['.v3-top10', '.v3-board', '.v3-timer']) {
    const box = await page.locator(selector).boundingBox();
    expect(box, `${selector} has a measurable position`).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(268.8);
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
  const logoBox = await page.getByTestId('brand-logo').boundingBox();
  expect(stageBox).not.toBeNull();
  expect(logoBox).not.toBeNull();
  expect(logoBox!.width / stageBox!.width).toBeGreaterThanOrEqual(0.19);
  expect(logoBox!.width / stageBox!.width).toBeLessThanOrEqual(0.22);

  const overlap = await page.evaluate(() => {
    const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const box = (selector: string) => document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
    const eventBanner = box('.tiktok-hud-event-banner');
    const timerText = box('.v3-timer b');
    const comments = box('.tiktok-hud-comments');
    const important = Array.from(document.querySelectorAll<HTMLElement>('.v3-top10, .v3-board, .v3-mc'))
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
  await expect(bubble).toContainText('để tham gia ngay!');
  expect(await bubble.evaluate((element) => getComputedStyle(element, '::before').content)).not.toBe('none');
  expect(await bubble.locator('p').evaluate((element) => getComputedStyle(element).whiteSpace)).toBe('pre-line');
  const instructionBox = await bubble.boundingBox();
  const boardBox = await page.locator('.v3-board').boundingBox();
  expect(instructionBox).not.toBeNull();
  expect(boardBox).not.toBeNull();
  const instructionCenterX = instructionBox!.x + instructionBox!.width / 2;
  const boardCenterX = boardBox!.x + boardBox!.width / 2;
  expect(Math.abs(instructionCenterX - boardCenterX)).toBeLessThanOrEqual(8);
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
  for (const selector of ['.v3-top10', '.v3-board', '.v3-timer', '.v3-question', '[data-testid="option-A"]']) {
    const box = await page.locator(selector).boundingBox();
    expect(box, `${selector} stays visible after phone side crop`).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-2);
    expect(box!.x + box!.width).toBeLessThanOrEqual(923);
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
  const seatEffects = await page.locator('.v3-seat-back, .v3-seat-name, .v3-chibi-hair, .v3-chibi-img img').evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return { boxShadow: style.boxShadow, filter: style.filter, animationCount: style.animationIterationCount };
  }));
  expect(seatEffects).toHaveLength(35 * 3);
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
  await page.addInitScript(() => {
    const testWindow = window as typeof window & { __audioProbe?: { contexts: number; oscillatorStarts: number; bufferStarts: number } };
    testWindow.__audioProbe = { contexts: 0, oscillatorStarts: 0, bufferStarts: 0 };
    const param = () => ({ value: 0, setTargetAtTime() {}, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
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
  await page.goto('/?mock=cycle&cycleMs=250&sfx=0.6&bgm=0&fx=low', { waitUntil: 'domcontentloaded' });
  const runtime = page.getByTestId('overlay-audio-runtime');
  await expect(runtime).toHaveAttribute('data-audio-state', 'running');
  await expect(runtime).toHaveAttribute('data-bgm', '0');
  await expect(page.getByTestId('stage')).toHaveAttribute('data-fx-level', 'low');
  await expect(page.locator('.overlay-fx-particle')).toHaveCount(4);
  await expect.poll(() => runtime.getAttribute('data-cues')).toContain('question-enter');
  await expect(page.getByTestId('stage')).toHaveAttribute('data-state', 'READING');
  await expect(runtime).toHaveAttribute('data-cues', 'question-enter');
  await expect.poll(() => runtime.getAttribute('data-cues')).toContain('correct-answer');
  await expect.poll(() => runtime.getAttribute('data-cues')).toContain('top10');
  await expect.poll(() => runtime.getAttribute('data-cues')).toContain('victory');
  const cues = (await runtime.getAttribute('data-cues'))?.split(',') ?? [];
  for (const cue of ['question-enter', 'correct-answer', 'top10', 'victory'])
    expect(cues.filter((value) => value === cue)).toHaveLength(1);
  const probe = await page.evaluate(() => (window as typeof window & { __audioProbe: { contexts: number; oscillatorStarts: number; bufferStarts: number } }).__audioProbe);
  expect(probe.contexts).toBe(1);
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __audioProbe: { bufferStarts: number } }).__audioProbe.bufferStarts)).toBe(2);
  expect(probe.oscillatorStarts).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('audio retries silently at phase changes without an unlock hint in any overlay role', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const testWindow = window as typeof window & { __audioProbe?: { resumePhases: string[]; oscillatorStarts: number } };
    testWindow.__audioProbe = { resumePhases: [], oscillatorStarts: 0 };
    const param = () => ({ value: 0, setTargetAtTime() {}, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
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
  for (const role of ['', '&role=program', '&source=1']) {
    await page.goto(`/?mock=cycle&cycleMs=250&sfx=0.6&bgm=0&fx=low${role}`, { waitUntil: 'domcontentloaded' });
    const runtime = page.getByTestId('overlay-audio-runtime');
    await expect(page.locator('.overlay-fx-particle')).toHaveCount(0);
    await expect(page.locator('.overlay-fx-confetti')).toHaveCount(0);
    await expect(page.getByTestId('audio-unlock')).toHaveCount(0);
    await expect(page.getByText(/bấm để bật âm/i)).toHaveCount(0);
    await expect(runtime).toHaveAttribute('data-bgm', '0');
    await expect(runtime).toHaveAttribute('data-audio-state', 'running', { timeout: 10_000 });
    await expect.poll(() => page.evaluate(() => (window as typeof window & { __audioProbe: { oscillatorStarts: number } }).__audioProbe.oscillatorStarts)).toBeGreaterThan(0);
    if (role === '')
      await page.screenshot({ path: join(c0166ReviewDirectory, 'no-audio-button-bottom-left.png'), clip: { x: 0, y: 1500, width: 440, height: 420 }, animations: 'disabled' });
    const resumePhases = await page.evaluate(() => (window as typeof window & { __audioProbe: { resumePhases: string[] } }).__audioProbe.resumePhases);
    expect(new Set(resumePhases).size).toBeGreaterThanOrEqual(2);
  }
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
  await expect(champion.getByTestId('podium-rank')).toHaveText('TOP 1');
  await expect(runnerUp.getByTestId('podium-rank')).toHaveText('TOP 1');
  await expect(third).toHaveAttribute('data-rank', '3');
  await expect(third.getByTestId('podium-rank')).toHaveText('TOP 3');
  await expect(runnerUp.getByText('ĐỒNG HẠNG')).toBeVisible();
  const [firstSlotBox, secondSlotBox, firstNameplate, secondNameplate, firstColor, secondColor] = await Promise.all([
    champion.boundingBox(), runnerUp.boundingBox(),
    champion.locator('.v3v-nameplate').boundingBox(), runnerUp.locator('.v3v-nameplate').boundingBox(),
    champion.locator('.v3v-nameplate').evaluate((el) => getComputedStyle(el).getPropertyValue('--rank-color').trim()),
    runnerUp.locator('.v3v-nameplate').evaluate((el) => getComputedStyle(el).getPropertyValue('--rank-color').trim()),
  ]);
  expect(firstSlotBox?.y).toBe(secondSlotBox?.y);
  expect(firstNameplate?.y).toBe(secondNameplate?.y);
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
    })),
    truncatedName.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  ]);
  expect(tiedStyle).toBe(regularStyle);
  expect(fits).toEqual([true, true]);
  expect(truncatedMetrics.widthFits).toBe(true);
  expect(truncatedMetrics.heightFits).toBe(true);
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
  const plateBox = await stage.locator('[data-layer="kelly"] .v3-mc-plate').boundingBox();
  expect(plateBox).not.toBeNull();
  const nameTags = stage.locator('.v3-nametags .v3-seat-name');
  for (let i = 0; i < await nameTags.count(); i += 1) {
    const tagBox = await nameTags.nth(i).boundingBox();
    if (!tagBox || !plateBox) continue;
    const overlaps = plateBox.x < tagBox.x + tagBox.width && plateBox.x + plateBox.width > tagBox.x && plateBox.y < tagBox.y + tagBox.height && plateBox.y + plateBox.height > tagBox.y;
    expect(overlaps, `MC plate overlaps audience name tag ${i + 1}`).toBe(false);
  }
  await page.screenshot({ path: join(screenshotDirectory, 'arena-question.png'), animations: 'disabled' });

  const top10 = await openScene(page, 'top10', 'INTERIM_TOP10');
  const panel = top10.stage.getByTestId('v3-top10-large');
  const panelBox = await panel.boundingBox();
  expect(panelBox?.height).toBeLessThanOrEqual(864);
  const top10Logo = top10.stage.getByTestId('brand-logo');
  const top10LogoBox = await top10Logo.boundingBox();
  expect(top10LogoBox).not.toBeNull();
  expect(top10LogoBox!.width).toBeGreaterThanOrEqual(432);
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
    expect(slot.centerX).toBeGreaterThanOrEqual(center ? 536 : slot.place === 2 ? 152 : 918);
    expect(slot.centerX).toBeLessThanOrEqual(center ? 544 : slot.place === 2 ? 162 : 928);
    expect(slot.footY).toBeGreaterThanOrEqual(1195);
    expect(slot.footY).toBeLessThanOrEqual(1205);
    expect(slot.figureHeight).toBeGreaterThanOrEqual(375);
    expect(slot.figureHeight).toBeLessThanOrEqual(390);
    expect(slot.imageHeight).toBeGreaterThanOrEqual(375);
    expect(slot.imageHeight).toBeLessThanOrEqual(415);
    expect(slot.plateTop).toBeGreaterThanOrEqual(1200);
    expect(slot.plateTop).toBeLessThanOrEqual(1225);
    expect(slot.plateBottom).toBeLessThanOrEqual(1345);
    expect(slot.plateLeft).toBeGreaterThanOrEqual(0);
    expect(slot.plateRight).toBeLessThanOrEqual(1080);
    expect(slot.plateWidth).toBe(slot.place === 1 ? 320 : 280);
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
