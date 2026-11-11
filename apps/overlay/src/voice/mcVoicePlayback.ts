import type { McVoiceLeasePayload, McVoicePlayPayload, McVoicePlaybackCompletion } from '@quiz/contracts';

export type McVoiceOverlayState = {
  sessionId: string;
  state: string;
  stateVersion: number;
  questionInstanceId: string | null;
};

export type McVoicePlayerStatus = 'idle' | 'waiting' | 'owner' | 'playing' | 'error';

export type McVoicePlaybackPorts = {
  fetchAudio(assetId: string, leaseToken: string, signal: AbortSignal): Promise<Blob>;
  playAudio(audio: Blob, signal: AbortSignal): Promise<void>;
  complete(body: McVoicePlaybackCompletion, leaseToken: string): Promise<void>;
  setBubble(text: string | null): void;
  setStatus?(status: McVoicePlayerStatus): void;
  now?(): number;
};

export type McVoicePlayEnvelope = {
  sessionId: string;
  stateVersion: number;
  serverTimeMs: number;
  payload: McVoicePlayPayload;
};

/** Player không phụ thuộc ArenaStage; giao diện hiện bubble/điểm gắn do Codex2 quyết định. */
export class McVoicePlaybackController {
  private leaseToken: string | null = null;
  private overlayState: McVoiceOverlayState | null = null;
  private serverClockOffsetMs = 0;
  private playbackAbort: AbortController | null = null;
  private activeKey: string | null = null;
  private status: McVoicePlayerStatus = 'idle';

  constructor(private readonly ports: McVoicePlaybackPorts) {}

  updateLease(lease: McVoiceLeasePayload) {
    const nextToken = lease.status === 'GRANTED' ? lease.leaseToken ?? null : null;
    if (nextToken !== this.leaseToken) this.cancelPlayback();
    this.leaseToken = nextToken;
    this.setStatus(nextToken ? 'owner' : lease.status === 'WAITING' ? 'waiting' : 'idle');
  }

  updateSnapshot(state: McVoiceOverlayState, serverTimeMs: number) {
    this.overlayState = state;
    this.serverClockOffsetMs = serverTimeMs - this.now();
    if (state.state !== 'READING' || !state.questionInstanceId ||
      (this.activeKey && this.activeKey !== this.key(state.sessionId, state.stateVersion, state.questionInstanceId))) {
      this.cancelPlayback();
      this.setStatus(this.leaseToken ? 'owner' : 'idle');
    }
  }

  socketClosed() {
    this.leaseToken = null;
    this.cancelPlayback();
    this.setStatus('waiting');
  }

  async play(envelope: McVoicePlayEnvelope): Promise<void> {
    const token = this.leaseToken;
    const payload = envelope.payload;
    const key = this.key(envelope.sessionId, envelope.stateVersion, payload.questionInstanceId);
    if (!token || !this.isCurrent(envelope) || this.activeKey === key) return;

    this.cancelPlayback();
    const abort = new AbortController();
    this.playbackAbort = abort;
    this.activeKey = key;
    this.setStatus('playing');

    try {
      const audio = await Promise.all(payload.lines.map((line) => this.ports.fetchAudio(line.assetId, token, abort.signal)));
      if (abort.signal.aborted || !this.isCurrent(envelope) || this.leaseToken !== token) return;
      const timeNeeded = payload.totalDurationMs + 200;
      if (this.serverNow() + timeNeeded >= payload.deadlineAtMs) {
        await this.reportFallback(envelope, token, 'PLAYBACK_ERROR');
        return;
      }

      for (let index = 0; index < payload.lines.length; index += 1) {
        if (abort.signal.aborted || !this.isCurrent(envelope) || this.leaseToken !== token) return;
        if (this.serverNow() + payload.lines.slice(index).reduce((total, line) => total + line.durationMs, 200) >= payload.deadlineAtMs) {
          await this.reportFallback(envelope, token, 'PLAYBACK_ERROR');
          return;
        }
        const line = payload.lines[index]!;
        this.ports.setBubble(line.text);
        await this.ports.playAudio(audio[index]!, abort.signal);
      }
      if (abort.signal.aborted || !this.isCurrent(envelope) || this.leaseToken !== token) return;
      await this.ports.complete({
        questionInstanceId: payload.questionInstanceId,
        expectedStateVersion: envelope.stateVersion,
        result: 'FINISHED',
      }, token);
      this.ports.setBubble(null);
      this.activeKey = null;
      this.setStatus('owner');
    } catch {
      if (!abort.signal.aborted && this.isCurrent(envelope) && this.leaseToken === token)
        await this.reportFallback(envelope, token, 'PLAYBACK_ERROR');
    } finally {
      if (this.playbackAbort === abort) this.playbackAbort = null;
    }
  }

  private async reportFallback(envelope: McVoicePlayEnvelope, token: string, fallbackReason: 'NO_AUDIO' | 'PLAYBACK_ERROR' | 'NO_OWNER') {
    if (!this.isCurrent(envelope) || this.leaseToken !== token) return;
    await this.ports.complete({
      questionInstanceId: envelope.payload.questionInstanceId,
      expectedStateVersion: envelope.stateVersion,
      result: 'FALLBACK',
      fallbackReason,
    }, token).catch(() => {});
    this.ports.setBubble(null);
    this.activeKey = null;
    this.setStatus('owner');
  }

  private isCurrent(envelope: McVoicePlayEnvelope) {
    const state = this.overlayState;
    return !!state && state.state === 'READING' && state.sessionId === envelope.sessionId &&
      state.stateVersion === envelope.stateVersion && state.questionInstanceId === envelope.payload.questionInstanceId;
  }

  private key(sessionId: string, stateVersion: number, questionInstanceId: string) {
    return `${sessionId}:${stateVersion}:${questionInstanceId}`;
  }

  private serverNow() {
    return this.now() + this.serverClockOffsetMs;
  }

  private now() {
    return this.ports.now?.() ?? Date.now();
  }

  private cancelPlayback() {
    this.playbackAbort?.abort();
    this.playbackAbort = null;
    this.activeKey = null;
    this.ports.setBubble(null);
  }

  private setStatus(status: McVoicePlayerStatus) {
    if (this.status === status) return;
    this.status = status;
    this.ports.setStatus?.(status);
  }
}

const OVERLAY_INSTANCE_KEY = 'quiz.mcVoice.overlayInstanceId';

/** ID ngẫu nhiên theo tab, giữ qua reload bằng sessionStorage để khôi phục lease grace. */
export function getMcVoiceOverlayInstanceId(
  storage: Pick<Storage, 'getItem' | 'setItem'> = window.sessionStorage,
  createId: () => string = () => crypto.randomUUID(),
): string {
  const stored = storage.getItem(OVERLAY_INSTANCE_KEY);
  if (stored && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)) return stored;
  const id = createId();
  storage.setItem(OVERLAY_INSTANCE_KEY, id);
  return id;
}
