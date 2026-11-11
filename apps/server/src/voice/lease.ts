import { randomBytes, timingSafeEqual } from 'node:crypto';
import { McVoiceOverlayInstanceIdSchema } from '@quiz/contracts';
import type { Scheduler } from '@quiz/live-adapters';

type McVoiceLeaseOptions = {
  graceMs?: number;
  tokenFactory?: () => string;
  onExpired?: (overlayInstanceId: string) => void;
};

export class McVoicePrimaryConfirmationRequiredError extends Error {
  constructor() {
    super('Cần xác nhận trước khi đổi overlay phát tiếng.');
    this.name = 'McVoicePrimaryConfirmationRequiredError';
  }
}

/** Owner lease cho đúng một tab overlay; token chỉ được cấp trên WS đã HELLO với instance id đó. */
export class McVoiceLeaseManager {
  private primaryId: string | null = null;
  private readonly connections = new Map<string, number>();
  private leaseTokenValue: string | null = null;
  private graceUntilMs: number | null = null;
  private graceTimer: unknown = null;
  private readonly graceMs: number;
  private readonly tokenFactory: () => string;
  private readonly onExpired?: (overlayInstanceId: string) => void;

  constructor(private readonly scheduler: Scheduler, options: McVoiceLeaseOptions = {}) {
    this.graceMs = Math.max(0, options.graceMs ?? 15_000);
    this.tokenFactory = options.tokenFactory ?? (() => randomBytes(32).toString('base64url'));
    this.onExpired = options.onExpired;
  }

  get primaryOverlayInstanceId(): string | null {
    return this.primaryId;
  }

  get activeOverlayInstanceIds(): string[] {
    return [...this.connections.keys()].filter((id) => (this.connections.get(id) ?? 0) > 0).sort();
  }

  connect(overlayInstanceId: string): void {
    this.assertInstanceId(overlayInstanceId);
    this.connections.set(overlayInstanceId, (this.connections.get(overlayInstanceId) ?? 0) + 1);
    if (overlayInstanceId !== this.primaryId) return;
    this.clearGraceTimer();
    this.graceUntilMs = null;
    if (!this.leaseTokenValue) this.leaseTokenValue = this.tokenFactory();
  }

  disconnect(overlayInstanceId: string): void {
    const count = this.connections.get(overlayInstanceId) ?? 0;
    if (count <= 1) this.connections.delete(overlayInstanceId);
    else this.connections.set(overlayInstanceId, count - 1);
    if (overlayInstanceId !== this.primaryId || this.isConnected(overlayInstanceId) || !this.leaseTokenValue) return;

    this.clearGraceTimer();
    const currentToken = this.leaseTokenValue;
    this.graceUntilMs = this.scheduler.now() + this.graceMs;
    this.graceTimer = this.scheduler.setTimeout(() => {
      this.graceTimer = null;
      if (this.primaryId !== overlayInstanceId || this.isConnected(overlayInstanceId) || this.leaseTokenValue !== currentToken) return;
      this.leaseTokenValue = null;
      this.graceUntilMs = null;
      this.onExpired?.(overlayInstanceId);
    }, this.graceMs);
  }

  setPrimary(overlayInstanceId: string | null, confirmChange = false): { previous: string | null; current: string | null } {
    if (overlayInstanceId !== null) this.assertInstanceId(overlayInstanceId);
    if (overlayInstanceId === this.primaryId) return { previous: this.primaryId, current: this.primaryId };
    if (this.primaryId !== null && !confirmChange) throw new McVoicePrimaryConfirmationRequiredError();

    const previous = this.primaryId;
    this.clearGraceTimer();
    this.graceUntilMs = null;
    this.leaseTokenValue = null;
    this.primaryId = overlayInstanceId;
    if (overlayInstanceId && this.isConnected(overlayInstanceId)) this.leaseTokenValue = this.tokenFactory();
    return { previous, current: this.primaryId };
  }

  isConnected(overlayInstanceId: string): boolean {
    return (this.connections.get(overlayInstanceId) ?? 0) > 0;
  }

  isReconnectPending(overlayInstanceId: string): boolean {
    return overlayInstanceId === this.primaryId && this.leaseTokenValue !== null &&
      !this.isConnected(overlayInstanceId) && this.graceUntilMs !== null && this.scheduler.now() < this.graceUntilMs;
  }

  leaseTokenFor(overlayInstanceId: string): string | null {
    return overlayInstanceId === this.primaryId && this.isConnected(overlayInstanceId) ? this.leaseTokenValue : null;
  }

  authorize(token: string | undefined): boolean {
    const activeToken = this.primaryId && this.isConnected(this.primaryId) ? this.leaseTokenValue : null;
    if (!token || !activeToken) return false;
    const given = Buffer.from(token);
    const expected = Buffer.from(activeToken);
    return given.length === expected.length && timingSafeEqual(given, expected);
  }

  statusFor(overlayInstanceId: string): 'GRANTED' | 'WAITING' | 'NOT_OWNER' {
    if (overlayInstanceId !== this.primaryId) return 'NOT_OWNER';
    return this.leaseTokenFor(overlayInstanceId) ? 'GRANTED' : 'WAITING';
  }

  dispose() {
    this.clearGraceTimer();
    this.connections.clear();
    this.primaryId = null;
    this.leaseTokenValue = null;
    this.graceUntilMs = null;
  }

  private assertInstanceId(value: string) {
    if (!McVoiceOverlayInstanceIdSchema.safeParse(value).success)
      throw new Error('ID overlay MC Voice không hợp lệ.');
  }

  private clearGraceTimer() {
    if (this.graceTimer !== null) this.scheduler.clearTimeout(this.graceTimer);
    this.graceTimer = null;
  }
}
