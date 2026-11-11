import { describe, expect, it, vi } from 'vitest';
import { ManualScheduler } from '@quiz/live-adapters';
import { McVoiceLeaseManager, McVoicePrimaryConfirmationRequiredError } from './lease';

const OWNER = 'c7b7a3bc-5d67-4e85-a4bf-2d46b747c01a';
const OTHER = '4f541bc0-1f98-4b18-bc42-9e193f719a8b';

describe('McVoiceLeaseManager', () => {
  it('chỉ cấp lease cho overlay chính và bắt xác nhận khi đổi owner', () => {
    let issued = 0;
    const manager = new McVoiceLeaseManager(new ManualScheduler(), { tokenFactory: () => `lease-token-${++issued}-` + 'x'.repeat(32) });
    manager.connect(OWNER);
    manager.connect(OTHER);
    expect(manager.activeOverlayInstanceIds).toEqual([OTHER, OWNER].sort());
    manager.setPrimary(OWNER);
    const token = manager.leaseTokenFor(OWNER)!;
    expect(manager.statusFor(OWNER)).toBe('GRANTED');
    expect(manager.leaseTokenFor(OTHER)).toBeNull();
    expect(manager.authorize(token)).toBe(true);
    expect(manager.authorize('wrong-token')).toBe(false);
    expect(() => manager.setPrimary(OTHER)).toThrow(McVoicePrimaryConfirmationRequiredError);

    manager.setPrimary(OTHER, true);
    expect(manager.authorize(token)).toBe(false);
    expect(manager.statusFor(OWNER)).toBe('NOT_OWNER');
    expect(manager.statusFor(OTHER)).toBe('GRANTED');
  });

  it('giữ nguyên token khi reconnect trong grace period và hết hạn sau đó', () => {
    const scheduler = new ManualScheduler();
    const onExpired = vi.fn();
    const manager = new McVoiceLeaseManager(scheduler, { graceMs: 500, tokenFactory: () => 'lease-token-' + 'y'.repeat(32), onExpired });
    manager.connect(OWNER);
    manager.setPrimary(OWNER);
    const token = manager.leaseTokenFor(OWNER)!;

    manager.disconnect(OWNER);
    expect(manager.authorize(token)).toBe(false);
    expect(manager.isReconnectPending(OWNER)).toBe(true);
    scheduler.advance(400);
    manager.connect(OWNER);
    expect(manager.leaseTokenFor(OWNER)).toBe(token);
    scheduler.advance(500);
    expect(onExpired).not.toHaveBeenCalled();

    manager.disconnect(OWNER);
    scheduler.advance(500);
    expect(onExpired).toHaveBeenCalledWith(OWNER);
    expect(manager.statusFor(OWNER)).toBe('WAITING');
    expect(manager.authorize(token)).toBe(false);
  });

  it('không gia hạn lease khi ID sai và không ghi nhận âm số kết nối', () => {
    const manager = new McVoiceLeaseManager(new ManualScheduler());
    expect(() => manager.connect('not-a-uuid')).toThrow('ID overlay MC Voice không hợp lệ');
    manager.disconnect(OWNER);
    expect(manager.activeOverlayInstanceIds).toEqual([]);
  });
});
