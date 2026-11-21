import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import type { PublicSnapshot } from '@quiz/contracts';
import { DEMO_QUESTIONS } from '../../fixtures/questions';
import { makeMockSnapshot } from '../../apps/overlay/src/mock/snapshots';

const approvedQuestions = DEMO_QUESTIONS.filter((question) => question.approvalStatus === 'APPROVED');
const screenshotDirectory = resolve(process.cwd(), 'assets-local', 'review', 'c-sau-live-ui');
const optionIds = ['A', 'B', 'C', 'D'] as const;

test('C-0383 B — mọi câu APPROVED trong fixtures được căn giữa dọc, đủ lề và không tràn', async ({ page }) => {
  mkdirSync(screenshotDirectory, { recursive: true });
  expect(approvedQuestions.length).toBeGreaterThan(0);
  const shortest = [...approvedQuestions].sort((left, right) => Array.from(left.prompt).length - Array.from(right.prompt).length)[0]!;
  const longest = [...approvedQuestions].sort((left, right) => Array.from(right.prompt).length - Array.from(left.prompt).length)[0]!;
  const screenshotIds = new Set(['demo-004', shortest.id, longest.id]);
  const base = makeMockSnapshot('question-longest');
  expect(base?.question).toBeTruthy();

  let stateVersion = 1;
  const snapshotFor = (question: typeof approvedQuestions[number]): PublicSnapshot => ({
    ...base!,
    stateVersion: stateVersion++,
    question: {
      ...base!.question!,
      questionInstanceId: question.id,
      prompt: question.prompt,
      optionsVisible: true,
      isDemo: false,
      options: question.options.map((option, index) => ({ id: optionIds[index]!, text: option.text })),
    },
    reveal: null,
  } as PublicSnapshot);
  let nextSnapshot: PublicSnapshot | null = snapshotFor(approvedQuestions[0]!);
  const publisher: { current?: (snapshot: PublicSnapshot) => void } = {};
  await page.routeWebSocket('/ws', (socket) => {
    socket.onMessage((raw) => {
      const message = JSON.parse(String(raw)) as { type?: string };
      if (message.type === 'HELLO' && nextSnapshot) publisher.current?.(nextSnapshot);
    });
    publisher.current = (snapshot) => socket.send(JSON.stringify({
      v: 1,
      type: 'STATE_SNAPSHOT',
      seq: snapshot.stateVersion,
      sessionId: snapshot.sessionId,
      stateVersion: snapshot.stateVersion,
      serverTimeMs: Date.now(),
      payload: snapshot,
    }));
  });
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto('/?role=program', { waitUntil: 'domcontentloaded' });
  const stage = page.locator('[data-testid="stage"][data-scene="QUESTION"]');
  await expect(stage).toBeVisible();
  const frame = page.getByTestId('question-prompt');

  for (const question of approvedQuestions) {
    const questionSnapshot: PublicSnapshot = question.id === approvedQuestions[0]!.id ? nextSnapshot! : snapshotFor(question);
    nextSnapshot = questionSnapshot;
    publisher.current?.(questionSnapshot);
    await page.waitForFunction((prompt) => {
      const element = document.querySelector<HTMLElement>('[data-testid="question-prompt"]');
      return element?.getAttribute('title') === prompt && element.style.fontSize !== '';
    }, question.prompt);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
    const metrics = await frame.evaluate((element) => {
      const copy = element.querySelector<HTMLElement>('[data-testid="question-prompt-copy"]');
      const walker = document.createTreeWalker(copy ?? element, NodeFilter.SHOW_TEXT);
      const textRects: DOMRect[] = [];
      let textNode = walker.nextNode();
      while (textNode) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        textRects.push(...[...range.getClientRects()].filter((rect) => rect.width > 0.5 && rect.height > 0.5));
        textNode = walker.nextNode();
      }
      const frameRect = element.getBoundingClientRect();
      return {
        fontPx: Number.parseFloat(getComputedStyle(element).fontSize),
        topGapPx: Math.min(...textRects.map((rect) => rect.top)) - frameRect.top,
        bottomGapPx: frameRect.bottom - Math.max(...textRects.map((rect) => rect.bottom)),
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        truncated: element.dataset.promptTruncated,
      };
    });
    const label = `${question.id}: ${question.prompt}`;
    expect(metrics.fontPx, `${label} keeps the 24px floor`).toBeGreaterThanOrEqual(24);
    expect(metrics.topGapPx, `${label} has at least 8px above`).toBeGreaterThanOrEqual(8);
    expect(metrics.bottomGapPx, `${label} has at least 8px below`).toBeGreaterThanOrEqual(8);
    expect(Math.abs(metrics.topGapPx - metrics.bottomGapPx), `${label} is vertically centered within 4px (top=${metrics.topGapPx.toFixed(1)}, bottom=${metrics.bottomGapPx.toFixed(1)})`).toBeLessThanOrEqual(4);
    expect(metrics.scrollHeight, `${label} does not overflow`).toBeLessThanOrEqual(metrics.clientHeight);
    expect(metrics.truncated, `${label} remains complete`).toBe('false');

    if (screenshotIds.has(question.id)) {
      await page.screenshot({ path: resolve(screenshotDirectory, `B-question-${question.id}-full.png`), animations: 'disabled' });
      await frame.screenshot({ path: resolve(screenshotDirectory, `B-question-${question.id}-close-up.png`), animations: 'disabled' });
      console.info(`C-0383 B ${question.id}: font=${metrics.fontPx}px, top=${metrics.topGapPx.toFixed(1)}px, bottom=${metrics.bottomGapPx.toFixed(1)}px, overflow=${metrics.scrollHeight <= metrics.clientHeight ? 'no' : 'yes'}`);
    }
  }
});
