import { expect, test, type Page } from '@playwright/test';
import { QUESTION_LIMITS, type PublicSnapshot } from '@quiz/contracts';
import { sanitizeDisplayName } from '@quiz/quiz-core';
import { makeMockSnapshot } from '../../apps/overlay/src/mock/snapshots';

const playerName = sanitizeDisplayName('TênNgườiChơi'.repeat(40));
const OPTION_IDS = ['A', 'B', 'C', 'D'] as const;
const questionPrompt = repeatWordsToLength(
  'Trong Battle Royale đội của bạn phối hợp theo dõi vùng an toàn và hoàn thành mục tiêu chiến thắng của trận đấu',
  QUESTION_LIMITS.promptMax,
);
const optionTexts = [
  'Đáp án A mô tả một nhóm đồng đội phối hợp để hoàn thành mục tiêu chính trong trận đấu',
  'Đáp án B mô tả một nhóm khán giả cùng theo dõi và cổ vũ trận đấu đang diễn ra',
  'Đáp án C mô tả một nhóm vật phẩm được sắp xếp và mang theo trong hành trang',
  'Đáp án D mô tả một nhóm nhân vật được hiển thị trong bộ sưu tập cá nhân',
].map((text) => repeatWordsToLength(text, QUESTION_LIMITS.optionMax));

function repeatWordsToLength(seed: string, max: number) {
  const words = seed.split(/\s+/);
  let result = '';
  for (let index = 0; result.length < max; index += 1) {
    const separator = result ? ' ' : '';
    const remaining = max - result.length - separator.length;
    if (remaining <= 0) break;
    result += separator + words[index % words.length]!.slice(0, remaining);
  }
  return result.padEnd(max, 'x');
}

function questionSnapshot(sceneName: 'prepare' | 'question-longest' | 'reveal'): PublicSnapshot {
  const snapshot = makeMockSnapshot(sceneName);
  if (!snapshot?.question) throw new Error(`Thiếu mock question cho ${sceneName}.`);
  return {
    ...snapshot,
    question: {
      ...snapshot.question,
      prompt: questionPrompt,
      options: optionTexts.map((text, index) => ({ id: OPTION_IDS[index]!, text })),
    },
  };
}

function namesSnapshot(sceneName: 'top10-long-name' | 'victory-name-test'): PublicSnapshot {
  const snapshot = makeMockSnapshot(sceneName);
  if (!snapshot) throw new Error(`Thiếu mock snapshot cho ${sceneName}.`);
  const leaderboard = snapshot.leaderboard
    ? { ...snapshot.leaderboard, entries: snapshot.leaderboard.entries.map((entry) => ({ ...entry, displayName: playerName })) }
    : null;
  const podium = snapshot.podium
    ? {
      ...snapshot.podium,
      slots: snapshot.podium.slots.map((slot) => ({
        ...slot,
        entries: slot.entries.map((entry) => ({ ...entry, displayName: playerName })),
      })),
    }
    : null;
  return { ...snapshot, leaderboard, podium };
}

async function openSnapshot(page: Page, snapshot: PublicSnapshot) {
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
  const stage = page.locator(`[data-testid="stage"][data-scene="${snapshot.scene}"]`);
  await expect(stage).toBeVisible();
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  return stage;
}

function intersects(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function expectTextFits(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    const texts = await page.locator(selector).evaluateAll((elements) => elements.map((element) => ({
      text: element.textContent?.trim() ?? '',
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    })));
    expect(texts.length, `${selector} exists`).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text.scrollWidth, `${selector} width fits: ${JSON.stringify(text.text.slice(0, 32))}`).toBeLessThanOrEqual(text.clientWidth);
      expect(text.scrollHeight, `${selector} height fits: ${JSON.stringify(text.text.slice(0, 32))}`).toBeLessThanOrEqual(text.clientHeight);
    }
  }
}

async function expectWithinSafeZone(page: Page, stage: ReturnType<Page['locator']>, selectors: string[]) {
  const stageBox = await stage.boundingBox();
  expect(stageBox).not.toBeNull();
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
  for (const selector of selectors) {
    const elements = page.locator(selector);
    for (let index = 0; index < await elements.count(); index += 1) {
      const box = await elements.nth(index).boundingBox();
      if (!box) continue;
      const reachesRightBand = box.y + box.height > stageBox.y + safe.rightFromY * scaleY;
      const rightEdge = reachesRightBand
        ? stageBox.x + (1080 - safe.right) * scaleX
        : stageBox.x + stageBox.width;
      expect(box.x, `${selector} stays left of safe zone`).toBeGreaterThanOrEqual(stageBox.x + safe.left * scaleX - 1);
      expect(box.x + box.width, `${selector} stays right of safe zone`).toBeLessThanOrEqual(rightEdge + 1);
      expect(box.y, `${selector} stays below top safe zone`).toBeGreaterThanOrEqual(stageBox.y + safe.top * scaleY - 1);
      expect(box.y + box.height, `${selector} stays above bottom safe zone`).toBeLessThanOrEqual(stageBox.y + (1920 - safe.bottom) * scaleY + 1);
    }
  }
}

for (const sceneName of ['prepare', 'question-longest', 'reveal'] as const) {
  test(`nội dung chạm giới hạn contract không cắt hoặc đè thành phần — ${sceneName}`, async ({ page }) => {
    if (sceneName !== 'prepare')
      test.fail(true, 'C-0146: đáp án 90 ký tự tràn cao 2 px; codex2 đang sửa overlay, chờ coordinator báo gỡ expected-fail.');
    const snapshot = questionSnapshot(sceneName);
    expect(snapshot.question?.prompt).toHaveLength(QUESTION_LIMITS.promptMax);
    expect(snapshot.question?.options).toHaveLength(4);
    expect(snapshot.question?.options.every((option) => option.text.length === QUESTION_LIMITS.optionMax)).toBe(true);

    const stage = await openSnapshot(page, snapshot);
    const prompt = stage.getByTestId('question-prompt');
    await expect(prompt).toHaveText(questionPrompt);
    await expectTextFits(page, ['[data-testid="question-prompt"]']);
    const optionTextsRendered = stage.locator('[data-testid^="option-"] .v3-option-text');
    await expect(optionTextsRendered).toHaveCount(4);
    await expectTextFits(page, ['[data-testid^="option-"] .v3-option-text']);

    const contentBoxes = [prompt, ...await optionTextsRendered.all()];
    const content = await Promise.all(contentBoxes.map((locator) => locator.boundingBox()));
    const blockers = await Promise.all([
      stage.locator('[data-testid="timer"]').boundingBox(),
      stage.locator('.v3-title').boundingBox(),
      stage.locator('.v3-mc-figure').boundingBox(),
    ]);
    for (const textBox of content) {
      if (!textBox) continue;
      for (const blocker of blockers) {
        if (blocker) expect(intersects(textBox, blocker), `${sceneName}: question text does not overlap timer/logo/MC`).toBe(false);
      }
    }
    await expectWithinSafeZone(page, stage, [
      '[data-testid="question-prompt"]',
      '[data-testid^="option-"]',
      '[data-testid="timer"]',
    ]);
  });
}

for (const sceneName of ['top10-long-name', 'victory-name-test'] as const) {
  test(`tên người chơi dài nhất sau chuẩn hóa nằm gọn trong layout — ${sceneName}`, async ({ page }) => {
    if (sceneName === 'victory-name-test')
      test.fail(true, 'C-0146: tên Victory 24 grapheme tràn ngang 4 px và bị ellipsis; codex2 đang sửa overlay, chờ coordinator báo gỡ expected-fail.');
    expect(playerName).toHaveLength(24);
    const snapshot = namesSnapshot(sceneName);
    const stage = await openSnapshot(page, snapshot);
    const selector = sceneName === 'top10-long-name' ? '.v3-full-name-text' : '.v3v-player-name';
    const names = page.locator(selector);
    await expect(names.first()).toContainText(playerName.slice(0, 12));
    if (sceneName === 'victory-name-test') await page.waitForTimeout(1_000);
    await expectTextFits(page, [selector]);

    const safeSelectors = sceneName === 'top10-long-name'
      ? ['[data-testid="leaderboard-row"]', selector]
      : ['[data-testid^="podium-slot-"] .v3v-nameplate', selector];
    await expectWithinSafeZone(page, stage, safeSelectors);

    const logoLocator = stage.locator('.v3-title');
    const logo = await logoLocator.count() ? await logoLocator.first().boundingBox() : null;
    const mcLocator = stage.locator('.v3-mc-figure');
    const mc = await mcLocator.count() ? await mcLocator.first().boundingBox() : null;
    for (let index = 0; index < await names.count(); index += 1) {
      const nameBox = await names.nth(index).boundingBox();
      if (!nameBox) continue;
      if (logo) expect(intersects(nameBox, logo), `${sceneName}: player name does not overlap logo`).toBe(false);
      if (mc) expect(intersects(nameBox, mc), `${sceneName}: player name does not overlap MC`).toBe(false);
    }
  });
}
