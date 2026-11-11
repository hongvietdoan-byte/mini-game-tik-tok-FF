import type { AdminSnapshot, CheckStatus, CommandBody, CommandEnvelope, CommandType, ConnectionStatus, GameState } from '@quiz/contracts';

export type DashboardAction = {
  type: CommandType;
  label: string;
  danger?: boolean;
};

const normalActions: Record<GameState, DashboardAction[]> = {
  IDLE: [{ type: 'OPEN_LOBBY', label: 'Mở sảnh' }],
  LOBBY: [{ type: 'START_ROUND', label: 'Bắt đầu vòng' }],
  PREPARE: [
    { type: 'PAUSE', label: 'Tạm dừng' },
    { type: 'MANUAL_NEXT', label: 'Tiếp' },
  ],
  ACCEPTING: [
    { type: 'PAUSE', label: 'Tạm dừng' },
  ],
  REVEAL: [
    { type: 'PAUSE', label: 'Tạm dừng' },
    { type: 'MANUAL_NEXT', label: 'Tiếp' },
  ],
  LEADERBOARD: [
    { type: 'MANUAL_NEXT', label: 'Tiếp' },
    { type: 'NEXT_ROUND', label: 'Vòng mới' },
    { type: 'SET_AUTO_MODE', label: 'Bật Auto' },
  ],
  ROUND_END: [{ type: 'NEXT_ROUND', label: 'Vòng mới' }],
  VICTORY: [{ type: 'NEXT_ROUND', label: 'Vòng mới' }],
  INTERMISSION: [{ type: 'NEXT_ROUND', label: 'Vòng mới' }],
  PAUSED: [{ type: 'RESUME', label: 'Tiếp tục' }],
  CONNECTION_INTERRUPTED: [],
  ERROR: [],
};

export function actionsFor(snapshot: AdminSnapshot): DashboardAction[] {
  if (snapshot.recoveryPending) return [];
  return [...(normalActions[snapshot.public.state] ?? [])];
}

export function shouldAcceptSnapshotSeq(
  currentSeq: number | null,
  incomingSeq: number,
  awaitingFreshSnapshot = false,
): boolean {
  if (!Number.isSafeInteger(incomingSeq) || incomingSeq < 0) return false;
  return awaitingFreshSnapshot || currentSeq === null || incomingSeq > currentSeq;
}

export function checkStatusTone(status: CheckStatus): 'pass' | 'fail' | 'not-tested' {
  return status === 'PASS' ? 'pass' : status === 'FAIL' ? 'fail' : 'not-tested';
}

export function connectionStatusLabel(status: ConnectionStatus): string {
  const labels: Record<ConnectionStatus, string> = {
    DISCONNECTED: 'Đã ngắt',
    CONNECTING: 'Đang kết nối',
    CONNECTED: 'Đã kết nối',
    RECONNECTING: 'Đang kết nối lại',
    BLOCKED: 'Bị chặn',
  };
  return labels[status];
}

export function connectionStatusTone(status: ConnectionStatus): 'pass' | 'fail' | 'pending' | 'muted' {
  if (status === 'CONNECTED') return 'pass';
  if (status === 'BLOCKED') return 'fail';
  if (status === 'CONNECTING' || status === 'RECONNECTING') return 'pending';
  return 'muted';
}

export function formatTimeAgo(timestampMs: number | null, nowMs: number): string {
  if (timestampMs === null) return 'Chưa có bình luận';
  const seconds = Math.floor(Math.max(0, nowMs - timestampMs) / 1_000);
  return seconds < 1 ? 'Vừa xong' : `${seconds} giây trước`;
}

export function hasSilentAcceptingWarning(
  state: GameState,
  lastCommentAtMs: number | null,
  acceptingSinceMs: number | null,
  nowMs: number,
): boolean {
  if (state !== 'ACCEPTING') return false;
  const lastActivity = lastCommentAtMs ?? acceptingSinceMs;
  return lastActivity !== null && nowMs - lastActivity > 10_000;
}

export function overlayUrlFromLocation(href: string): string {
  const url = new URL(href);
  url.search = '';
  url.hash = '';
  if (url.port === '5173') {
    url.port = '5174';
    url.pathname = '/';
  } else {
    url.pathname = '/overlay/';
  }
  return url.toString();
}

export const dangerousActions: DashboardAction[] = [
  { type: 'SKIP_QUESTION', label: 'Bỏ qua câu', danger: true },
  { type: 'VOID_QUESTION', label: 'Huỷ câu', danger: true },
  { type: 'RESTART_ROUND', label: 'Chơi lại vòng', danger: true },
  { type: 'STOP', label: 'Dừng phiên', danger: true },
];

export function buildCommandEnvelope(
  snapshot: AdminSnapshot,
  command: CommandBody,
  operatorId = 'operator',
  commandId: string = crypto.randomUUID(),
  requestedAtMs: number = Date.now(),
): CommandEnvelope {
  return {
    commandId,
    expectedStateVersion: snapshot.public.stateVersion,
    operatorId: operatorId.trim() || 'operator',
    requestedAtMs,
    command,
  };
}

export function commandErrorMessage(status: number, message?: string): string {
  if (status === 409) return 'Trạng thái đã thay đổi, xem lại rồi bấm lại.';
  if (status === 422) return message || 'Máy chủ từ chối lệnh. Kiểm tra điều kiện rồi thử lại.';
  if (status === 401) return 'Mã quản trị không hợp lệ hoặc đã hết hạn.';
  if (status === 403) return 'Yêu cầu bị từ chối bởi chính sách Origin.';
  return message || `Yêu cầu thất bại (${status}).`;
}

export function commandForAction(
  action: DashboardAction,
  snapshot: AdminSnapshot,
  reason?: string,
  enabled?: boolean,
): CommandBody {
  switch (action.type) {
    case 'START_ROUND':
      return { type: action.type, reason, questionCount: snapshot.config.questionsPerRound };
    case 'RESTART_ROUND':
      return { type: action.type, reason: reason ?? '', questionCount: snapshot.config.questionsPerRound };
    case 'SKIP_QUESTION':
    case 'VOID_QUESTION':
    case 'STOP':
      return { type: action.type, reason: reason ?? '' } as CommandBody;
    case 'SET_AUTO_MODE':
      return { type: action.type, enabled: enabled ?? !snapshot.autoMode };
    case 'RESOLVE_RECOVERY':
      return { type: action.type, decision: 'STOP', reason: reason ?? '' };
    case 'OPEN_LOBBY':
    case 'PAUSE':
    case 'RESUME':
    case 'MANUAL_NEXT':
    case 'NEXT_ROUND':
      return { type: action.type };
    default: {
      const exhaustive: never = action.type;
      return exhaustive;
    }
  }
}
