import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const reviewDirectory = resolve(process.cwd(), '.claude', 'review', 'C0297');

test('C-0297 — long prompts fit three lines or clamp inside the fixed frame in QUESTION and REVEAL', async ({ page }) => {
  mkdirSync(reviewDirectory, { recursive: true });
  for (const mock of ['question-live-long', 'reveal-live-long', 'question-clamp-text', 'reveal-clamp-text']) {
    await page.goto(`/?mock=${mock}`, { waitUntil: 'domcontentloaded' });
    const prompt = page.getByTestId('question-prompt');
    const clamped = mock.includes('clamp-text');
    await expect(prompt).toBeVisible();
    await expect(prompt).toHaveAttribute('title', /./);

    const metrics = await prompt.evaluate((element) => {
      const copy = element.querySelector<HTMLElement>('[data-testid="question-prompt-copy"]')!;
      const style = getComputedStyle(element);
      const range = document.createRange();
      range.selectNodeContents(copy);
      const lineTops = [...new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)))];
      return {
        fontSize: Number.parseFloat(style.fontSize),
        height: element.getBoundingClientRect().height,
        visibleLines: lineTops.length,
        visibleText: copy.textContent ?? '',
        fullPromptLength: element.getAttribute('title')?.length ?? 0,
      };
    });
    expect(metrics.fontSize).toBeGreaterThanOrEqual(26);
    expect(metrics.height).toBeLessThanOrEqual(126);
    if (clamped) {
      expect(metrics.fullPromptLength).toBeGreaterThanOrEqual(150);
      await expect(page.getByTestId('prompt-truncation-warning')).toBeVisible();
      await expect(prompt).toHaveAttribute('data-prompt-truncated', 'true');
      expect(metrics.visibleLines).toBeLessThanOrEqual(3);
      expect(metrics.visibleText.endsWith('…')).toBe(true);
      const option = page.getByTestId('option-B').locator('.v3-option-text');
      await expect(option).toHaveAttribute('data-option-truncated', 'true');
      await expect(option).toHaveAttribute('title', /Phối hợp với đồng đội/);
    } else {
      await expect(prompt).toContainText('Trong Free Fire, từ nào thường xuất hiện trên kết quả khi người chơi hoặc đội giành chiến thắng Battle Royale?');
      await expect(prompt).toHaveAttribute('data-prompt-truncated', 'false');
      await expect(page.getByTestId('prompt-truncation-warning')).toBeHidden();
    }

    await page.screenshot({ path: join(reviewDirectory, `${mock}-1080x1920.png`), animations: 'disabled' });
  }
});
