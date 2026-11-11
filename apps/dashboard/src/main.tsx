import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  DANGEROUS_COMMANDS,
  SessionConfigSchema,
  type AdminSnapshot,
  type CommandBody,
  type CommandEnvelope,
  type CommandType,
  type CreateSessionRequest,
  type SimulatorRequest,
} from '@quiz/contracts';
import { ApiError, apiClient, type DashboardClient, type SocketStatus } from './api/client';
import { mockClient } from './api/mockClient';
import { actionsFor, buildCommandEnvelope, commandErrorMessage, commandForAction, dangerousActions, type DashboardAction } from './logic';
import './style.css';

const TOKEN_KEY = 'quiz.adminToken';
const isMock = new URLSearchParams(location.search).get('mock') === '1';
const client: DashboardClient = isMock ? mockClient : apiClient;

type RecoveryDecision = 'RESUME' | 'VOID' | 'STOP';
type PendingDanger = { action: DashboardAction; decision?: RecoveryDecision };

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? '');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [timerAnchor, setTimerAnchor] = useState({ serverTimeMs: Date.now(), offsetMs: 0 });
  const [now, setNow] = useState(Date.now());
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsSession, setNeedsSession] = useState(isMock);
  const [operatorId, setOperatorId] = useState('operator');
  const [pendingDanger, setPendingDanger] = useState<PendingDanger | null>(null);
  const [reason, setReason] = useState('');
  const [pendingEnvelope, setPendingEnvelope] = useState<CommandEnvelope | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);

  useEffect(() => () => disconnectRef.current?.(), []);

  const connectSession = useCallback((id: string, next: AdminSnapshot, auth: string) => {
    disconnectRef.current?.();
    setSessionId(id);
    setSnapshot(next);
    setTimerAnchor({ serverTimeMs: Date.now(), offsetMs: 0 });
    setNeedsSession(false);
    setError('');
    setSocketStatus('connecting');
    disconnectRef.current = client.subscribe(auth, (nextSnapshot, serverTimeMs) => {
      setSnapshot(nextSnapshot);
      setTimerAnchor({ serverTimeMs, offsetMs: serverTimeMs - Date.now() });
    }, setSocketStatus);
  }, []);

  useEffect(() => {
    if (!snapshot?.public.timer?.running) return;
    const interval = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(interval);
  }, [snapshot?.public.timer?.running, snapshot?.public.timer?.remainingMs, timerAnchor.serverTimeMs]);

  useEffect(() => {
    if (!isMock) return;
    let active = true;
    void client.currentSession().then(async (id) => {
      if (!active || !id) return;
      const next = await client.getState('', id);
      if (active) connectSession(id, next, '');
    }).catch((cause: unknown) => { if (active) setError(errorText(cause)); });
    return () => { active = false; };
  }, [connectSession]);

  async function connectToServer(event: React.FormEvent) {
    event.preventDefault();
    const cleanToken = token.trim();
    if (!isMock && !cleanToken) {
      setError('Nhập mã quản trị để kết nối.');
      return;
    }
    setBusy(true);
    setError('');
    if (!isMock) sessionStorage.setItem(TOKEN_KEY, cleanToken);
    try {
      const openSession = await client.currentSession();
      if (openSession) {
        const next = await client.getState(cleanToken, openSession);
        connectSession(openSession, next, cleanToken);
      } else {
        setNeedsSession(true);
      }
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  async function createSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const cleanToken = token.trim();
    if (!isMock && !cleanToken) {
      setError('Nhập mã quản trị để tạo phiên.');
      return;
    }
    const config = SessionConfigSchema.parse({
      mode: 'MOCK',
      questionsPerRound: Number(data.get('questionCount')),
      allowDemoQuestions: true,
      speedMultiplier: Number(data.get('speedMultiplier')),
      ...(String(data.get('seed')).trim() ? { seed: Number(data.get('seed')) } : {}),
    });
    const request: CreateSessionRequest = { name: String(data.get('name') || 'Phiên LIVE').trim(), config };
    setBusy(true);
    setError('');
    try {
      try {
        const created = await client.createSession(cleanToken, request);
        connectSession(created.sessionId, created.snapshot, cleanToken);
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 409 && isRecord(cause.details) && typeof cause.details.sessionId === 'string') {
          const id = cause.details.sessionId;
          connectSession(id, await client.getState(cleanToken, id), cleanToken);
        } else {
          throw cause;
        }
      }
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  async function refreshSessionSnapshot() {
    if (!sessionId) return;
    const latest = await client.getState(token.trim(), sessionId);
    setSnapshot(latest);
    setTimerAnchor({ serverTimeMs: Date.now(), offsetMs: 0 });
  }

  async function submitEnvelope(envelope: CommandEnvelope) {
    if (!snapshot || !sessionId) return;
    setPendingEnvelope(envelope);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await client.sendCommand(token.trim(), sessionId, envelope);
      const message = response.result.ok ? '' : response.result.message;
      if (response.status === 409) {
        setError(commandErrorMessage(409, message));
        setPendingEnvelope(null);
      } else if (response.status === 422) {
        setError(commandErrorMessage(422, message));
        setPendingEnvelope(null);
      } else if (!response.result.ok) {
        setError(commandErrorMessage(response.status, message));
        setPendingEnvelope(null);
      } else {
        setNotice('Đã gửi lệnh.');
        setPendingEnvelope(null);
        await refreshSessionSnapshot();
      }
    } catch (cause) {
      setError('Mất kết nối khi gửi lệnh. Có thể gửi lại bằng chính commandId này.');
    } finally {
      setBusy(false);
    }
  }

  function beginAction(action: DashboardAction) {
    if (!snapshot) return;
    if (action.danger || DANGEROUS_COMMANDS.includes(action.type)) {
      setReason('');
      setPendingDanger({ action });
      return;
    }
    const enabled = action.type === 'SET_AUTO_MODE' ? !snapshot.autoMode : undefined;
    const command = commandForAction(action, snapshot, undefined, enabled);
    void submitEnvelope(buildCommandEnvelope(snapshot, command, operatorId));
  }

  function openRecovery(decision: RecoveryDecision) {
    const label = decision === 'RESUME' ? 'Tiếp tục phiên' : decision === 'VOID' ? 'Huỷ câu hiện tại' : 'Dừng phiên';
    setReason('');
    setPendingDanger({ action: { type: 'RESOLVE_RECOVERY', label, danger: true }, decision });
  }

  function confirmDanger(event: React.FormEvent) {
    event.preventDefault();
    if (!pendingDanger || !snapshot || reason.trim().length < 3) return;
    let command: CommandBody;
    if (pendingDanger.action.type === 'RESOLVE_RECOVERY') {
      command = { type: 'RESOLVE_RECOVERY', decision: pendingDanger.decision ?? 'STOP', reason: reason.trim() };
    } else {
      command = commandForAction(pendingDanger.action, snapshot, reason.trim());
    }
    setPendingDanger(null);
    void submitEnvelope(buildCommandEnvelope(snapshot, command, operatorId));
  }

  async function controlSimulator(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionId) return;
    const data = new FormData(event.currentTarget);
    const request: SimulatorRequest = {
      action: snapshot?.simulator?.running ? 'STOP' : 'START',
      players: Number(data.get('players')),
      accuracy: Number(data.get('accuracy')),
      participation: Number(data.get('participation')),
      spamRate: 0.15,
      noiseRate: 0.1,
      seed: 20261111,
    };
    await runRequest(() => client.controlSimulator(token.trim(), sessionId, request), 'Đã cập nhật mô phỏng.');
  }

  async function controlConnection(action: 'LOSE' | 'RESTORE') {
    if (!sessionId) return;
    await runRequest(() => client.controlConnection(token.trim(), sessionId, action), action === 'LOSE' ? 'Đã mô phỏng mất kết nối.' : 'Đã khôi phục kết nối nguồn.');
  }

  async function sendManualComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionId) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    await runRequest(() => client.sendComment(token.trim(), sessionId, {
      userId: String(data.get('userId')).trim(),
      displayName: String(data.get('displayName')).trim(),
      text: String(data.get('text')).trim(),
    }), 'Đã gửi bình luận mô phỏng.');
    form.reset();
  }

  async function runRequest<T>(request: () => Promise<T>, success: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request();
      setNotice(success);
      await refreshSessionSnapshot();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  const actions = useMemo(() => snapshot ? actionsFor(snapshot) : [], [snapshot]);
  const recoveryPending = snapshot?.recoveryPending ?? false;
  const timerRemainingMs = snapshot?.public.timer
    ? Math.max(0, snapshot.public.timer.remainingMs - Math.max(0, now + timerAnchor.offsetMs - timerAnchor.serverTimeMs))
    : null;

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">BV</span><div><b>BÁ VƯƠNG</b><span>ĐẠI CHIẾN · LIVE CONTROL</span></div></div>
      <div className="topbar-right">
        <span className={`mode-pill ${isMock ? 'mode-mock' : ''}`}>{isMock ? 'MOCK · DEMO' : 'LOCAL SERVER'}</span>
        {sessionId && <span className={`socket-pill socket-${socketStatus}`}><i />{socketLabel(socketStatus)}</span>}
      </div>
    </header>

    {snapshot && sessionId ? <>
      <section className="session-heading">
        <div><span className="eyebrow">ĐIỀU KHIỂN PHIÊN</span><h1>{snapshot.config.mode === 'MOCK' ? 'Phiên MOCK' : 'Phiên LIVE'}</h1></div>
        <div className="session-meta"><span>ID <b>{sessionId}</b></span><span>Phiên bản <b>{snapshot.public.stateVersion}</b></span><span>Round <b>{snapshot.public.round?.roundNumber ?? '—'}</b></span></div>
      </section>
      {error && <div className="alert alert-error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Đóng">×</button></div>}
      {notice && <div className="alert alert-success" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Đóng">×</button></div>}
      {pendingEnvelope && <button className="retry-button" type="button" disabled={busy} onClick={() => void submitEnvelope(pendingEnvelope)}>Gửi lại lệnh cùng commandId</button>}

      {recoveryPending && <section className="recovery-banner">
        <div><b>Hệ thống vừa khởi động lại</b><span>Phiên đang chờ operator quyết định.</span></div>
        <div className="recovery-actions">
          <button type="button" onClick={() => openRecovery('RESUME')}>Tiếp tục</button>
          <button type="button" onClick={() => openRecovery('VOID')}>Huỷ câu</button>
          <button type="button" className="danger-button" onClick={() => openRecovery('STOP')}>Dừng</button>
        </div>
      </section>}

      <div className="dashboard-grid">
        <div className="main-column">
          <section className="panel state-panel">
            <div className="panel-title"><div><span className="eyebrow">TRẠNG THÁI HIỆN TẠI</span><h2>{stateName(snapshot.public.state)}</h2></div><span className={`state-chip state-${snapshot.public.state.toLowerCase()}`}>{sceneName(snapshot.public.state, snapshot.public.scene)}</span></div>
            <div className="state-metrics">
              <Metric label="CÂU HỎI" value={`${(snapshot.public.round?.questionIndex ?? 0) + 1} / ${snapshot.public.round?.questionCount ?? snapshot.config.questionsPerRound}`} />
              <Metric label="THỜI GIAN" value={timerRemainingMs === null ? '—' : `${Math.ceil(timerRemainingMs / 1000)}s`} />
              <Metric label="ĐÃ TRẢ LỜI" value={snapshot.public.answerCount} />
              <Metric label="NGƯỜI THAM GIA" value={snapshot.public.participantCount} />
            </div>
            <div className="mc-status" data-testid="mc-bubble"><span className="mc-mark">MC</span><div><small>MC KELLY · {snapshot.public.mc.state.toUpperCase()}</small><p>{snapshot.public.mc.bubble}</p></div></div>
            <div className="connection-line"><span className={`connection-dot connection-${snapshot.public.connection.toLowerCase()}`} />Nguồn bình luận <b>{connectionName(snapshot.public.connection)}</b><span className="connection-spacer" />WebSocket <b>{socketLabel(socketStatus)}</b></div>
            <div className="operator-answer"><div><small>ĐÁP ÁN ĐÚNG · CHỈ HIỂN THỊ CHO OPERATOR</small><strong>{snapshot.current?.correctOptionId ?? '—'}</strong></div><span>{snapshot.public.question?.options.find((option) => option.id === snapshot.current?.correctOptionId)?.text ?? 'Chưa có câu hỏi đang mở'}</span></div>
            <div className="answer-distribution"><b>Phân bố A / B / C / D</b><div>{(['A', 'B', 'C', 'D'] as const).map((option) => <span key={option}><i>{option}</i><strong>{snapshot.current?.optionCounts[option] ?? 0}</strong></span>)}</div></div>
          </section>

          <section className="panel actions-panel">
            <div className="panel-title"><div><span className="eyebrow">ĐIỀU HÀNH</span><h2>Lệnh an toàn</h2></div><label className="operator-input">Operator ID<input value={operatorId} onChange={(event) => setOperatorId(event.target.value)} maxLength={100} /></label></div>
            <div className="action-buttons">
              {actions.map((action) => <button key={action.type} type="button" className="primary-button" disabled={busy || snapshot.sessionStatus !== 'OPEN'} onClick={() => beginAction(action)}>
                {action.type === 'SET_AUTO_MODE' ? (snapshot.autoMode ? 'Tắt Auto' : 'Bật Auto') : action.label}
              </button>)}
              {snapshot.public.state === 'CONNECTION_INTERRUPTED' && <button className="primary-button" type="button" onClick={() => beginAction({ type: 'RESUME', label: 'Tiếp tục' })}>Tiếp tục</button>}
              {snapshot.public.state === 'ERROR' && <button className="primary-button" type="button" onClick={() => beginAction({ type: 'STOP', label: 'Dừng phiên', danger: true })}>Dừng phiên</button>}
            </div>
            <div className="danger-actions"><span>HÀNH ĐỘNG CẦN LÝ DO</span>{dangerousActions.map((action) => {
              const state = snapshot.public.state;
              const allowed = action.type === 'STOP' ? snapshot.sessionStatus === 'OPEN'
                : action.type === 'RESTART_ROUND' ? ['LOBBY', 'PREPARE', 'ACCEPTING', 'REVEAL', 'LEADERBOARD', 'ROUND_END', 'VICTORY', 'INTERMISSION', 'PAUSED'].includes(state)
                  : ['PREPARE', 'ACCEPTING', 'REVEAL', 'PAUSED', 'CONNECTION_INTERRUPTED'].includes(state);
              return <button key={action.type} type="button" disabled={!allowed || busy} onClick={() => beginAction(action)}>{action.label}</button>;
            })}</div>
          </section>

          <section className="panel simulator-panel">
            <div className="panel-title"><div><span className="eyebrow">CHỈ DÙNG TRONG MOCK</span><h2>Giả lập tương tác</h2></div><span className={`simulator-status ${snapshot.simulator?.running ? 'is-running' : ''}`}>{snapshot.simulator?.running ? `ĐANG CHẠY · ${snapshot.simulator.players} người` : 'ĐANG TẮT'}</span></div>
            <form className="simulator-form" onSubmit={(event) => void controlSimulator(event)}>
              <label>Số người<input name="players" type="number" min={1} max={2000} defaultValue={100} /></label>
              <label>Độ chính xác<input name="accuracy" type="number" min={0} max={1} step={0.05} defaultValue={0.6} /></label>
              <label>Tỉ lệ tham gia<input name="participation" type="number" min={0} max={1} step={0.05} defaultValue={0.9} /></label>
              <button type="submit" className={snapshot.simulator?.running ? 'secondary-button' : 'primary-button'} disabled={busy}>{snapshot.simulator?.running ? 'Dừng mô phỏng' : 'Bắt đầu mô phỏng'}</button>
            </form>
            <div className="split-controls"><button type="button" className="secondary-button" disabled={busy || snapshot.public.connection !== 'CONNECTED'} onClick={() => void controlConnection('LOSE')}>Rớt kết nối</button><button type="button" className="secondary-button" disabled={busy || snapshot.public.connection === 'CONNECTED'} onClick={() => void controlConnection('RESTORE')}>Có kết nối lại</button></div>
            <form className="comment-form" onSubmit={(event) => void sendManualComment(event)}>
              <span className="form-section-label">GỬI BÌNH LUẬN TAY</span>
              <label>User ID<input name="userId" required maxLength={200} defaultValue="demo-viewer-01" /></label>
              <label>Tên hiển thị<input name="displayName" required maxLength={400} defaultValue="Người xem DEMO" /></label>
              <label>Nội dung<input name="text" required maxLength={2000} placeholder="A, B, C hoặc D" /></label>
              <button className="secondary-button" disabled={busy}>Gửi bình luận</button>
            </form>
          </section>
        </div>

        <aside className="side-column">
          <section className="panel leaderboard-panel"><div className="panel-title"><div><span className="eyebrow">{leaderboardLabel(snapshot.public.state, snapshot.public.scene, snapshot.public.leaderboard?.kind)}</span><h2>Top 10</h2></div><span className="muted">{snapshot.public.leaderboard?.entries.length ?? 0} người</span></div>
            {snapshot.public.leaderboard?.entries.length ? <div className="dashboard-leaderboard">{snapshot.public.leaderboard.entries.slice(0, 10).map((entry) => <div className="dashboard-leaderboard-row" key={entry.playerId}><b>{entry.rank}{entry.tied && <small>ĐỒNG HẠNG</small>}</b><span>{entry.displayName}</span><strong>{entry.score.toLocaleString('vi-VN')}<small>{entry.correctCount} đúng</small></strong></div>)}</div> : <p className="empty-state">Bảng xếp hạng xuất hiện sau khi bắt đầu chơi.</p>}
            <div className="overlay-links"><a href="http://127.0.0.1:5174/" target="_blank" rel="noreferrer">Mở overlay ↗</a><a href="http://127.0.0.1:5174/?guides=1" target="_blank" rel="noreferrer">Overlay + lưới ↗</a></div>
          </section>

          <section className="panel diagnostics-panel"><div className="panel-title"><div><span className="eyebrow">GIÁM SÁT</span><h2>Chẩn đoán</h2></div></div>
            <div className="ingest-metrics"><span>Nhận <b>{snapshot.metrics.received}</b></span><span>Chấp nhận <b>{snapshot.metrics.accepted}</b></span><span>Từ chối <b>{Object.values(snapshot.metrics.rejected).reduce((sum, value) => sum + value, 0)}</b></span></div>
            <div className="rejection-list"><b>Lý do từ chối gần đây</b>{snapshot.recentRejections.slice(0, 20).length ? snapshot.recentRejections.slice(0, 20).map((item, index) => <div key={`${item.atMs}-${index}`}><span>{rejectName(item.reason)}</span><time>{new Date(item.atMs).toLocaleTimeString('vi-VN')}</time></div>) : <p>Chưa có sự kiện bị từ chối.</p>}</div>
            <div className={`pool-warning ${snapshot.pool.lowPoolWarning ? 'is-warning' : ''}`}><span>{snapshot.pool.lowPoolWarning ? '⚠' : '✓'}</span><div><b>{snapshot.pool.lowPoolWarning ? 'Kho câu hỏi sắp cạn' : 'Kho câu hỏi sẵn sàng'}</b><small>{snapshot.pool.unusedInSession} câu còn dùng · cần {snapshot.pool.requiredNextRound} câu/vòng</small></div></div>
            <details className="metrics-details"><summary>Chi tiết theo lý do</summary>{Object.entries(snapshot.metrics.rejected).map(([key, value]) => <div key={key}><span>{rejectName(key)}</span><b>{value}</b></div>)}</details>
          </section>
          <section className="panel safe-zone-panel"><div className="panel-title"><div><span className="eyebrow">PREVIEW</span><h2>Vùng an toàn</h2></div></div><p>Preset thử nghiệm — không phải số chính thức TikTok.</p><div className="safe-values"><span>Trên <b>{snapshot.public.safeZone.top}px</b></span><span>Dưới <b>{snapshot.public.safeZone.bottom}px</b></span><span>Phải <b>{snapshot.public.safeZone.right}px</b></span></div></section>
        </aside>
      </div>
    </> : <section className="entry-layout">
      <div className="entry-card">
        <span className="eyebrow">TIKTOK LIVE QUIZ</span><h1>{needsSession ? 'Tạo phiên MOCK' : 'Kết nối điều khiển'}</h1>
        <p>{isMock ? 'Môi trường thử nghiệm trong trình duyệt. Không cần server.' : 'Kết nối tới server cục bộ để điều khiển phiên quiz.'}</p>
        {!isMock && <form className="entry-form" onSubmit={(event) => void connectToServer(event)}>
          <label>Mã quản trị<input type="password" autoComplete="current-password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Dán mã từ data/admin-token.txt" /></label>
          <button className="primary-button" disabled={busy}>{busy ? 'Đang kết nối…' : 'Kết nối'}</button>
        </form>}
        {needsSession && <form className="create-form" onSubmit={(event) => void createSession(event)}>
          <label>Tên phiên<input name="name" maxLength={100} defaultValue="Phiên DEMO" /></label>
          <div className="form-row"><label>Số câu mỗi vòng<select name="questionCount" defaultValue="15"><option value="10">10 câu</option><option value="15">15 câu</option><option value="20">20 câu</option></select></label><label>Tốc độ MOCK<select name="speedMultiplier" defaultValue="1">{Array.from({ length: 20 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}×</option>)}</select></label></div>
          <label>Seed (tuỳ chọn)<input name="seed" type="number" placeholder="Để trống để tự tạo" /></label>
          <div className="demo-enabled">✓ Cho phép câu hỏi DEMO · nguồn MOCK</div>
          <button className="primary-button" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo phiên và mở Live Control'}</button>
        </form>}
        {error && <div className="alert alert-error" role="alert">{error}</div>}
      </div>
      <div className="entry-note"><div className="entry-orbit" /><span>01 / LOCAL CONTROL</span><strong>Điều hành<br />trận đấu</strong><p>Trạng thái, người chơi, điểm số và kết nối trong cùng một màn hình.</p></div>
    </section>}

    {pendingDanger && <div className="modal-backdrop" role="presentation"><form className="danger-modal" role="dialog" aria-modal="true" aria-labelledby="danger-title" onSubmit={confirmDanger}>
      <span className="danger-icon">!</span><h2 id="danger-title">Xác nhận: {pendingDanger.action.label}</h2><p>Hành động này cần ghi lý do vào nhật ký vận hành.</p>
      <label>Lý do <textarea autoFocus required minLength={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập ít nhất 3 ký tự" /></label>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setPendingDanger(null)}>Huỷ</button><button type="submit" className="danger-button" disabled={reason.trim().length < 3 || busy}>Xác nhận</button></div>
    </form></div>}
  </main>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="metric"><span>{label}</span><b>{value}</b></div>;
}

function errorText(cause: unknown) {
  if (cause instanceof ApiError) return commandErrorMessage(cause.status, cause.message);
  if (cause instanceof Error) return cause.message;
  return 'Có lỗi không xác định.';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function socketLabel(status: SocketStatus) {
  return status === 'connected' ? 'Đã kết nối' : status === 'reconnecting' ? 'Đang kết nối lại' : status === 'connecting' ? 'Đang kết nối' : 'Đã ngắt';
}

function stateName(state: string) {
  const names: Record<string, string> = { IDLE: 'Chưa bắt đầu', LOBBY: 'Phòng chờ', PREPARE: 'Chuẩn bị', ACCEPTING: 'Đang nhận đáp án', REVEAL: 'Công bố đáp án', LEADERBOARD: 'Bảng xếp hạng', ROUND_END: 'Kết thúc vòng', VICTORY: 'Vinh danh', INTERMISSION: 'Nghỉ giữa vòng', PAUSED: 'Tạm dừng', CONNECTION_INTERRUPTED: 'Mất kết nối', ERROR: 'Lỗi kỹ thuật' };
  return names[state] ?? state;
}

function sceneName(state: string, scene: string) {
  if (state === 'LEADERBOARD' && scene === 'REVEAL') return 'BXH NGẮN · 4 GIÂY';
  if (state === 'LEADERBOARD' && scene === 'INTERIM_TOP10') return 'BXH LỚN · MỐC CÂU';
  return scene;
}

function leaderboardLabel(state: string, scene: string, kind?: string) {
  if (state === 'LEADERBOARD' && scene === 'REVEAL') return 'LEADERBOARD NGẮN · SAU CÂU';
  if (scene === 'INTERIM_TOP10' || kind === 'FULL') return 'BXH ĐẦY ĐỦ · TOP 10';
  if (kind === 'COMPACT') return 'BXH GỌN · TOP 10';
  return 'BẢNG ĐIỂM';
}

function connectionName(status: string) {
  return status === 'CONNECTED' ? 'Đã kết nối' : status === 'BLOCKED' ? 'Bị chặn' : status;
}

function rejectName(reason: string) {
  const names: Record<string, string> = { INVALID_EVENT: 'Sự kiện không hợp lệ', NOT_AN_ANSWER: 'Không phải đáp án', NOT_ACCEPTING: 'Chưa nhận đáp án', EARLY: 'Gửi quá sớm', LATE: 'Hết thời gian', DUPLICATE_EVENT: 'Sự kiện trùng', DUPLICATE_ANSWER: 'Đáp án trùng', STALE_SOURCE_TIMESTAMP: 'Thời điểm sự kiện cũ' };
  return names[reason] ?? reason;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
