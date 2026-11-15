import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { DEFAULT_HUD_CONFIG, type PublicSnapshot } from '@quiz/contracts';
import { makeMockSnapshot } from '../../apps/overlay/src/mock/snapshots';

const reviewRoot = join(process.cwd(), '.claude', 'review', 'C0210');
const countCases = [
  { value: 57, label: '57' },
  { value: 9_999, label: '9.999' },
  { value: 10_500, label: '10,5K' },
  { value: 1_200_000, label: '1,2M' },
] as const;

async function useSnapshotsWithCounts(page: Page) {
  const base = makeMockSnapshot('question');
  if (!base) throw new Error('Missing question snapshot fixture.');
  let publish: ((seq: number, version: number, count: number) => void) | null = null;

  await page.route('**/api/hud', (route) => route.fulfill({
    json: { ...DEFAULT_HUD_CONFIG, version: 1, texts: { ...DEFAULT_HUD_CONFIG.texts, roundLabel: 'VONG' } },
  }));
  await page.routeWebSocket('/ws', (socket) => {
    socket.onMessage((raw) => {
      const message = JSON.parse(String(raw)) as { type?: string };
      if (message.type !== 'HELLO') return;
      publish = (seq, version, count) => {
        const payload = { ...base, stateVersion: version, participantCount: count } as PublicSnapshot;
        socket.send(JSON.stringify({
          v: 1,
          type: 'STATE_SNAPSHOT',
          seq,
          sessionId: payload.sessionId,
          stateVersion: version,
          serverTimeMs: Date.now(),
          payload,
        }));
      };
      publish(1, 1, 57);
    });
  });
  return (seq: number, version: number, count: number) => {
    if (!publish) throw new Error('Overlay WebSocket is not ready.');
    publish(seq, version, count);
  };
}

test('C-0210 header A giữ kích thước chung 26/44/20 và chứa đủ các biến thể số', async ({ page }) => {
  await mkdir(join(reviewRoot, 'header-A'), { recursive: true });
  const publish = await useSnapshotsWithCounts(page);
  await page.goto('/?role=preview&header=a', { waitUntil: 'domcontentloaded' });

  const stage = page.getByTestId('stage');
  const card = stage.getByTestId('round-card');
  const title = card.locator('.v3-round-title');
  const count = card.getByTestId('participant-count');
  const label = card.locator('.v3-round-label');
  await expect(stage).toBeVisible();
  await expect(title).toHaveText('VÒNG 1');
  await expect(card).toHaveCSS('height', '95px');
  await expect(title).toHaveCSS('font-size', '26px');
  await expect(count).toHaveCSS('font-size', '44px');
  await expect(label).toHaveCSS('font-size', '20px');

  const pill = stage.locator('.v3-title-ribbon');
  const logo = stage.locator('.v3-title.is-wide');
  for (let index = 0; index < countCases.length; index += 1) {
    const item = countCases[index]!;
    if (index > 0) publish(index + 1, index + 1, item.value);
    await expect(count).toHaveText(item.label);

    const geometry = await stage.evaluate((root) => {
      const rect = (element: Element) => {
        const box = element.getBoundingClientRect();
        return { x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
      };
      const cardElement = root.querySelector('[data-testid="round-card"]')!;
      const children = ['.v3-round-title', '[data-testid="participant-count"]', '.v3-round-label']
        .map((selector) => rect(cardElement.querySelector(selector)!));
      return {
        card: rect(cardElement),
        children,
        titleFont: getComputedStyle(cardElement.querySelector('.v3-round-title')!).fontSize,
        countFont: getComputedStyle(cardElement.querySelector('[data-testid="participant-count"]')!).fontSize,
        labelFont: getComputedStyle(cardElement.querySelector('.v3-round-label')!).fontSize,
        pill: rect(root.querySelector('.v3-title-ribbon')!),
        logo: rect(root.querySelector('.v3-title.is-wide')!),
        countOverflow: (cardElement.querySelector('[data-testid="participant-count"]') as HTMLElement).scrollWidth > (cardElement.querySelector('[data-testid="participant-count"]') as HTMLElement).clientWidth,
      };
    });

    expect(geometry.card).toMatchObject({ x: 770, y: 133, width: 230, height: 95 });
    expect(geometry.children[0]!.y).toBeGreaterThanOrEqual(geometry.card.y);
    expect(geometry.children[0]!.bottom).toBeLessThanOrEqual(geometry.children[1]!.y);
    expect(geometry.children[1]!.bottom).toBeLessThanOrEqual(geometry.children[2]!.y);
    expect(geometry.children[2]!.bottom).toBeLessThanOrEqual(geometry.card.bottom);
    const overlapsRibbon = geometry.card.x < geometry.pill.right && geometry.card.right > geometry.pill.x && geometry.card.y < geometry.pill.bottom && geometry.card.bottom > geometry.pill.y;
    expect(overlapsRibbon).toBe(false);
    expect(geometry.card.x).toBeGreaterThanOrEqual(geometry.logo.right);
    expect(geometry.countOverflow).toBe(false);
    expect([geometry.titleFont, geometry.countFont, geometry.labelFont]).toEqual(['26px', '44px', '20px']);

    if (index === 0) {
      console.log(`C-0210: ô VÒNG theo ảnh mẫu C-0216; ${JSON.stringify(geometry)}`);
      await stage.screenshot({ path: join(reviewRoot, 'header-A', 'question.png') });
    }
  }
});

test('C-0210 header B URL cũ dùng cùng khung 26/44/20 và không tràn số', async ({ page }) => {
  await mkdir(join(reviewRoot, 'header-B'), { recursive: true });
  const publish = await useSnapshotsWithCounts(page);
  await page.goto('/?role=preview&header=b', { waitUntil: 'domcontentloaded' });

  const stage = page.getByTestId('stage');
  const card = stage.getByTestId('round-card');
  const title = card.locator('.v3-round-title');
  const count = card.getByTestId('participant-count');
  const label = card.locator('.v3-round-label');
  await expect(stage).toBeVisible();
  await expect(title).toHaveText('VÒNG 1');
  await expect(card).toHaveCSS('height', '95px');
  await expect(title).toHaveCSS('font-size', '26px');
  await expect(count).toHaveCSS('font-size', '44px');
  await expect(label).toHaveCSS('font-size', '20px');

  for (let index = 0; index < countCases.length; index += 1) {
    const item = countCases[index]!;
    if (index > 0) publish(index + 1, index + 1, item.value);
    await expect(count).toHaveText(item.label);
    const rows = await Promise.all([title, count, label].map((element) => element.boundingBox()));
    const cardBox = await card.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(cardBox).toMatchObject({ x: 770, y: 133, width: 230, height: 95 });
    expect(rows.every(Boolean)).toBe(true);
    expect(rows[0]!.y).toBeGreaterThanOrEqual(cardBox!.y);
    expect(rows[0]!.y + rows[0]!.height).toBeLessThanOrEqual(rows[1]!.y);
    expect(rows[1]!.y + rows[1]!.height).toBeLessThanOrEqual(rows[2]!.y);
    expect(rows[2]!.y + rows[2]!.height).toBeLessThanOrEqual(cardBox!.y + cardBox!.height);

    if (index === 0) {
      console.log(`C-0210: header=b tương thích, dùng chung ô VÒNG; ${JSON.stringify({ card: cardBox, rows })}`);
      await stage.screenshot({ path: join(reviewRoot, 'header-B', 'question.png') });
    }
  }
});
