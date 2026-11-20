import React, { useEffect, useMemo, useState } from 'react';
import type { PriorityTopicSettings, PriorityTopicSettingsResponse } from '@quiz/contracts';
import type { DashboardClient } from './api/client';

function normalizeName(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('vi-VN').replace(/\s+/gu, '');
}

export function PriorityTopicSettingsCard({ client, token }: { client: DashboardClient; token: string }) {
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

  function toggleTopic(name: string, checked: boolean) {
    setNames((current) => {
      const normalized = normalizeName(name);
      const next = current.filter((item) => normalizeName(item) !== normalized);
      return checked ? [...next, name] : next;
    });
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
      const payload: PriorityTopicSettings = { priorityTopicNames: names, priorityShare: share };
      const result = await client.savePriorityTopicSettings(token, payload);
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

  return <section className="panel priority-topic-settings" data-testid="priority-topic-settings" aria-labelledby="priority-topic-title">
    <header className="priority-topic-heading">
      <div><span className="eyebrow">CẤU HÌNH VÒNG CÂU HỎI</span><h2 id="priority-topic-title">Chủ đề ưu tiên</h2>
        <p>Chọn chủ đề sự kiện để ưu tiên câu hỏi trong vòng tiếp theo. Chủ đề chưa có trong kho sẽ được bỏ qua.</p></div>
    </header>
    {loading ? <p className="empty-state" role="status">Đang tải cấu hình…</p> : <form className="priority-settings-form" onSubmit={(event) => void save(event)}>
      <fieldset className="priority-topic-options">
        <legend>Chọn chủ đề trong kho</legend>
        {(settings?.availableTopics ?? []).map((topic) => <label className="priority-topic-option" key={topic.id}>
          <input type="checkbox" aria-label={`Ưu tiên ${topic.name}`} checked={selectedTopicIds.has(topic.id)} disabled={!selectedTopicIds.has(topic.id) && names.length >= 10} onChange={(event) => toggleTopic(topic.name, event.target.checked)} />
          <span>{topic.name}</span><small>{topic.approvedCount} câu APPROVED</small>
        </label>)}
      </fieldset>
      <div className="priority-topic-add">
        <label htmlFor="priority-topic-name">Thêm tên chủ đề</label>
        <div className="priority-topic-add-row"><input id="priority-topic-name" maxLength={60} value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Ví dụ: Đấu Trường Bão Tố" />
          <button className="secondary-button" type="button" disabled={!draftName.trim() || names.length >= 10} onClick={addName}>Thêm</button></div>
      </div>
      <div className="priority-topic-chips" aria-label="Các chủ đề sẽ được ưu tiên">
        {names.length ? names.map((name) => <span className="priority-topic-chip" key={normalizeName(name)}>{name}<button type="button" aria-label={`Bỏ chủ đề ${name}`} onClick={() => setNames(names.filter((item) => normalizeName(item) !== normalizeName(name)))}>×</button></span>) : <span className="muted">Chưa chọn chủ đề.</span>}
      </div>
      <label className="priority-share-control">Tỉ lệ ưu tiên (%)
        <input aria-label="Tỉ lệ ưu tiên (%)" type="number" min="0" max="100" step="5" value={Math.round(share * 100)} onChange={(event) => setShare(Number(event.target.value) / 100)} />
        <small>Phần còn lại lấy từ chủ đề khác; nếu kho thiếu, bộ chọn sẽ bù bằng câu chưa dùng.</small>
      </label>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      <button className="primary-button" type="submit" disabled={saving || loading}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
    </form>}
  </section>;
}
