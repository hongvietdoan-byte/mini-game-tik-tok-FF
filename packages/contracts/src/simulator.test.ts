import { describe, expect, it } from 'vitest';
import { SimulatorRequestSchema } from './index';

describe('SimulatorRequestSchema', () => {
  it('chấp nhận 20.000 người và từ chối vượt giới hạn', () => {
    expect(SimulatorRequestSchema.parse({ action: 'START', players: 20_000 }).players).toBe(20_000);
    expect(SimulatorRequestSchema.safeParse({ action: 'START', players: 20_001 }).success).toBe(false);
  });
});
