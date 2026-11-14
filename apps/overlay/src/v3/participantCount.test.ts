import { describe, expect, it } from 'vitest';
import { formatParticipantCount } from './participantCount';

describe('formatParticipantCount', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [9_876, '9.876'],
    [10_000, '10K'],
    [10_500, '10,5K'],
    [999_999, '999K'],
    [1_234_567, '1,2M'],
  ])('formats %i as %s', (value, expected) => {
    expect(formatParticipantCount(value)).toBe(expected);
  });
});
