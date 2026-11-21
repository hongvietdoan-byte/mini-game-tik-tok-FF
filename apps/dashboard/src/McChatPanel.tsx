import { useEffect, useState } from 'react';
import { MAX_MC_CHAT_TEXT_CHARS, type AdminSnapshot, type McChatPreset, type McChatQueueItem } from '@quiz/contracts';
import { ApiError, type DashboardClient } from './api/client';
import './mcChatPanel.css';

const STATUS_TEXT: Record<McChatQueueItem['status'], string> = {
  GENERATING: 'Đang tạo giọng…',
  QUEUED: 'Chờ MC rảnh',
  PLAYING: 'Đang phát',
  DONE: 'Xong',
  ERROR: 'Lỗi giọng',
  CANCELLED: 'Đã huỷ',
};

export function McChatPanel({ client, token, snapshot, isMock }: {
  client: DashboardClient; token: string; snapshot: AdminSnapshot; isMock: boolean;
}) {
  const sessionId = snapshot.public.sessionId;
  const [text, setText] = useState('');
  const [speak, setSpeak] = useState(true);
  const [presets, setPresets] = useState<McChatPreset[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    void client.getMcChatPresets(token).then(({ presets: next }) => {
      if (active) setPresets(next);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Không tải được câu mẫu.');
    });
    return () => { active = false; };
  }, [client, token]);

  const send = async (message = text) => {
    const value = message.trim();
    if (!value || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await client.sendMcChat(token, sessionId, { text: value, speak });
      if (message === text) setText('');
      setNotice('Đã thêm câu vào hàng chờ MC.');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : 'Không gửi được câu MC.');
    } finally { setBusy(false); }
  };

  const savePreset = async () => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await client.addMcChatPreset(token, value);
      setPresets(result.presets); setNotice('Đã lưu câu mẫu trên máy chủ.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được câu mẫu.');
    } finally { setBusy(false); }
  };

  const removePreset = async (preset: McChatPreset) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await client.deleteMcChatPreset(token, preset.id);
      setPresets(result.presets); setNotice('Đã xoá câu mẫu.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không xoá được câu mẫu.');
    } finally { setBusy(false); }
  };

  const updateQueueItem = async (item: McChatQueueItem, action: 'fallback' | 'cancel') => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (action === 'fallback') await client.useMcChatTextFallback(token, sessionId, item.id);
      else await client.cancelMcChat(token, sessionId, item.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không cập nhật được câu MC.');
    } finally { setBusy(false); }
  };

  const queue = snapshot.mcChatQueue ?? [];
  return <section className="mc-chat-panel" data-testid="mc-chat-panel" aria-labelledby="mc-chat-title">
    <div className="mc-chat-heading">
      <div><span className="eyebrow">TƯƠNG TÁC LIVE</span><h3 id="mc-chat-title">MC nói với khán giả</h3></div>
      <span className="mc-chat-queue-count">{queue.filter((item) => !['DONE', 'CANCELLED'].includes(item.status)).length}/5</span>
    </div>
    <label className="mc-chat-input-label" htmlFor="mc-chat-text">Câu muốn gửi</label>
    <textarea id="mc-chat-text" data-testid="mc-chat-input" maxLength={MAX_MC_CHAT_TEXT_CHARS} rows={2} value={text}
      onChange={(event) => setText(event.target.value)} placeholder="Nhập tối đa 120 ký tự…" />
    <div className="mc-chat-controls">
      <span data-testid="mc-chat-character-count">{text.length}/120</span>
      <label><input type="checkbox" checked={speak} onChange={(event) => setSpeak(event.target.checked)} /> Đọc giọng</label>
      <button type="button" disabled={busy || !text.trim()} onClick={() => void send()}>Gửi</button>
      <button type="button" className="mc-chat-secondary" disabled={busy || !text.trim()} onClick={() => void savePreset()}>Lưu mẫu</button>
    </div>
    {isMock && <small className="mc-chat-mock-note" data-testid="mc-chat-mock-note">MOCK: trạng thái giọng được mô phỏng, không gọi dịch vụ sinh giọng.</small>}
    {error && <p className="mc-chat-feedback is-error" role="alert">{error}</p>}
    {notice && <p className="mc-chat-feedback" role="status">{notice}</p>}

    <div className="mc-chat-list-block">
      <h4>Câu mẫu</h4>
      {presets.length === 0 ? <p className="mc-chat-empty">Chưa có câu mẫu.</p> : <ul className="mc-chat-presets">
        {presets.map((preset) => <li key={preset.id}>
          <span>{preset.text}</span>
          <button type="button" disabled={busy} onClick={() => void send(preset.text)}>Gửi mẫu</button>
          <button type="button" className="mc-chat-remove" disabled={busy} aria-label={`Xoá câu mẫu: ${preset.text}`} onClick={() => void removePreset(preset)}>Xoá</button>
        </li>)}
      </ul>}
    </div>

    <div className="mc-chat-list-block">
      <h4>Hàng chờ MC</h4>
      {queue.length === 0 ? <p className="mc-chat-empty">Chưa có câu nào.</p> : <ul className="mc-chat-queue">
        {queue.slice(-5).map((item) => <li key={item.id} data-testid="mc-chat-queue-item" data-status={item.status}>
          <span className="mc-chat-queue-copy"><b>{item.text}</b><small className={`mc-chat-status status-${item.status.toLowerCase()}`}>{STATUS_TEXT[item.status]}</small>
            {item.errorMessage && <small className="mc-chat-error-detail">{item.errorMessage}</small>}</span>
          {item.status === 'ERROR' && <button type="button" disabled={busy} onClick={() => void updateQueueItem(item, 'fallback')}>Chỉ hiện chữ</button>}
          {['GENERATING', 'QUEUED', 'ERROR'].includes(item.status) && <button type="button" className="mc-chat-remove" disabled={busy} onClick={() => void updateQueueItem(item, 'cancel')}>Huỷ</button>}
        </li>)}
      </ul>}
    </div>
  </section>;
}
