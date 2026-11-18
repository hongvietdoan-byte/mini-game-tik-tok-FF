import { describe, expect, it } from 'vitest';
import { SessionConfigSchema } from '@quiz/contracts';
import { mockClient } from './mockClient';

describe('Mock Dashboard: bù độ trễ LIVE', () => {
  it('mặc định AUTO, giữ delay câu đang chạy và đổi câu kế; chặn khi phiên đóng', async () => {
    const { sessionId, snapshot } = await mockClient.createSession('', {
      name: 'Mock stream delay',
      config: SessionConfigSchema.parse({ mode: 'TIKTOK', tiktokUsername: '@stream_delay_test' }),
    });
    expect((snapshot as typeof snapshot & { streamDelay: { mode: string; nextQuestionDelayMs: number } }).streamDelay)
      .toMatchObject({ mode: 'AUTO', nextQuestionDelayMs: 2_000 });

    await expect(mockClient.updateStreamDelaySettings('', sessionId, { mode: 'MANUAL', manualDelayMs: 3_500 }))
      .resolves.toMatchObject({ ok: true, streamDelay: { mode: 'MANUAL', nextQuestionDelayMs: 3_500 } });
    let latest = await mockClient.getState('', sessionId);
    const started = await mockClient.sendCommand('', sessionId, {
      commandId: 'mock-stream-delay-start', expectedStateVersion: latest.public.stateVersion,
      operatorId: 'test', requestedAtMs: Date.now(), command: { type: 'START_ROUND', questionCount: 10 },
    });
    expect(started.result.ok).toBe(true);
    latest = await mockClient.getState('', sessionId);
    expect((latest as typeof latest & { streamDelay: { activeQuestionDelayMs: number | null } }).streamDelay.activeQuestionDelayMs).toBe(3_500);

    const updated = await mockClient.updateStreamDelaySettings('', sessionId, { mode: 'AUTO' });
    expect(updated.streamDelay).toMatchObject({ mode: 'AUTO', nextQuestionDelayMs: 2_000, activeQuestionDelayMs: 3_500 });

    latest = await mockClient.getState('', sessionId);
    for (const commandId of ['mock-stream-delay-accept', 'mock-stream-delay-reveal', 'mock-stream-delay-next']) {
      const command = await mockClient.sendCommand('', sessionId, {
        commandId, expectedStateVersion: latest.public.stateVersion,
        operatorId: 'test', requestedAtMs: Date.now(), command: { type: 'MANUAL_NEXT' },
      });
      expect(command.result.ok).toBe(true);
      latest = await mockClient.getState('', sessionId);
    }
    expect((latest as typeof latest & { streamDelay: { activeQuestionDelayMs: number | null } }).streamDelay.activeQuestionDelayMs).toBe(2_000);

    await mockClient.sendCommand('', sessionId, {
      commandId: 'mock-stream-delay-stop', expectedStateVersion: latest.public.stateVersion,
      operatorId: 'test', requestedAtMs: Date.now(), command: { type: 'STOP', reason: 'Đóng phiên kiểm thử' },
    });
    await expect(mockClient.updateStreamDelaySettings('', sessionId, { mode: 'AUTO' }))
      .rejects.toMatchObject({ status: 409, code: 'SESSION_CLOSED', message: 'Phiên đã đóng.' });
  });
});
