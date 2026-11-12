import { describe, expect, it } from 'vitest';
import { CheckStatusSchema, ClientAckSchema } from './index';

describe('ClientAckSchema role', () => {
  it('mặc định ACK cũ sang preview và nhận program rõ ràng', () => {
    expect(ClientAckSchema.parse({ type: 'ACK', stateVersion: 4 }).role).toBe('preview');
    expect(ClientAckSchema.parse({ type: 'ACK', stateVersion: 4, role: 'program' }).role).toBe('program');
    expect(ClientAckSchema.parse({ type: 'ACK', stateVersion: 4, role: 'preview' }).role).toBe('preview');
  });

  it('nhận audioState tùy chọn và giữ tương thích với ACK cũ', () => {
    expect(ClientAckSchema.parse({ type: 'ACK', stateVersion: 4 }).audioState).toBeUndefined();
    for (const audioState of ['disabled', 'running', 'suspended', 'unavailable'] as const) {
      expect(ClientAckSchema.parse({ type: 'ACK', stateVersion: 4, audioState }).audioState).toBe(audioState);
    }
    expect(ClientAckSchema.safeParse({ type: 'ACK', stateVersion: 4, audioState: 'blocked' }).success).toBe(false);
  });
});

describe('SystemCheck status', () => {
  it('hợp đồng chấp nhận trạng thái WARN', () => {
    expect(CheckStatusSchema.parse('WARN')).toBe('WARN');
  });
});
