import type { CheckStatus, SystemCheck, SystemCheckId } from '@quiz/contracts';
import type { PreflightResponse, SystemChecksResponse } from './api/client';

export const SETUP_DONE_KEY = 'quiz.setupDone';

export const SETUP_STEPS = [
  { id: 'health', label: 'Kiểm tra hệ thống' },
  { id: 'database', label: 'Database' },
  { id: 'theme', label: 'Theme Pack' },
  { id: 'tiktokConnector', label: 'TikTok LIVE Connector' },
  { id: 'mock', label: 'Kiểm tra bằng Mock' },
  { id: 'obs', label: 'OBS / LIVE Studio' },
  { id: 'overlay', label: 'Kiểm tra Overlay' },
  { id: 'summary', label: 'Hoàn tất' },
] as const;

export type SetupStepId = (typeof SETUP_STEPS)[number]['id'];
export type SetupWizardStatus = CheckStatus | 'SKIPPED';
export type SetupStatuses = Record<SetupStepId, SetupWizardStatus>;

export const INITIAL_SETUP_STATUSES: SetupStatuses = {
  health: 'NOT_TESTED',
  database: 'NOT_TESTED',
  theme: 'NOT_TESTED',
  tiktokConnector: 'NOT_TESTED',
  mock: 'NOT_TESTED',
  obs: 'NOT_TESTED',
  overlay: 'NOT_TESTED',
  summary: 'NOT_TESTED',
};

export function systemCheckStatus(checks: SystemCheck[] | undefined, id: SystemCheckId): CheckStatus {
  return checks?.find((check) => check.id === id)?.status ?? 'NOT_TESTED';
}

export function overlaySetupStatus(response: SystemChecksResponse | null): CheckStatus {
  if (!response) return 'NOT_TESTED';
  const overlay = systemCheckStatus(response.checks, 'overlay');
  const updated = systemCheckStatus(response.checks, 'overlayUpdated');
  if (overlay === 'FAIL' || updated === 'FAIL') return 'FAIL';
  if (overlay === 'PASS' && updated === 'PASS') return 'PASS';
  return 'NOT_TESTED';
}

export function applyProgramAckStatus(
  response: SystemChecksResponse,
  preflight: PreflightResponse | null,
  error?: string,
): SystemChecksResponse {
  const programAck = preflight?.checks.find((check) => check.id === 'overlayAck');
  const status: CheckStatus = error ? 'FAIL' : programAck?.status === 'PASS' || programAck?.status === 'FAIL'
    ? programAck.status
    : 'NOT_TESTED';
  const detail = error
    ? `Không xác nhận được ACK từ nguồn program: ${error}`
    : programAck?.reason ?? 'Server chưa trả trạng thái ACK từ nguồn program.';
  return {
    ...response,
    checks: response.checks.map((check) => check.id === 'overlayUpdated'
      ? { ...check, status, detail }
      : check),
  };
}

export function healthSetupStatus(health: { ok: boolean } | null): CheckStatus {
  if (!health) return 'NOT_TESTED';
  return health.ok === true ? 'PASS' : 'FAIL';
}

export function selfTestSetupStatus(result: { ok: boolean } | null): CheckStatus {
  if (!result) return 'NOT_TESTED';
  return result.ok === true ? 'PASS' : 'FAIL';
}

export function nextSetupStep(index: number): number {
  return Math.min(SETUP_STEPS.length - 1, Math.max(0, index + 1));
}

export function previousSetupStep(index: number): number {
  return Math.max(0, Math.min(SETUP_STEPS.length - 1, index - 1));
}

export function setupStepLabel(status: SetupWizardStatus): string {
  return status === 'SKIPPED' ? 'BỎ QUA' : status;
}

export function overlayStatusAfterAction(
  status: SetupWizardStatus,
  action: 'continue' | 'skip',
): SetupWizardStatus {
  return action === 'skip' ? 'SKIPPED' : status;
}

export function isSetupComplete(storage: Pick<Storage, 'getItem'>): boolean {
  return storage.getItem(SETUP_DONE_KEY) === '1';
}
