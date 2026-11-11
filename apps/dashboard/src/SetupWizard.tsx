import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CheckStatus } from '@quiz/contracts';
import type { DashboardClient, HealthResponse, SelfTestResponse, SystemChecksResponse } from './api/client';
import {
  healthSetupStatus,
  INITIAL_SETUP_STATUSES,
  nextSetupStep,
  overlaySetupStatus,
  overlayStatusAfterAction,
  previousSetupStep,
  selfTestSetupStatus,
  SETUP_STEPS,
  setupStepLabel,
  type SetupStepId,
  type SetupStatuses,
  type SetupWizardStatus,
  systemCheckStatus,
} from './setupWizardLogic';
import type { StormArenaInfo } from './desktopBridge';

type SetupWizardProps = {
  client: DashboardClient;
  token: string;
  isDesktop: boolean;
  isMock: boolean;
  desktopInfo: StormArenaInfo | null;
  overlayUrl: string;
  obsGuide: React.ReactNode;
  onConnectToken: (token: string) => Promise<void>;
  onFinish: () => void;
  onDismiss: () => void;
};

const stepCopy: Record<SetupStepId, { eyebrow: string; title: string; description: string }> = {
  health: { eyebrow: 'BƯỚC 01 · HỆ THỐNG', title: 'Kiểm tra hệ thống', description: 'Xác nhận server cục bộ đang phản hồi trước khi tiếp tục.' },
  database: { eyebrow: 'BƯỚC 02 · LƯU TRỮ', title: 'Database', description: 'Đọc đúng kết quả ghi/đọc thử do server trả về.' },
  theme: { eyebrow: 'BƯỚC 03 · GIAO DIỆN', title: 'Theme Pack', description: 'Theme Pack chưa được triển khai; bước này chỉ hiển thị chẩn đoán và không chặn chạy Mock.' },
  tiktokConnector: { eyebrow: 'BƯỚC 04 · NGUỒN COMMENT', title: 'TikTok LIVE Connector', description: 'Nhập username để điền sẵn khi tạo phiên TikTok. Bước này không kết nối hoặc tạo phiên.' },
  mock: { eyebrow: 'BƯỚC 05 · MOCK', title: 'Kiểm tra bằng Mock', description: 'Chạy pipeline tự kiểm trên database tạm; không tác động phiên LIVE.' },
  obs: { eyebrow: 'BƯỚC 06 · PHÁT HÌNH', title: 'OBS / TikTok LIVE Studio', description: 'Xem URL overlay và cách thêm nguồn hình vào phần mềm phát.' },
  overlay: { eyebrow: 'BƯỚC 07 · OVERLAY', title: 'Kiểm tra Overlay', description: 'Mở overlay trong cửa sổ riêng. Wizard tự kiểm tra kết nối và ACK render mỗi 2 giây.' },
  summary: { eyebrow: 'BƯỚC 08 · SẴN SÀNG', title: 'Hoàn tất thiết lập', description: 'Xem lại trạng thái từng bước. Hoàn tất wizard không đồng nghĩa TikTok đã kết nối hoặc đang phát LIVE.' },
};

const stepOrder: SetupStepId[] = SETUP_STEPS.map((step) => step.id);
const TIKTOK_USERNAME_KEY = 'quiz.tiktokUsername';

function readSavedTikTokUsername() {
  try { return localStorage.getItem(TIKTOK_USERNAME_KEY) ?? ''; } catch { return ''; }
}

function statusForStep(status: SetupWizardStatus) {
  const tone = status === 'PASS' ? 'pass' : status === 'FAIL' ? 'fail' : status === 'SKIPPED' ? 'skipped' : 'not-tested';
  return <span className={`setup-status tone-${tone}`}>{setupStepLabel(status)}</span>;
}

function systemStatusLabel(status: CheckStatus) {
  return status === 'NOT_TESTED' ? 'NOT_TESTED' : status;
}

function responseCheck(response: SystemChecksResponse | null, id: 'database' | 'theme' | 'overlay' | 'overlayUpdated') {
  return response?.checks.find((check) => check.id === id);
}

export function SetupWizard({
  client,
  token,
  isDesktop,
  isMock,
  desktopInfo,
  overlayUrl,
  obsGuide,
  onConnectToken,
  onFinish,
  onDismiss,
}: SetupWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [statuses, setStatuses] = useState<SetupStatuses>({ ...INITIAL_SETUP_STATUSES });
  const [offlineMode, setOfflineMode] = useState(false);
  const [tiktokUsername, setTikTokUsername] = useState(readSavedTikTokUsername);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState('');
  const [healthLoading, setHealthLoading] = useState(false);
  const [checks, setChecks] = useState<SystemChecksResponse | null>(null);
  const [checksError, setChecksError] = useState('');
  const [checksLoading, setChecksLoading] = useState(false);
  const [selfTest, setSelfTest] = useState<SelfTestResponse | null>(null);
  const [selfTestError, setSelfTestError] = useState('');
  const [selfTestLoading, setSelfTestLoading] = useState(false);
  const [authValue, setAuthValue] = useState(token);
  const [authLoading, setAuthLoading] = useState(false);
  const [lastOverlayCheck, setLastOverlayCheck] = useState<number | null>(null);
  const checksBusy = useRef(false);
  const overlayCheckActive = useRef(false);
  const currentStep = stepOrder[stepIndex]!;
  const copy = stepCopy[currentStep];

  useEffect(() => setAuthValue(token), [token]);

  const setStepStatus = useCallback((id: SetupStepId, status: SetupWizardStatus) => {
    setStatuses((current) => ({ ...current, [id]: status }));
  }, []);

  const refreshChecks = useCallback(async (authToken = token) => {
    if (checksBusy.current) return null;
    checksBusy.current = true;
    setChecksLoading(true);
    try {
      const result = await client.getSystemChecks(authToken);
      setChecks(result);
      setChecksError('');
      setStepStatus('database', systemCheckStatus(result.checks, 'database'));
      setStepStatus('theme', systemCheckStatus(result.checks, 'theme'));
      if (overlayCheckActive.current) setStepStatus('overlay', overlaySetupStatus(result));
      setLastOverlayCheck(Date.now());
      return result;
    } catch (cause) {
      setChecks(null);
      setChecksError(errorText(cause));
      setStepStatus('database', 'FAIL');
      setStepStatus('theme', 'NOT_TESTED');
      if (overlayCheckActive.current) setStepStatus('overlay', 'FAIL');
      setLastOverlayCheck(Date.now());
      return null;
    } finally {
      checksBusy.current = false;
      setChecksLoading(false);
    }
  }, [client, setStepStatus, token]);

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError('');
    try {
      const result = await client.getHealth();
      setHealth(result);
      setStepStatus('health', healthSetupStatus(result));
    } catch (cause) {
      setHealth(null);
      setHealthError(errorText(cause));
      setStepStatus('health', 'FAIL');
    } finally {
      setHealthLoading(false);
    }
  }, [client, setStepStatus]);

  useEffect(() => {
    if (currentStep !== 'health') return;
    void refreshHealth();
  }, [currentStep, refreshHealth]);

  useEffect(() => {
    if (currentStep !== 'database' && currentStep !== 'theme') return;
    void refreshChecks();
  }, [currentStep, refreshChecks]);

  useEffect(() => {
    if (currentStep !== 'overlay') return;
    overlayCheckActive.current = true;
    void refreshChecks();
    const timer = window.setInterval(() => void refreshChecks(), 2_000);
    return () => {
      overlayCheckActive.current = false;
      window.clearInterval(timer);
    };
  }, [currentStep, refreshChecks]);

  async function runSelfTest() {
    setSelfTestLoading(true);
    setSelfTestError('');
    setSelfTest(null);
    try {
      const result = await client.runSystemSelfTest(token);
      setSelfTest(result);
      setStepStatus('mock', selfTestSetupStatus(result));
    } catch (cause) {
      setSelfTestError(errorText(cause));
      setStepStatus('mock', 'FAIL');
    } finally {
      setSelfTestLoading(false);
    }
  }

  async function connectWithEnteredToken(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = authValue.trim();
    if (!clean) return;
    setAuthLoading(true);
    try {
      await onConnectToken(clean);
      await refreshChecks(clean);
    } finally {
      setAuthLoading(false);
    }
  }

  function skipTikTokOffline() {
    setOfflineMode(true);
    setStepStatus('tiktokConnector', 'SKIPPED');
    setStepIndex(nextSetupStep(stepIndex));
  }

  function updateTikTokUsername(value: string) {
    setTikTokUsername(value);
    try {
      if (value.trim()) localStorage.setItem(TIKTOK_USERNAME_KEY, value.trim());
      else localStorage.removeItem(TIKTOK_USERNAME_KEY);
    } catch {
      // The value remains available for this wizard visit even when browser storage is unavailable.
    }
  }

  function skipOverlayCheck() {
    setStepStatus('overlay', overlayStatusAfterAction(statuses.overlay, 'skip'));
    setStepIndex(nextSetupStep(stepIndex));
  }

  function next() {
    if (currentStep === 'tiktokConnector') {
      skipTikTokOffline();
      return;
    }
    if (currentStep === 'obs') setStepStatus('obs', 'PASS');
    if (currentStep === 'overlay') {
      setStepStatus('overlay', overlayStatusAfterAction(statuses.overlay, 'continue'));
      setStepIndex(nextSetupStep(stepIndex));
      return;
    }
    setStepIndex(nextSetupStep(stepIndex));
  }

  function finish() {
    setStepStatus('summary', 'PASS');
    onFinish();
  }

  const showTokenEntry = !isDesktop && !isMock;
  const databaseCheck = responseCheck(checks, 'database');
  const themeCheck = responseCheck(checks, 'theme');
  const overlayCheck = responseCheck(checks, 'overlay');
  const overlayUpdatedCheck = responseCheck(checks, 'overlayUpdated');
  const databaseStatus = checksError ? 'FAIL' : systemCheckStatus(checks?.checks, 'database');
  const overlayStatus = checksError ? 'FAIL' : systemCheckStatus(checks?.checks, 'overlay');
  const overlayUpdatedStatus = checksError ? 'FAIL' : systemCheckStatus(checks?.checks, 'overlayUpdated');

  return <main className="setup-wizard" data-testid="setup-wizard">
    <div className="setup-heading">
      <div><span className="eyebrow">FIRST-RUN SETUP · 8 BƯỚC</span><h1>Chuẩn bị phiên LIVE Quiz</h1><p>Kiểm tra server, chế độ offline và nguồn hình trước khi điều hành.</p></div>
      <div className="setup-heading-actions"><span className="setup-step-count">BƯỚC {stepIndex + 1} / {SETUP_STEPS.length}</span><button className="secondary-button" type="button" onClick={onDismiss}>Thoát hướng dẫn</button></div>
    </div>
    <div className="setup-progress" aria-hidden="true"><span style={{ width: `${((stepIndex + 1) / SETUP_STEPS.length) * 100}%` }} /></div>

    <div className="setup-layout">
      <nav className="setup-step-list" aria-label="Các bước thiết lập">
        {SETUP_STEPS.map((step, index) => <div className={`setup-step-nav ${stepIndex === index ? 'is-current' : ''} ${statuses[step.id] === 'PASS' ? 'has-passed' : ''}`} key={step.id} aria-current={stepIndex === index ? 'step' : undefined}>
          <span className="setup-step-number">{String(index + 1).padStart(2, '0')}</span><span className="setup-step-label">{step.label}</span>{statusForStep(statuses[step.id])}
        </div>)}
      </nav>

      <section className="setup-stage" aria-live="polite">
        <header className="setup-stage-heading"><div><span className="eyebrow">{copy.eyebrow}</span><h2>{copy.title}</h2><p>{copy.description}</p></div>{statusForStep(statuses[currentStep])}</header>

        {currentStep === 'health' && <div className="setup-check-panel" data-testid="setup-step-health">
          <div className="setup-fact-grid"><div><small>SERVER</small><b>{healthLoading ? 'Đang kiểm tra…' : health?.ok ? 'Đang hoạt động' : 'Chưa xác nhận'}</b></div><div><small>CONTRACT</small><b>{health?.contractVersion ? `v${health.contractVersion}` : '—'}</b></div><div><small>ỨNG DỤNG DESKTOP</small><b>{isDesktop ? desktopInfo?.version ?? 'Đang tải phiên bản…' : 'Chạy trong trình duyệt'}</b></div></div>
          {healthError && <p className="setup-inline-error" role="alert">Không xác nhận được /health: {healthError}</p>}
          {health && <p className="setup-inline-detail">{health.sessionId ? 'Đã tìm thấy phiên OPEN.' : 'Server sẵn sàng; chưa có phiên OPEN.'}</p>}
          <button className="secondary-button" type="button" disabled={healthLoading} onClick={() => void refreshHealth()}>{healthLoading ? 'Đang kiểm tra…' : 'Kiểm tra lại'}</button>
        </div>}

        {currentStep === 'database' && <div className="setup-check-panel" data-testid="setup-step-database">
          {showTokenEntry && <form className="setup-token-form" onSubmit={(event) => void connectWithEnteredToken(event)}><label>Mã quản trị<input type="password" autoComplete="current-password" value={authValue} onChange={(event) => setAuthValue(event.target.value)} placeholder="Dán mã từ data/admin-token.txt" /></label><button className="secondary-button" type="submit" disabled={authLoading || !authValue.trim()}>{authLoading ? 'Đang kết nối…' : 'Kết nối và kiểm tra lại'}</button></form>}
          <CheckDetail status={databaseStatus} detail={databaseCheck?.detail ?? (checksError || 'Server chưa trả trạng thái database.')} />
          <button className="secondary-button" type="button" disabled={checksLoading} onClick={() => void refreshChecks()}>{checksLoading ? 'Đang kiểm tra…' : 'Kiểm tra lại'}</button>
        </div>}

        {currentStep === 'theme' && <div className="setup-check-panel" data-testid="setup-step-theme">
          <CheckDetail status={systemCheckStatus(checks?.checks, 'theme')} detail={themeCheck?.detail ?? 'Server chưa trả trạng thái Theme Pack.'} />
          <p className="setup-note">Theme Pack chưa được triển khai. Trạng thái NOT_TESTED không chặn chế độ offline (Mock).</p>
          {checksError && <p className="setup-inline-error" role="alert">{checksError}</p>}
        </div>}

        {currentStep === 'tiktokConnector' && <div className="setup-check-panel" data-testid="setup-step-tiktok">
          <label>TikTok username<input value={tiktokUsername} onChange={(event) => updateTikTokUsername(event.target.value)} placeholder="@ten_tai_khoan hoặc URL TikTok LIVE" /></label>
          <p className="setup-note">Username chỉ được lưu trên thiết bị để điền sẵn khi tạo phiên TikTok. Bước này không tạo phiên.</p>
          <button className="primary-button" type="button" onClick={skipTikTokOffline}>Bỏ qua — chạy offline</button>
        </div>}

        {currentStep === 'mock' && <div className="setup-check-panel" data-testid="setup-step-mock">
          <div className="setup-selftest-card"><span className="setup-selftest-icon">M</span><div><b>Tự kiểm pipeline MOCK</b><p>Server dùng database tạm, không đụng phiên LIVE đang mở.</p></div><button className="primary-button" type="button" disabled={selfTestLoading} onClick={() => void runSelfTest()}>{selfTestLoading ? 'Đang tự kiểm…' : 'Chạy tự kiểm'}</button></div>
          {selfTest && <div className={`setup-result tone-${selfTest.ok ? 'pass' : 'fail'}`} role="status"><b>{selfTest.ok ? 'PASS · Pipeline hoạt động' : 'FAIL · Tự kiểm chưa đạt'}</b><span>{selfTest.detail} · {selfTest.durationMs} ms</span></div>}
          {selfTestError && <p className="setup-inline-error" role="alert">{selfTestError}</p>}
        </div>}

        {currentStep === 'obs' && <div className="setup-obs-guide" data-testid="setup-step-obs">{obsGuide}</div>}

        {currentStep === 'overlay' && <div className="setup-check-panel" data-testid="setup-step-overlay">
          <div className="setup-overlay-actions"><a className="primary-button" href={overlayUrl} target="_blank" rel="noreferrer">Mở Overlay URL ↗</a><button className="secondary-button" type="button" disabled={checksLoading} onClick={() => void refreshChecks()}>{checksLoading ? 'Đang kiểm tra…' : 'Làm mới ngay'}</button></div>
          <div className="setup-check-grid">
            <CheckDetail status={overlayStatus} label="Overlay hiển thị" detail={overlayCheck?.detail ?? (checksError || 'Đang đợi overlay kết nối.')} />
            <CheckDetail status={overlayUpdatedStatus} label="Overlay cập nhật đúng" detail={overlayUpdatedCheck?.detail ?? (checksError || 'Đang đợi ACK sau khi overlay render.')} />
          </div>
          <p className="setup-poll-note">{lastOverlayCheck ? `Tự kiểm tra lại mỗi 2 giây · lần gần nhất ${new Date(lastOverlayCheck).toLocaleTimeString('vi-VN')}` : 'Đang chờ lần kiểm tra đầu tiên…'}</p>
          <button className="secondary-button" type="button" onClick={skipOverlayCheck}>Kiểm tra sau</button>
        </div>}

        {currentStep === 'summary' && <div className="setup-summary" data-testid="setup-step-summary">
          {offlineMode && <div className="setup-offline-banner"><b>Chế độ offline</b><span>TikTok LIVE Connector đã được bỏ qua; bạn vẫn có thể chạy phiên Mock.</span></div>}
          <div className="setup-summary-list">{SETUP_STEPS.map((step, index) => <div className="setup-summary-row" key={step.id}><span>{String(index + 1).padStart(2, '0')}</span><b>{step.label}</b>{statusForStep(statuses[step.id])}</div>)}</div>
          <p className="setup-note">PASS chỉ xác nhận đúng bước đã kiểm tra. FAIL và NOT_TESTED vẫn được giữ nguyên trong bản tóm tắt; việc hoàn tất wizard không đổi chúng thành PASS.</p>
        </div>}

        <footer className="setup-navigation">
          <button className="secondary-button" type="button" disabled={stepIndex === 0} onClick={() => setStepIndex(previousSetupStep(stepIndex))}>Quay lại</button>
          <span>{stepIndex + 1} trên {SETUP_STEPS.length}</span>
          {currentStep === 'summary'
            ? <button className="primary-button" type="button" onClick={finish}>Hoàn tất thiết lập</button>
            : <button className="primary-button" type="button" onClick={next}>Tiếp</button>}
        </footer>
      </section>
    </div>
  </main>;
}

function CheckDetail({ status, detail, label }: { status: CheckStatus; detail: string; label?: string }) {
  return <div className="setup-check-detail"><div><b>{label ?? 'Trạng thái server'}</b><p>{detail}</p></div><span className={`setup-status tone-${status === 'PASS' ? 'pass' : status === 'FAIL' ? 'fail' : 'not-tested'}`}>{systemStatusLabel(status)}</span></div>;
}

function errorText(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return 'Có lỗi không xác định.';
}
