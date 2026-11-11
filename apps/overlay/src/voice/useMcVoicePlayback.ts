import { useEffect, useState } from 'react';
import {
  McVoiceLeasePayloadSchema,
  McVoicePlayPayloadSchema,
  type McVoiceLeasePayload,
} from '@quiz/contracts';
import {
  getMcVoiceOverlayInstanceId,
  McVoicePlaybackController,
  type McVoiceOverlayState,
  type McVoicePlayerStatus,
} from './mcVoicePlayback';

export type McVoiceConnectionStatus = McVoicePlayerStatus | 'connecting';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function fetchVoiceAsset(assetId: string, leaseToken: string, signal: AbortSignal): Promise<Blob> {
  const response = await fetch(`/api/mc-voice/assets/${assetId}`, {
    cache: 'no-store',
    headers: { 'x-mc-voice-lease': leaseToken },
    signal,
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('audio/mpeg'))
    throw new Error('Không lấy được audio MC Voice.');
  const audio = await response.blob();
  if (audio.size === 0 || audio.size > 12 * 1024 * 1024) throw new Error('Audio MC Voice không hợp lệ.');
  return audio;
}

function playAudioBlob(blob: Blob, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    audio.preload = 'auto';
    let settled = false;
    const cleanup = () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      signal.removeEventListener('abort', onAbort);
      audio.pause();
      URL.revokeObjectURL(objectUrl);
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const onEnded = () => finish();
    const onError = () => finish(new Error('Phát audio MC Voice thất bại.'));
    const onAbort = () => finish(new DOMException('Đã huỷ phát audio.', 'AbortError'));
    audio.addEventListener('ended', onEnded, { once: true });
    audio.addEventListener('error', onError, { once: true });
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }
    void audio.play().catch((error: unknown) =>
      finish(error instanceof Error ? error : new Error('Phát audio MC Voice thất bại.')),
    );
  });
}

async function completePlayback(
  body: { questionInstanceId: string; expectedStateVersion: number; result: 'FINISHED' | 'FALLBACK'; fallbackReason?: 'NO_AUDIO' | 'PLAYBACK_ERROR' | 'NO_OWNER' },
  leaseToken: string,
) {
  const response = await fetch('/api/mc-voice/playback/complete', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'content-type': 'application/json', 'x-mc-voice-lease': leaseToken },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Server không nhận ACK MC Voice.');
}

/**
 * Module kết nối độc lập; Codex2 có thể gắn hook vào layout hiện hữu rồi dùng bubbleText
 * làm nội dung bong bóng MC. Hook không sửa Scene hay bố cục overlay.
 */
export function useMcVoicePlayback(): {
  overlayInstanceId: string | null;
  bubbleText: string | null;
  status: McVoiceConnectionStatus;
} {
  const [overlayInstanceId, setOverlayInstanceId] = useState<string | null>(null);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [status, setStatus] = useState<McVoiceConnectionStatus>('connecting');

  useEffect(() => {
    const instanceId = getMcVoiceOverlayInstanceId();
    setOverlayInstanceId(instanceId);
    let socket: WebSocket | null = null;
    let retryTimer = 0;
    let retryDelay = 500;
    let closed = false;
    let controller: McVoicePlaybackController | null = null;

    const connect = () => {
      if (closed) return;
      const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const current = new WebSocket(`${scheme}//${location.host}/ws`);
      socket = current;
      controller = new McVoicePlaybackController({
        fetchAudio: fetchVoiceAsset,
        playAudio: playAudioBlob,
        complete: completePlayback,
        setBubble: setBubbleText,
        setStatus,
      });
      current.onopen = () => {
        if (socket !== current) return;
        current.send(JSON.stringify({ type: 'HELLO', role: 'overlay', overlayInstanceId: instanceId }));
        retryDelay = 500;
      };
      current.onmessage = (event) => {
        if (socket !== current || !controller) return;
        try {
          const message: unknown = JSON.parse(String(event.data));
          if (!isRecord(message) || typeof message.type !== 'string') return;
          if (message.type === 'MC_VOICE_LEASE') {
            const lease = McVoiceLeasePayloadSchema.safeParse(message.payload);
            if (lease.success) controller.updateLease(lease.data as McVoiceLeasePayload);
            return;
          }
          if (message.type === 'STATE_SNAPSHOT' && isRecord(message.payload) &&
            typeof message.payload.sessionId === 'string' && typeof message.payload.state === 'string' &&
            Number.isSafeInteger(message.payload.stateVersion)) {
            const question = isRecord(message.payload.question) ? message.payload.question : null;
            const state: McVoiceOverlayState = {
              sessionId: message.payload.sessionId,
              state: message.payload.state,
              stateVersion: Number(message.payload.stateVersion),
              questionInstanceId: question && typeof question.questionInstanceId === 'string' ? question.questionInstanceId : null,
            };
            controller.updateSnapshot(state, typeof message.serverTimeMs === 'number' ? message.serverTimeMs : Date.now());
            return;
          }
          if (message.type === 'MC_VOICE_PLAY' && typeof message.sessionId === 'string' &&
            Number.isSafeInteger(message.stateVersion) && typeof message.serverTimeMs === 'number') {
            const payload = McVoicePlayPayloadSchema.safeParse(message.payload);
            if (payload.success)
              void controller.play({
                sessionId: message.sessionId,
                stateVersion: Number(message.stateVersion),
                serverTimeMs: message.serverTimeMs,
                payload: payload.data,
              });
          }
        } catch {
          // Gói WS sai định dạng bị bỏ qua; bộ đếm cứng của READING vẫn mở câu bằng chữ.
        }
      };
      current.onclose = () => {
        if (closed || socket !== current) return;
        controller?.socketClosed();
        setStatus('connecting');
        retryTimer = window.setTimeout(connect, retryDelay);
        retryDelay = Math.min(5_000, retryDelay * 2);
      };
      current.onerror = () => current.close();
    };

    connect();
    return () => {
      closed = true;
      window.clearTimeout(retryTimer);
      controller?.socketClosed();
      socket?.close();
    };
  }, []);

  return { overlayInstanceId, bubbleText, status };
}
