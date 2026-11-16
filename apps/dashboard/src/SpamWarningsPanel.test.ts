import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { AdminSnapshot } from '@quiz/contracts';
import { formatSpamWarningTime, SpamWarningsPanel } from './SpamWarningsPanel';

type SpamWarning = NonNullable<AdminSnapshot['spamWarnings']>[number];

describe('SpamWarningsPanel', () => {
  it('shows a compact empty state without actions or a count badge', () => {
    const html = renderToStaticMarkup(createElement(SpamWarningsPanel, { warnings: [] }));

    expect(html).toContain('Cảnh báo spam');
    expect(html).toContain('Chưa có ai spam');
    expect(html).not.toContain('spam-warning-badge');
    expect(html).not.toMatch(/<button\b/);
  });

  it('renders safe names, counts, all Vietnamese reasons, and a clock time without IDs', () => {
    const reasons: SpamWarning['primaryReason'][] = ['DUPLICATE_ANSWER', 'NOT_ACCEPTING', 'EARLY', 'LATE'];
    const warnings: SpamWarning[] = reasons.map((primaryReason, index) => ({
      playerId: `opaque-player-id-${index}`,
      safeDisplayName: `Người xem ${index + 1}`,
      count: index + 5,
      primaryReason,
      lastAtMs: Date.UTC(2026, 10, 16, 8, 3, 7) + index * 1_000,
    }));
    const html = renderToStaticMarkup(createElement(SpamWarningsPanel, { warnings }));

    expect(html).toContain('4 người có cảnh báo');
    expect(html).toContain('Người xem 1');
    expect(html).toContain('5 lần');
    expect(html).toContain('Trả lời lặp');
    expect(html).toContain('Gửi khi chưa mở');
    expect(html).toContain('Gửi quá sớm');
    expect(html).toContain('Gửi sau khi hết giờ');
    expect(html).toContain(formatSpamWarningTime(warnings[0]!.lastAtMs));
    expect(html).toMatch(/\b\d{2}:\d{2}:\d{2}\b/);
    expect(html).not.toContain('opaque-player-id');
    expect(html).not.toMatch(/<button\b/);
  });
});
