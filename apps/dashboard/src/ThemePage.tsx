import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { THEME_ASSET_SLOTS, type ThemeAssetSlot, type ResolvedTheme } from '@quiz/contracts';
import type { AdminThemeItem, AdminThemesResponse, DashboardClient } from './api/client';
import { canApplyTheme, initialThemeSelection, themeStatusLabel } from './themeManagement';

const IMAGE_PREVIEW_SLOTS: Array<{ label: string; slot: ThemeAssetSlot }> = [
  { label: 'Nền đấu trường', slot: 'arena.background' },
  { label: 'Nền câu hỏi', slot: 'arena.questionBackground' },
  { label: 'Logo', slot: 'brand.logo' },
  { label: 'MC', slot: 'mc.static' },
  { label: 'Victory · nền', slot: 'victory.background' },
  { label: 'Victory · sân khấu', slot: 'victory.trophyStage' },
  ...Array.from({ length: 8 }, (_, index) => ({ label: `Cờ ${index + 1}`, slot: `arena.flag.${index}` as ThemeAssetSlot })),
];

function errorText(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Không thể kết nối tới máy chủ.';
}

function themeForList(theme: ResolvedTheme, list: AdminThemesResponse): ResolvedTheme {
  return { ...theme, version: list.themeVersion };
}

export function ThemePage({ client, token, isMock }: { client: DashboardClient; token: string; isMock: boolean }) {
  const [list, setList] = useState<AdminThemesResponse | null>(null);
  const [activeTheme, setActiveTheme] = useState<ResolvedTheme | null>(null);
  const [previewTheme, setPreviewTheme] = useState<ResolvedTheme | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState<'reload' | 'apply' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextList, nextTheme] = await Promise.all([client.getThemes(token), client.getActiveTheme()]);
      setList(nextList);
      setActiveTheme(themeForList(nextTheme, nextList));
      setSelectedThemeId(initialThemeSelection(nextList.themes, nextList.activeThemeId));
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }, [client, token]);

  useEffect(() => { void load(); }, [load]);

  const selectedTheme = useMemo(
    () => list?.themes.find((theme) => theme.id === selectedThemeId),
    [list?.themes, selectedThemeId],
  );
  const applyEnabled = canApplyTheme(selectedTheme, list?.activeThemeId ?? null, loading || operation !== null);

  useEffect(() => {
    if (!list || loading) return;
    if (!selectedThemeId) {
      setPreviewTheme(activeTheme);
      setPreviewLoading(false);
      return;
    }
    if (!selectedTheme?.valid) {
      setPreviewTheme(null);
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setError('');
    void client.getResolvedTheme(token, selectedThemeId).then((resolved) => {
      if (!cancelled) setPreviewTheme(resolved);
    }).catch((cause: unknown) => {
      if (!cancelled) {
        setPreviewTheme(null);
        setError(`Tải xem thử thất bại: ${errorText(cause)}`);
      }
    }).finally(() => {
      if (!cancelled) setPreviewLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeTheme, client, list, loading, selectedTheme?.valid, selectedThemeId, token]);

  async function reloadThemes() {
    setOperation('reload');
    setError('');
    setNotice('');
    try {
      const [nextList, nextTheme] = await Promise.all([client.reloadThemes(token), client.getActiveTheme()]);
      setList(nextList);
      setActiveTheme(themeForList(nextTheme, nextList));
      setSelectedThemeId((current) => current && nextList.themes.some((theme) => theme.id === current)
        ? current : initialThemeSelection(nextList.themes, nextList.activeThemeId));
      setNotice('Đã quét lại thư mục theme.');
    } catch (cause) {
      setError(`Quét theme thất bại: ${errorText(cause)}`);
    } finally {
      setOperation(null);
    }
  }

  async function applyTheme() {
    if (!selectedTheme || !canApplyTheme(selectedTheme, list?.activeThemeId ?? null, loading || operation !== null)) return;
    setOperation('apply');
    setError('');
    setNotice('');
    try {
      const result = await client.setActiveTheme(token, selectedTheme.id);
      setList((current) => current ? {
        ...current,
        activeThemeId: result.activeThemeId,
        themeVersion: result.themeVersion,
        themes: current.themes.map((theme) => ({ ...theme, active: theme.id === result.activeThemeId })),
      } : current);
      setActiveTheme(result.theme);
      setNotice(`Đã áp dụng theme “${selectedTheme.name}”.`);
    } catch (cause) {
      setError(`Áp dụng theme thất bại: ${errorText(cause)}`);
    } finally {
      setOperation(null);
    }
  }

  return <section className="theme-page page-content" data-testid="theme-page">
    <div className="theme-heading">
      <div><span className="eyebrow">GIAO DIỆN THEO SỰ KIỆN</span><h1>Giao diện / Theme</h1>
        <p>Chọn gói màu, font và asset cho phiên; vị trí và kích thước khung luôn giữ nguyên.</p>
      </div>
      <div className="theme-actions">
        <button className="secondary-button" type="button" onClick={() => void reloadThemes()} disabled={loading || operation !== null}>
          {operation === 'reload' ? 'Đang quét…' : 'Quét lại thư mục'}
        </button>
        <button className="primary-button" type="button" onClick={() => void applyTheme()} disabled={!applyEnabled}>
          {operation === 'apply' ? 'Đang áp dụng…' : 'Áp dụng'}
        </button>
      </div>
    </div>
    <p className="theme-folder-help">Thư mục theme: <code>data/themes/&lt;id&gt;/</code>, gồm <code>theme.json</code>, <code>assets/</code> và <code>fonts/</code>. Thiếu slot sẽ dùng giao diện mặc định.</p>
    {isMock && <p className="theme-demo-note" role="note">Đang xem dữ liệu theme DEMO; thao tác không thay đổi cấu hình máy chủ.</p>}
    {error && <div className="alert alert-error" role="alert">{error}<button type="button" aria-label="Đóng thông báo" onClick={() => setError('')}>×</button></div>}
    {notice && <div className="alert alert-success" role="status">{notice}<button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button></div>}

    <div className="theme-layout">
      <section className="panel theme-list-panel" aria-labelledby="theme-list-title">
        <div className="panel-title"><div><span className="eyebrow">GÓI GIAO DIỆN</span><h2 id="theme-list-title">Danh sách theme</h2></div>
          {list && <span className="muted">{list.themes.length} theme · v{list.themeVersion}</span>}
        </div>
        {loading && !list ? <p className="theme-empty" role="status">Đang tải danh sách theme…</p> : list?.themes.length ? <div className="theme-list" role="radiogroup" aria-label="Danh sách theme">
          {list.themes.map((theme) => <ThemeChoice key={theme.id} theme={theme} selected={theme.id === selectedThemeId} onSelect={() => setSelectedThemeId(theme.id)} />)}
        </div> : <p className="theme-empty">Chưa có theme trong thư mục. Giao diện mặc định vẫn đang được dùng.</p>}
      </section>

      <section className="panel theme-preview-panel" aria-labelledby="theme-preview-title">
        <div className="panel-title"><div><span className="eyebrow">XEM THỬ</span><h2 id="theme-preview-title">{selectedTheme?.name ?? 'Theme đang chọn'}</h2></div>
          {selectedTheme?.active && <span className="theme-badge is-active">Đang dùng</span>}
        </div>
        {selectedTheme && <p className={`theme-status ${selectedTheme.valid ? 'is-valid' : 'is-invalid'}`}>{themeStatusLabel(selectedTheme)}</p>}
        {selectedTheme && !selectedTheme.valid && <p className="theme-preview-message">Sửa lỗi trong gói theme rồi chọn “Quét lại thư mục”. Theme lỗi không thể áp dụng.</p>}
        {selectedTheme?.valid && previewLoading && <p className="theme-preview-message" role="status">Đang tải bản xem thử…</p>}
        {selectedTheme?.valid && !previewLoading && !previewTheme && <p className="theme-preview-message" role="status">Chưa có dữ liệu xem thử cho theme này.</p>}
        {previewTheme && <>
          <div className="theme-token-section"><h3>Màu và token</h3>
            {Object.keys(previewTheme.tokens).length ? <div className="theme-token-list">
              {Object.entries(previewTheme.tokens).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => <div className="theme-token-row" key={key}>
                <span className="theme-swatch" aria-label={`Mẫu màu ${key}`} style={{ background: value }} />
                <code>--theme-{key}</code><span className="theme-token-value">{value}</span>
              </div>)}
            </div> : <p className="theme-empty">Theme này không khai báo token riêng; ứng dụng dùng giá trị mặc định.</p>}
          </div>
          <div className="theme-token-section"><h3>Ảnh theo slot</h3>
            <div className="theme-image-grid">{IMAGE_PREVIEW_SLOTS.map(({ label, slot }) => <ThemeImage key={slot} label={label} slot={slot} src={previewTheme.assets[slot]} />)}</div>
            {!THEME_ASSET_SLOTS.some((slot) => previewTheme.assets[slot]) && <p className="theme-empty">Các slot đều dùng mặc định.</p>}
          </div>
        </>}
      </section>
    </div>
  </section>;
}

function ThemeChoice({ theme, selected, onSelect }: { theme: AdminThemeItem; selected: boolean; onSelect: () => void }) {
  return <button className={`theme-choice ${selected ? 'is-selected' : ''} ${!theme.valid ? 'has-error' : ''}`} type="button" role="radio" aria-checked={selected} onClick={onSelect}>
    <span className="theme-choice-copy"><b>{theme.name}</b><small><code>{theme.id}</code></small></span>
    <span className={`theme-badge ${theme.valid ? 'is-valid' : 'is-invalid'}`}>{theme.valid ? 'Hợp lệ' : 'Lỗi'}</span>
    {theme.active && <span className="theme-badge is-active">Đang dùng</span>}
    {!theme.valid && <span className="theme-choice-error">{theme.error || 'Gói theme không hợp lệ.'}</span>}
  </button>;
}

function ThemeImage({ label, slot, src }: { label: string; slot: ThemeAssetSlot; src?: string }) {
  return <article className="theme-image-card" data-slot={slot}>
    <span>{label}</span>
    {src ? <img src={src} alt={`${label} · ${slot}`} loading="lazy" /> : <div className="theme-image-default">Dùng mặc định</div>}
    <code>{src ? slot : `${slot} · mặc định`}</code>
  </article>;
}
