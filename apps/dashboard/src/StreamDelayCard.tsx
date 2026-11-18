import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, type DashboardClient, type StreamDelayMode, type StreamDelaySnapshot, type UpdateStreamDelaySettings } from './api/client';

const DEFAULT_STREAM_DELAY: StreamDelaySnapshot = {
  mode: 'AUTO',
  nextQuestionDelayMs: 2_000,
  activeQuestionDelayMs: null,
  manualDelayMs: 2_000,
};

export function formatStreamDelayMs(value: number | null) {
  if (value === null) return '—';
  return `${(value / 1_000).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
}

function errorMessage(cause: unknown) {
  if (cause instanceof ApiError || cause instanceof Error) return cause.message;
  return 'Không lưu được cấu hình bù trễ LIVE.';
}

type Props = {
  client: DashboardClient;
  token: string;
  sessionId: string;
  streamDelay?: StreamDelaySnapshot;
  disabled: boolean;
  onSaved: (streamDelay: StreamDelaySnapshot) => void;
};

export function StreamDelayCard({ client, token, sessionId, streamDelay, disabled, onSaved }: Props) {
  const current = streamDelay ?? DEFAULT_STREAM_DELAY;
  const [manualSeconds, setManualSeconds] = useState((current.manualDelayMs / 1_000).toString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setManualSeconds((current.manualDelayMs / 1_000).toString());
  }, [current.manualDelayMs]);

  async function save(update: UpdateStreamDelaySettings, success: string) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await client.updateStreamDelaySettings(token, sessionId, update);
      onSaved(response.streamDelay);
      setNotice(success);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  function toggleMode() {
    const mode: StreamDelayMode = current.mode === 'AUTO' ? 'MANUAL' : 'AUTO';
    void save({ mode, ...(mode === 'MANUAL' ? { manualDelayMs: current.manualDelayMs } : {}) }, `Đã chuyển sang ${mode === 'AUTO' ? 'Tự động' : 'Thủ công'}.`);
  }

  function applyManualDelay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const seconds = Number(manualSeconds);
    const milliseconds = Math.round(seconds * 1_000);
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 6 || milliseconds % 500 !== 0) {
      setError('Nhập mức bù từ 0 đến 6 giây, theo bước 0,5 giây.');
      setNotice('');
      return;
    }
    void save({ mode: 'MANUAL', manualDelayMs: milliseconds }, 'Đã áp dụng từ câu kế tiếp.');
  }

  return <section className="stream-delay-card" data-testid="stream-delay-card" aria-labelledby="stream-delay-title">
    <div className="stream-delay-heading">
      <div><small>KẾT NỐI TIKTOK · CẤU HÌNH PHIÊN</small><h3 id="stream-delay-title">Bù độ trễ LIVE</h3></div>
      <div className="stream-delay-mode">
        <button
          type="button"
          role="switch"
          aria-label="Chế độ bù độ trễ LIVE"
          aria-checked={current.mode === 'MANUAL'}
          disabled={disabled || saving}
          className={`stream-delay-switch ${current.mode === 'MANUAL' ? 'is-manual' : ''}`}
          onClick={toggleMode}
        ><span /></button>
        <b data-testid="stream-delay-mode">{current.mode === 'AUTO' ? 'Tự động' : 'Thủ công'}</b>
      </div>
    </div>

    <div className="stream-delay-values" aria-live="polite">
      <div><span>Câu đang chạy</span><b data-testid="stream-delay-active">{formatStreamDelayMs(current.activeQuestionDelayMs)}</b></div>
      <div><span>Câu kế</span><b data-testid="stream-delay-next">{formatStreamDelayMs(current.nextQuestionDelayMs)}</b></div>
    </div>

    {current.mode === 'MANUAL' && <form className="stream-delay-manual" onSubmit={applyManualDelay}>
      <label htmlFor="stream-delay-seconds">Mức thủ công (giây)</label>
      <div>
        <input
          id="stream-delay-seconds"
          aria-label="Mức bù trễ thủ công (giây)"
          type="number"
          min="0"
          max="6"
          step="0.5"
          required
          value={manualSeconds}
          disabled={disabled || saving}
          onChange={(event) => setManualSeconds(event.currentTarget.value)}
        />
        <button className="secondary-button" type="submit" disabled={disabled || saving}>Áp dụng</button>
      </div>
      <small>Áp dụng từ câu kế tiếp.</small>
    </form>}

    {error && <p className="stream-delay-message is-error" role="alert">{error}</p>}
    {notice && <p className="stream-delay-message" role="status">{notice}</p>}
  </section>;
}
