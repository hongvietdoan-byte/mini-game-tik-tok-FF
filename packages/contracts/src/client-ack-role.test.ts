import { describe, expect, it } from 'vitest';
import { ClientAckSchema } from './index';

describe('ClientAckSchema role', () => {
  it('mặc định ACK cũ sang preview và nhận program rõ ràng', () => {
    expect(ClientAckSchema.parse({ type: 'ACK', stateVersion: 4 }).role).toBe('preview');
    expect(ClientAckSchema.parse({ type: 'ACK', stateVersion: 4, role: 'program' }).role).toBe('program');
    expect(ClientAckSchema.parse({ type: 'ACK', stateVersion: 4, role: 'preview' }).role).toBe('preview');
  });
});
