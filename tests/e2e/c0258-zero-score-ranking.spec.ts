import { expect, test } from '@playwright/test';

test('ranking panels hide zero-score players and preserve the scored order', async ({ page }) => {
  for (const mock of ['top10-zero-score', 'reveal-zero-score']) {
    await page.goto(`/?mock=${mock}`, { waitUntil: 'domcontentloaded' });
    const panel = page.getByTestId(mock.startsWith('top10') ? 'v3-top10-large' : 'v3-top10');
    const rows = panel.getByTestId('leaderboard-row');
    await expect(rows).toHaveCount(6);
    await expect(rows.locator('.player-name, .v3-full-name-text')).toHaveText([
      'FFVN.Kelly', 'StormKing', 'BVD.Champion', 'Choco.M', 'Hami', 'Nyla_xinch',
    ]);
    for (const score of await rows.locator('.v3-full-score, .v3-score').allTextContents()) {
      expect(Number(score.replace(/\D/gu, ''))).toBeGreaterThan(0);
    }
    if (mock === 'reveal-zero-score') await expect(page.getByTestId('stage').locator('.v3-seat')).toHaveCount(35);
  }

  await page.goto('/?mock=top10-zero-score-empty', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('v3-top10-large').getByTestId('leaderboard-row')).toHaveCount(0);
  await expect(page.getByTestId('v3-top10-large').getByText('Chưa có người chơi')).toBeVisible();
});

test('victory podium hides zero-score places and keeps its empty state', async ({ page }) => {
  await page.goto('/?mock=victory-zero-score', { waitUntil: 'domcontentloaded' });
  const podium = page.getByTestId('stage').locator('.v3v-podium');
  await expect(podium.locator('[data-testid^="podium-slot-"]')).toHaveCount(2);
  await expect(podium).not.toContainText('BVD.Champion');
  await expect(podium).toContainText('FFVN.Kelly');
  await expect(podium).toContainText('StormKing');

  await page.goto('/?mock=victory-zero-score-empty', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('stage').getByText('Chưa có người chơi đạt điểm')).toBeVisible();
  await expect(page.getByTestId('stage').locator('.v3v-podium [data-testid^="podium-slot-"]')).toHaveCount(0);
});
