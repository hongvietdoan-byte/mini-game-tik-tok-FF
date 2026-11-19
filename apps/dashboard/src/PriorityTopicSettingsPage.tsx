import React, { useEffect, useMemo, useState } from 'react';
import type { PriorityTopicSettingsResponse } from '@quiz/contracts';
import type { DashboardClient } from './api/client';

function normalizeName(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('vi-VN').replace(/\s+/gu, '');
}

export function PriorityTopicSettingsPage({ client, token, isMock }: { client: DashboardClient; token: string; isMock: boolean }) {
  const [settings, setSettings] = useState<PriorityTopicSettingsResponse | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [share, setShare] = useState(0.6);
  const [draftName, setDraftName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void client.getPriorityTopicSettings(token).then((result) => {
      if (!active) return;
      setSettings(result);
      setNames([...result.priorityTopicNames]);
      setShare(result.priorityShare);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Không tải được cấu hình ưu tiên.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client, token]);

  const selectedTopicIds = useMemo(() => new Set(
    settings?.availableTopics.filter((topic) => names.some((name) => normalizeName(name) === normalizeName(topic.name))).map((topic) => topic.id) ?? [],
  ), [names, settings]);

  function changeSelectedTopics(event: React.ChangeEvent<HTMLSelectElement>) {
    const selectedIds = new Set(Array.from(event.currentTarget.selectedOptions, (option) => option.value));
    const topics = settings?.availableTopics ?? [];
    const customNames = names.filter((name) => !topics.some((topic) => normalizeName(topic.name) === normalizeName(name)));
    const selectedNames = topics.filter((topic) => selectedIds.has(topic.id)).map((topic) => topic.name);
    setNames([...customNames, ...selectedNames]);
  }

  function addName() {
    const name = draftName.trim();
    if (!name || names.some((item) => normalizeName(item) === normalizeName(name))) return;
    setNames([...names, name]);
    setDraftName('');
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await client.savePriorityTopicSettings(token, { priorityTopicNames: names, priorityShare: share });
      setSettings(result);
      setNames([...result.priorityTopicNames]);
      setShare(result.priorityShare);
      setNotice('Đã lưu. Cấu hình được dùng khi chuẩn bị vòng kế tiếp; không cần khởi động lại.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được cấu hình ưu tiên.');
    } finally {
      setSaving(false);
    }
  }

  return <section className="page-content priority-topic-settings" data-testid="priority-topic-settings">
    <div className="page-heading"><div><span className="eyebrow">CẤU HÌNH VÒNG CÂU HỎI</span><h2>Chủ đề ưu tiên</h2><p>Chọn tên chủ đề sự kiện và tỉ lệ câu mong muốn. Chủ đề chưa có trong kho sẽ được bỏ qua.</p></div></div>
    {isMock && <p className="priority-settings-hint" role="note">Bản MOCK chỉ lưu trong phiên trình duyệt.</p>}
    {loading ? <p className="empty-state" role="status">Đang tải cấu hình…</p> : <form className="priority-settings-form" onSubmit={(event) => void save(event)}>
      <label>Danh sách chủ đề ưu tiên
        <select aria-label="Danh sách chủ đề ưu tiên" multiple size={Math.min(6, Math.max(3, settings?.availableTopics.length ?? 3))} value={[...selectedTopicIds]} onChange={changeSelectedTopics}>
          {(settings?.availableTopics ?? []).map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
        </select>
        <small>Chọn các chủ đề có sẵn; giữ Ctrl để chọn nhiều chủ đề.</small>
      </label>
      <div className="priority-topic-add">
        <label htmlFor="priority-topic-name">Thêm tên chủ đề</label>
        <div className="priority-topic-add-row"><input id="priority-topic-name" maxLength={80} value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Ví dụ: Đấu Trường Bão Tố" />
          <button className="secondary-button" type="button" disabled={!draftName.trim()} onClick={addName}>Thêm</button></div>
      </div>
      <div className="priority-topic-chips" aria-label="Các chủ đề sẽ được ưu tiên">
        {names.length ? names.map((name) => <span className="priority-topic-chip" key={normalizeName(name)}>{name}<button type="button" aria-label={`Bỏ chủ đề ${name}`} onClick={() => setNames(names.filter((item) => normalizeName(item) !== normalizeName(name)))}>×</button></span>) : <span className="muted">Chưa chọn chủ đề.</span>}
      </div>
      <label className="priority-share-control">Tỉ lệ ưu tiên <b>{Math.round(share * 100)}%</b>
        <input aria-label="Tỉ lệ ưu tiên" type="range" min="0" max="1" step="0.05" value={share} onChange={(event) => setShare(Number(event.target.value))} />
        <small>Phần còn lại lấy từ chủ đề khác; nếu kho thiếu, bộ chọn sẽ bù bằng câu còn dùng được.</small>
      </label>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu cấu hình'}</button>
    </form>}
  </section>;
}
