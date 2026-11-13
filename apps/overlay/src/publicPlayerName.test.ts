import { describe, expect, it } from 'vitest';
import { publicPlayerName } from './publicPlayerName';

describe('publicPlayerName', () => {
  it('uses the moderated public field when present', () => {
    expect(publicPlayerName({ displayName: 'legacy-raw', safeDisplayName: 'Alias 01' }, 'Người chơi 1', false)).toBe('Alias 01');
  });

  it('never falls back to a legacy name in a live scene', () => {
    expect(publicPlayerName({ displayName: 'legacy-raw' }, 'Người chơi 1', false)).toBe('Người chơi 1');
  });

  it('allows fixture names only for explicit mock scenes', () => {
    expect(publicPlayerName({ displayName: 'StormKing' }, 'Người chơi 1', true)).toBe('StormKing');
  });
});
