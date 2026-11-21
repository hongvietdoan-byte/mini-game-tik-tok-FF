import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PublicSnapshot } from '@quiz/contracts';
import { RoundCard } from './ArenaStage';

function renderRoundCard(snapshot: Partial<PublicSnapshot>) {
  return renderToStaticMarkup(createElement(RoundCard, { snapshot: snapshot as PublicSnapshot }));
}

describe('RoundCard public lobby header', () => {
  it('shows next round and seated lobby count', () => {
    const markup = renderRoundCard({ state: 'LOBBY', round: null, lobbyRoundNumber: 10, playingCount: 24, participantCount: 0 });
    expect(markup).toContain('VÒNG 10');
    expect(markup).toContain('>24<');
    expect(markup).toContain('ĐANG CHƠI');
  });

  it('shows round 1 when the first lobby has no round history', () => {
    expect(renderRoundCard({ state: 'LOBBY', round: null, lobbyRoundNumber: 1, playingCount: 0, participantCount: 0 }))
      .toContain('VÒNG 1');
  });
});
