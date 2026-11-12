import type { LiveSourceHealth, OverlayAudioState } from '@quiz/contracts';

export type PreflightHealthStatus = 'PASS' | 'FAIL' | 'WARN';
export const COMMENT_RECENCY_WINDOW_MS = 5 * 60 * 1_000;
export const OVERLAY_ACK_GRACE_MS = 2_000;
export const OVERLAY_AUDIO_WARNING = 'Nguồn phát trong LIVE Studio chưa phát được âm thanh (trình duyệt chặn tự phát)';

export function overlayAudioPreflight(audioState: OverlayAudioState | null): {
  status: PreflightHealthStatus;
  reason: string;
} {
  if (audioState === 'suspended' || audioState === 'unavailable') {
    return { status: 'WARN', reason: OVERLAY_AUDIO_WARNING };
  }
  if (audioState === 'disabled') {
    return { status: 'PASS', reason: 'Âm thanh nguồn trong LIVE Studio đã tắt theo cấu hình.' };
  }
  if (audioState === 'running') {
    return { status: 'PASS', reason: 'Âm thanh nguồn trong LIVE Studio đang phát.' };
  }
  return { status: 'WARN', reason: 'Chưa nhận được trạng thái âm thanh từ nguồn trong LIVE Studio.' };
}

export function commentSourcePreflight(
  mode: 'MOCK' | 'TIKTOK',
  live: LiveSourceHealth,
  nowMs: number,
  recencyWindowMs = COMMENT_RECENCY_WINDOW_MS,
): { status: PreflightHealthStatus; reason: string } {
  if (mode !== 'TIKTOK') {
    return { status: 'WARN', reason: `Phiên đang dùng MOCK (${live.status}); không xác nhận nguồn TikTok LIVE.` };
  }
  if (live.source !== 'TIKTOK' || live.status !== 'CONNECTED') {
    const detail = live.detail ? ` — ${live.detail}` : '';
    return { status: 'FAIL', reason: `Mode TIKTOK; adapter ${live.source} đang ${live.status}${detail}.` };
  }

  const ageMs = live.lastCommentAtMs === null ? null : nowMs - live.lastCommentAtMs;
  if (live.commentsReceived < 1 || ageMs === null || ageMs < 0 || ageMs > recencyWindowMs) {
    const detail = ageMs === null || ageMs < 0 || ageMs > recencyWindowMs
      ? `chưa thấy comment trong ${Math.round(recencyWindowMs / 60_000)} phút gần nhất`
      : 'chưa nhận comment nào';
    return {
      status: 'WARN',
      reason: `Adapter đã CONNECTED nhưng ${detail} (tổng ${live.commentsReceived}); xác nhận kết nối chưa chứng minh có chat.`,
    };
  }
  return {
    status: 'PASS',
    reason: `Mode TIKTOK; đã nhận comment ${Math.round(ageMs / 1_000)} giây trước (tổng ${live.commentsReceived}).`,
  };
}

export function overlayAckPreflight(input: {
  clients: number;
  programClients: number;
  ackVersion: number | null;
  expectedVersion: number;
  nowMs: number;
  pendingSinceMs: number;
  graceMs?: number;
}): { status: PreflightHealthStatus; reason: string } {
  if (input.clients < 1) return { status: 'FAIL', reason: 'Chưa có overlay kết nối.' };
  if (input.programClients < 1) {
    return { status: 'WARN', reason: 'Chỉ thấy tab xem thử, chưa thấy nguồn trong LIVE Studio.' };
  }
  if (input.ackVersion !== null && input.ackVersion >= input.expectedVersion) {
    return {
      status: 'PASS',
      reason: `${input.clients} overlay đang kết nối; đã ACK v${input.ackVersion} (server v${input.expectedVersion}).`,
    };
  }

  const graceMs = input.graceMs ?? OVERLAY_ACK_GRACE_MS;
  const elapsedMs = input.nowMs - input.pendingSinceMs;
  if (elapsedMs >= 0 && elapsedMs < graceMs) {
    return {
      status: 'WARN',
      reason: `Đang chờ overlay ACK v${input.expectedVersion}; còn trong cửa sổ ${Math.ceil((graceMs - elapsedMs) / 1_000)} giây.`,
    };
  }
  return {
    status: 'FAIL',
    reason: `Overlay chưa ACK stateVersion ${input.expectedVersion} sau ${Math.ceil(graceMs / 1_000)} giây.`,
  };
}
