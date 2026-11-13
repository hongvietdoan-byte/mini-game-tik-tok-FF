import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_HUD_CONFIG,
  HudConfigUpdateSchema,
  HudTextsSchema,
  type HudConfig,
  type HudImageSlot,
  type HudTexts,
} from '@quiz/contracts';
import { ApiError, type DashboardClient } from './api/client';

const TEXT_FIELDS: Array<{ key: keyof HudTexts; label: string; max: number; hint?: string }> = [
  { key: 'kicker', label: 'Tên sự kiện góc trái', max: 24 },
  { key: 'arenaTitle', label: 'Tên giải đấu', max: 28 },
  { key: 'playingLabel', label: 'Nhãn số người chơi', max: 24 },
  { key: 'roundLabel', label: 'Nhãn vòng', max: 24 },
  { key: 'leaderboardTitle', label: 'Tiêu đề bảng xếp hạng', max: 28 },
  { key: 'victoryTitle', label: 'Tiêu đề Victory', max: 28, hint: 'Để trống nếu không cần thêm tiêu đề.' },
];

const IMAGE_SLOTS: Array<{ slot: HudImageSlot; label: string; hint: string }> = [
  { slot: 'logo', label: 'Logo sự kiện', hint: 'Ảnh được giữ trong vùng logo hiện tại, không đổi kích thước khung.' },
  { slot: 'bgQuestion', label: 'Nền câu hỏi', hint: 'Dùng cho màn câu hỏi và công bố đáp án.' },
  { slot: 'bgLobby', label: 'Nền sảnh / Top 10', hint: 'Dùng cho sảnh, Top 10 và các màn chờ giữa vòng.' },
  { slot: 'bgVictory', label: 'Nền Victory', hint: 'Ảnh nền được phủ kín khung theo tỷ lệ sân khấu.' },
];

type PreviewScene = 'question' | 'top10' | 'victory';

function graphemeCount(text: string): number {
  return [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(text)].length;
}

function errorText(cause: unknown): string {
  return cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : 'Không thể đọc cài đặt giao diện HUD.';
}

function previewUrl(base: string, scene: PreviewScene): string {
  const url = new URL(base, location.href);
  url.searchParams.set('role', 'preview');
  url.searchParams.set('mock', scene);
  url.searchParams.delete('guides');
  return url.toString();
}

export function HudSettingsPage({ client, token, overlayUrl, isMock = false }: {
  client: DashboardClient;
  token: string;
  overlayUrl: string;
  isMock?: boolean;
}) {
  const [config, setConfig] = useState<HudConfig>(DEFAULT_HUD_CONFIG);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [previewScene, setPreviewScene] = useState<PreviewScene>('question');
  const previewSrc = useMemo(() => previewUrl(overlayUrl, previewScene), [overlayUrl, previewScene]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void client.getHud().then((next) => {
      if (active) setConfig(next);
    }).catch((cause: unknown) => {
      if (active) setError(errorText(cause));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [client]);

  const validation = HudConfigUpdateSchema.safeParse({ texts: config.texts, images: config.images });

  async function save() {
    setError('');
    setNotice('');
    if (!validation.success) {
      setError(validation.error.issues.map((issue) => `${String(issue.path.at(-1) ?? 'HUD')}: ${issue.message}`).join(' '));
      return;
    }
    setBusy(true);
    try {
      const saved = await client.saveHud(token, validation.data);
      setConfig(saved);
      setDirty(false);
      setNotice('Đã lưu giao diện HUD. Overlay sẽ tự cập nhật.');
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  async function upload(slot: HudImageSlot, file: File | undefined) {
    if (!file) return;
    setError('');
    setNotice('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type.toLowerCase())) {
      setError('Chỉ nhận ảnh PNG, JPG hoặc WEBP.');
      return;
    }
    if (file.size === 0 || file.size > 8 * 1024 * 1024) {
      setError('Ảnh phải có dung lượng từ 1 byte đến 8 MB.');
      return;
    }
    setBusy(true);
    try {
      const result = await client.uploadHudImage(token, slot, file);
      setConfig((current) => ({ ...result.config, texts: current.texts }));
      setNotice(`Đã tải ${file.name} · ${result.image.width} × ${result.image.height}px.`);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  async function resetSlot(slot: HudImageSlot) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const saved = await client.saveHud(token, {
        texts: config.texts,
        images: { ...config.images, [slot]: null },
      });
      setConfig(saved);
      setDirty(false);
      setNotice(`Đã khôi phục ảnh mặc định cho ${IMAGE_SLOTS.find((item) => item.slot === slot)?.label ?? 'ô ảnh'}.`);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  async function resetAll() {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const saved = await client.resetHud(token);
      setConfig(saved);
      setDirty(false);
      setNotice('Đã đưa toàn bộ chữ và ảnh về mặc định.');
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  return <section className="hud-settings-page" data-testid="hud-settings-page">
    <header className="hud-settings-heading">
      <div><span className="eyebrow">TÙY CHỈNH NỘI DUNG · GIỮ NGUYÊN BỐ CỤC</span><h1>Giao diện HUD</h1><p>Thay chữ, logo và ảnh nền trong các khung hiện có. Cấu hình được áp dụng cho overlay sau khi lưu.</p></div>
      <span className="hud-version">Phiên bản <b data-testid="hud-version">{config.version}</b></span>
    </header>

    {error && <div className="alert alert-error" role="alert">{error}</div>}
    {notice && <div className="alert alert-success" role="status">{notice}</div>}

    <div className="hud-settings-layout">
      <div className="hud-settings-controls">
        <section className="panel hud-panel">
          <div className="panel-title"><div><span className="eyebrow">NỘI DUNG HUD</span><h2>Chỉnh sửa chữ</h2></div></div>
          {loading ? <p role="status">Đang tải cấu hình HUD…</p> : <div className="hud-text-fields">
            {TEXT_FIELDS.map(({ key, label, max, hint }) => {
              const value = config.texts[key];
              const fieldResult = HudTextsSchema.shape[key].safeParse(value);
              const fieldError = fieldResult.success ? '' : fieldResult.error.issues[0]?.message ?? 'Giá trị không hợp lệ.';
              const count = graphemeCount(value);
              const id = `hud-text-${key}`;
              return <div className={`hud-text-field${fieldError ? ' has-error' : ''}`} key={key}>
                <div className="hud-text-field-heading"><label htmlFor={id}>{label}</label><button type="button" className="text-button" disabled={busy || loading || value === DEFAULT_HUD_CONFIG.texts[key]} onClick={() => {
                  setConfig((current) => ({ ...current, texts: { ...current.texts, [key]: DEFAULT_HUD_CONFIG.texts[key] } }));
                  setDirty(true);
                  setNotice('');
                }}>Mặc định</button></div>
                <input id={id} value={value} aria-invalid={!!fieldError} aria-describedby={`${id}-meta`} onChange={(event) => {
                  const nextValue = event.target.value;
                  setConfig((current) => ({ ...current, texts: { ...current.texts, [key]: nextValue } }));
                  setDirty(true);
                  setNotice('');
                }} />
                <small id={`${id}-meta`}><span>{hint ?? `Tối đa ${max} ký tự hiển thị.`}</span><b className={count > max ? 'is-over-limit' : ''}>{count}/{max}</b></small>
                {fieldError && <em>{fieldError}</em>}
              </div>;
            })}
          </div>}
          <div className="hud-actions">
            <button type="button" className="primary-button" disabled={busy || loading || !dirty || !validation.success} onClick={() => void save()}>{busy ? 'Đang lưu…' : 'Lưu giao diện'}</button>
            <button type="button" className="secondary-button" disabled={busy || loading} onClick={() => void resetAll()}>Về mặc định toàn bộ</button>
          </div>
          {isMock && <p className="hud-mock-note">MOCK: thay đổi được lưu trong phiên xem thử hiện tại.</p>}
        </section>

        <section className="panel hud-panel">
          <div className="panel-title"><div><span className="eyebrow">ẢNH TÙY CHỈNH</span><h2>Logo và nền</h2></div></div>
          <div className="hud-image-slots">
            {IMAGE_SLOTS.map(({ slot, label, hint }) => {
              const imageId = config.images[slot];
              return <article className="hud-image-slot" key={slot} data-testid={`hud-image-${slot}`}>
                <div><b>{label}</b><small>{hint}</small>{imageId ? <code title={imageId}>{imageId}</code> : <span className="hud-default-image">Đang dùng ảnh mặc định</span>}</div>
                <div className="hud-image-actions">
                  <label className="secondary-button hud-upload-button">Tải ảnh<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || loading} onChange={(event) => {
                    void upload(slot, event.currentTarget.files?.[0]);
                    event.currentTarget.value = '';
                  }} /></label>
                  <button type="button" className="text-button" disabled={busy || loading || imageId === null} onClick={() => void resetSlot(slot)}>Về mặc định ô này</button>
                </div>
              </article>;
            })}
          </div>
        </section>
      </div>

      <aside className="panel hud-preview-panel">
        <div className="panel-title"><div><span className="eyebrow">XEM THỬ TRỰC TIẾP</span><h2>Preview</h2></div></div>
        <label className="hud-preview-select">Cảnh xem trước<select aria-label="Cảnh xem trước" value={previewScene} onChange={(event) => setPreviewScene(event.target.value as PreviewScene)}>
          <option value="question">Câu hỏi</option><option value="top10">Top 10</option><option value="victory">Victory</option>
        </select></label>
        <iframe title="Xem trước giao diện HUD" data-testid="hud-preview" src={previewSrc} loading="lazy" referrerPolicy="no-referrer" />
        <p>Preview dùng trạng thái mẫu, không tác động tới phiên LIVE.</p>
      </aside>
    </div>
  </section>;
}
