import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_HUD_CONFIG,
  THEME_DEFAULT_TEXTS,
  ACHIEVEMENT_DISPLAY_SLOTS,
  ACHIEVEMENT_IDS,
  ACHIEVEMENT_MAX_ROWS,
  THEME_ASSET_SLOTS,
  THEME_DEFAULT_ACHIEVEMENTS,
  ThemeAchievementsSchema,
  type AchievementId,
  type AchievementThemePresentation,
  type ThemeAchievements,
  type ThemeAssetSlot,
  type ResolvedTheme,
  type GameState,
  type ThemeTexts,
} from '@quiz/contracts';
import type { AdminThemeItem, AdminThemesResponse, DashboardClient } from './api/client';
import { canApplyTheme, initialThemeSelection, themeApplyBlockReason, themeStatusLabel } from './themeManagement';

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

type AchievementEditorValue = AchievementThemePresentation;
const DISPLAY_SLOT_LABELS: Record<(typeof ACHIEVEMENT_DISPLAY_SLOTS)[number], string> = {
  'question-reveal': 'Sau câu hỏi', 'stage-recap': 'Tổng kết chặng', victory: 'Victory', 'lobby-rotation': 'Xoay vòng sảnh',
};

function achievementValues(source: ThemeAchievements): Record<AchievementId, AchievementEditorValue> {
  return Object.fromEntries(ACHIEVEMENT_IDS.map((id) => [id, {
    ...THEME_DEFAULT_ACHIEVEMENTS[id], icon: null, ...source[id],
  }])) as Record<AchievementId, AchievementEditorValue>;
}

function validationMessage(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return error.issues.map((issue) => `${issue.path.map(String).join('.') || 'achievements'}: ${issue.message}`).join('; ');
}

function achievementIconUrl(themeId: string, icon: string, version: number) {
  const path = icon.split('/').map(encodeURIComponent).join('/');
  return `/themes/${encodeURIComponent(themeId)}/${path}?v=${version}`;
}

export function ThemePage({ client, token, isMock, gameState = null }: { client: DashboardClient; token: string; isMock: boolean; gameState?: GameState | null }) {
  const [list, setList] = useState<AdminThemesResponse | null>(null);
  const [activeTheme, setActiveTheme] = useState<ResolvedTheme | null>(null);
  const [previewTheme, setPreviewTheme] = useState<ResolvedTheme | null>(null);
  const [themePreviews, setThemePreviews] = useState<Record<string, ResolvedTheme>>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState<'reload' | 'apply' | null>(null);
  const [achievementDraft, setAchievementDraft] = useState<ThemeAchievements>({});
  const [achievementLoading, setAchievementLoading] = useState(false);
  const [achievementOperation, setAchievementOperation] = useState<'save' | 'reset' | 'export' | null>(null);
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

  useEffect(() => {
    if (!list) return;
    let cancelled = false;
    const validThemes = list.themes.filter((theme) => theme.valid);
    void Promise.all(validThemes.map(async (theme) => {
      try { return [theme.id, await client.getResolvedTheme(token, theme.id)] as const; }
      catch { return null; }
    })).then((items) => {
      if (cancelled) return;
      setThemePreviews(Object.fromEntries(items.filter((item): item is readonly [string, ResolvedTheme] => item !== null)));
    });
    return () => { cancelled = true; };
  }, [client, list, token]);

  const selectedTheme = useMemo(
    () => list?.themes.find((theme) => theme.id === selectedThemeId),
    [list?.themes, selectedThemeId],
  );
  const operationBusy = loading || operation !== null || achievementLoading || achievementOperation !== null;
  const applyEnabled = canApplyTheme(selectedTheme, list?.activeThemeId ?? null, operationBusy, gameState);
  const applyReason = themeApplyBlockReason(gameState);

  useEffect(() => {
    if (!selectedThemeId || !selectedTheme?.valid) {
      setAchievementDraft({});
      setAchievementLoading(false);
      return;
    }
    let cancelled = false;
    setAchievementLoading(true);
    void client.getThemeAchievements(token, selectedThemeId).then((response) => {
      if (cancelled) return;
      setAchievementDraft(response.achievements);
    }).catch((cause: unknown) => {
      if (!cancelled) setError(`Tải danh hiệu thất bại: ${errorText(cause)}`);
    }).finally(() => {
      if (!cancelled) setAchievementLoading(false);
    });
    return () => { cancelled = true; };
  }, [client, selectedTheme?.valid, selectedThemeId, token]);

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
      setNotice('Đã tải lại danh sách theme.');
    } catch (cause) {
      setError(`Quét theme thất bại: ${errorText(cause)}`);
    } finally {
      setOperation(null);
    }
  }

  async function applyTheme(themeId = selectedThemeId) {
    const targetTheme = list?.themes.find((theme) => theme.id === themeId);
    if (!targetTheme || !canApplyTheme(targetTheme, list?.activeThemeId ?? null, operationBusy, gameState)) return;
    setOperation('apply');
    setError('');
    setNotice('');
    let previousHud: Awaited<ReturnType<DashboardClient['getHud']>> | null = null;
    let hudWasUpdated = false;
    let restoreFailed = false;
    try {
      const resolved = themePreviews[targetTheme.id] ?? await client.getResolvedTheme(token, targetTheme.id);
      previousHud = await client.getHud();
      const themeTexts = { ...THEME_DEFAULT_TEXTS, ...(resolved.texts ?? {}) } as Record<keyof ThemeTexts, string>;
      const changesText = Object.keys(themeTexts).some((key) => previousHud!.texts[key as keyof ThemeTexts] !== themeTexts[key as keyof ThemeTexts]);
      const hasCustomizedText = Object.keys(previousHud.texts).some((key) =>
        previousHud!.texts[key as keyof ThemeTexts] !== DEFAULT_HUD_CONFIG.texts[key as keyof ThemeTexts]);
      const overwriteText = !changesText || !hasCustomizedText || window.confirm('Dùng chữ của theme mới?');
      if (changesText && overwriteText) {
        await client.saveHud(token, { texts: themeTexts, images: previousHud.images });
        hudWasUpdated = true;
      }
      const result = await client.setActiveTheme(token, targetTheme.id);
      setList((current) => current ? {
        ...current,
        activeThemeId: result.activeThemeId,
        themeVersion: result.themeVersion,
        themes: current.themes.map((theme) => ({ ...theme, active: theme.id === result.activeThemeId })),
      } : current);
      setSelectedThemeId(targetTheme.id);
      setActiveTheme(result.theme);
      setNotice(hudWasUpdated
        ? 'Đã áp dụng theme “' + targetTheme.name + '” và cập nhật chữ tiêu đề.'
        : 'Đã áp dụng theme “' + targetTheme.name + '”.' + (changesText ? ' Giữ nguyên chữ HUD đã tùy chỉnh.' : ''));
    } catch (cause) {
      if (hudWasUpdated && previousHud) {
        try { await client.saveHud(token, { texts: previousHud.texts, images: previousHud.images }); }
        catch {
          restoreFailed = true;
          setError('Không áp dụng được theme và cũng không khôi phục được chữ HUD; hãy kiểm tra trang HUD.');
        }
      }
      if (!restoreFailed) setError('Áp dụng theme thất bại: ' + errorText(cause));
    } finally {
      setOperation(null);
    }
  }

  function updateAchievement(id: AchievementId, patch: Partial<AchievementEditorValue>) {
    setAchievementDraft((current) => ({ ...current, [id]: { ...achievementValues(current)[id], ...patch } }));
  }

  function validateAchievements() {
    const parsed = ThemeAchievementsSchema.safeParse(achievementDraft);
    if (!parsed.success) {
      setError(`Danh hiệu chưa hợp lệ: ${validationMessage(parsed.error)}`);
      setNotice('');
      return false;
    }
    setError('');
    setNotice('Danh hiệu hợp lệ theo schema C-0288. Máy chủ sẽ kiểm tra thêm các tệp icon khi lưu.');
    return true;
  }

  async function exportAchievements() {
    if (!selectedTheme || !selectedThemeId || !selectedTheme.valid || achievementLoading || achievementOperation || operation !== null) return;
    const parsed = ThemeAchievementsSchema.safeParse(achievementDraft);
    if (!parsed.success) {
      setError(`Danh hiệu chưa hợp lệ: ${validationMessage(parsed.error)}`);
      setNotice('');
      return;
    }
    setAchievementOperation('export');
    setError('');
    setNotice('');
    try {
      const manifest = await client.getThemeManifest(token, selectedThemeId);
      const payload = { ...manifest, achievements: Object.keys(parsed.data).length ? parsed.data : undefined };
      const filename = `${selectedThemeId}-theme.json`;
      const url = URL.createObjectURL(new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setNotice(`Đã xuất ${filename}.`);
    } catch (cause) {
      setError(`Xuất theme thất bại: ${errorText(cause)}`);
    } finally {
      setAchievementOperation(null);
    }
  }

  async function saveAchievements(next = achievementDraft, kind: 'save' | 'reset' = 'save') {
    if (!selectedThemeId || !selectedTheme?.valid || achievementLoading || achievementOperation || operation !== null) return;
    const parsed = ThemeAchievementsSchema.safeParse(next);
    if (!parsed.success) {
      setError(`Danh hiệu chưa hợp lệ: ${validationMessage(parsed.error)}`);
      setNotice('');
      return;
    }
    setAchievementOperation(kind);
    setError('');
    setNotice('');
    try {
      const result = await client.saveThemeAchievements(token, selectedThemeId, parsed.data);
      setAchievementDraft(result.achievements);
      setList((current) => current ? { ...current, themeVersion: result.themeVersion } : current);
      setPreviewTheme(result.theme);
      if (list?.activeThemeId === selectedThemeId) setActiveTheme(result.theme);
      setNotice(kind === 'reset'
        ? `Đã đặt danh hiệu của “${selectedTheme.name}” về mặc định.`
        : `Đã lưu danh hiệu cho “${selectedTheme.name}”; máy chủ đã tạo bản sao lưu ${result.backup}.`);
    } catch (cause) {
      setError(`${kind === 'reset' ? 'Đặt lại' : 'Lưu'} danh hiệu thất bại: ${errorText(cause)}`);
    } finally {
      setAchievementOperation(null);
    }
  }

  async function resetAchievements() {
    await saveAchievements({}, 'reset');
  }

  const achievementPreview = useMemo(() => achievementValues(achievementDraft), [achievementDraft]);

  return <section className="theme-page page-content" data-testid="theme-page">
    <div className="theme-heading">
      <div><span className="eyebrow">GIAO DIỆN THEO SỰ KIỆN</span><h1>Giao diện / Theme</h1>
        <p>Chọn gói màu, font và asset cho phiên; vị trí và kích thước khung luôn giữ nguyên.</p>
      </div>
      <div className="theme-actions">
        <button className="secondary-button" type="button" onClick={() => void reloadThemes()} disabled={operationBusy}>
          {operation === 'reload' ? 'Đang tải…' : 'Tải lại danh sách theme'}
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
          {list.themes.map((theme) => <ThemeChoice key={theme.id} theme={theme} preview={themePreviews[theme.id]}
            selected={theme.id === selectedThemeId}
            applyDisabled={!canApplyTheme(theme, list.activeThemeId, operationBusy, gameState)}
            applyReason={themeApplyBlockReason(gameState)}
            disabled={achievementLoading || achievementOperation !== null || operation !== null}
            onSelect={() => setSelectedThemeId(theme.id)} onApply={() => void applyTheme(theme.id)} />)}
        </div> : <p className="theme-empty">Chưa có theme trong thư mục. Giao diện mặc định vẫn đang được dùng.</p>}
      </section>

      <section className="panel theme-preview-panel" aria-labelledby="theme-preview-title">
        <div className="panel-title"><div><span className="eyebrow">XEM THỬ</span><h2 id="theme-preview-title">{selectedTheme?.name ?? 'Theme đang chọn'}</h2></div>
          {selectedTheme?.active && <span className="theme-badge is-active">Đang dùng</span>}
        </div>
        {selectedTheme && <p className={`theme-status ${selectedTheme.valid ? 'is-valid' : 'is-invalid'}`}>{themeStatusLabel(selectedTheme)}</p>}
        {selectedTheme && !selectedTheme.valid && <p className="theme-preview-message">Sửa lỗi trong gói theme rồi chọn “Tải lại danh sách theme”. Theme lỗi không thể áp dụng.</p>}
        {selectedTheme?.valid && previewLoading && <p className="theme-preview-message" role="status">Đang tải bản xem thử…</p>}
        {selectedTheme?.valid && !previewLoading && !previewTheme && <p className="theme-preview-message" role="status">Chưa có dữ liệu xem thử cho theme này.</p>}
        {previewTheme && <>
          <ThemeComposite theme={previewTheme} large />
          {applyReason && <p className="theme-apply-reason" role="note">{applyReason}</p>}
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

    <section className="panel achievement-editor" aria-labelledby="achievement-editor-title" data-testid="achievement-editor">
      <div className="panel-title achievement-editor-heading">
        <div><span className="eyebrow">C-0288 · CẤU HÌNH THEO GÓI</span><h2 id="achievement-editor-title">Danh hiệu theo chủ đề</h2>
          <p>Chỉnh phần hiển thị chung của theme; cấu hình riêng theo sự kiện được giữ nguyên.</p></div>
        {selectedTheme && <span className="muted">{selectedTheme.name} · v{list?.themeVersion ?? 1}</span>}
      </div>
      {!selectedTheme?.valid ? <p className="theme-empty">Chọn một theme hợp lệ để sửa danh hiệu. Theme mặc định cần được nhân bản trước khi chỉnh.</p> : achievementLoading
        ? <p className="theme-empty" role="status">Đang tải cấu hình danh hiệu…</p>
        : <div className="achievement-editor-layout">
          <div className="achievement-fields">
            {ACHIEVEMENT_IDS.map((id) => {
              const value = achievementPreview[id];
              const maxRows = ACHIEVEMENT_MAX_ROWS[id];
              return <fieldset className="achievement-card" key={id} data-achievement={id} disabled={achievementLoading || achievementOperation !== null || operation !== null}>
                <legend>{id.replaceAll('_', ' ')}</legend>
                <label className="achievement-enabled"><input type="checkbox" checked={value.enabled}
                  onChange={(event) => updateAchievement(id, { enabled: event.currentTarget.checked })} /> Bật danh hiệu</label>
                <label>Tên<input aria-label={`${id} · tên`} maxLength={100} value={value.title}
                  onChange={(event) => updateAchievement(id, { title: event.currentTarget.value })} /></label>
                <label>Subtitle<input aria-label={`${id} · subtitle`} maxLength={160} value={value.subtitle}
                  onChange={(event) => updateAchievement(id, { subtitle: event.currentTarget.value })} /></label>
                <label>Icon tương đối trong theme<input aria-label={`${id} · icon`} placeholder="assets/achievements/icon.png"
                  value={value.icon ?? ''} onChange={(event) => updateAchievement(id, { icon: event.currentTarget.value.trim() || null })} /></label>
                <div className="achievement-form-row">
                  <label>Màu nhấn<input aria-label={`${id} · màu`} value={value.accentColor}
                    onChange={(event) => updateAchievement(id, { accentColor: event.currentTarget.value })} /></label>
                  <label>{maxRows ? 'Số dòng Top' : 'Số dòng'}<select aria-label={`${id} · số dòng`} value={value.maxRows} disabled={!maxRows}
                    onChange={(event) => updateAchievement(id, { maxRows: Number(event.currentTarget.value) })}>
                    {maxRows ? Array.from({ length: maxRows }, (_, index) => index + 1).map((rows) => <option key={rows} value={rows}>{rows} người</option>)
                      : <option value={0}>Chỉ tổng số</option>}
                  </select></label>
                </div>
                <label>Vị trí hiển thị<select aria-label={`${id} · vị trí`} value={value.displaySlot}
                  onChange={(event) => updateAchievement(id, { displaySlot: event.currentTarget.value as AchievementEditorValue['displaySlot'] })}>
                  {ACHIEVEMENT_DISPLAY_SLOTS.map((slot) => <option key={slot} value={slot}>{DISPLAY_SLOT_LABELS[slot]}</option>)}
                </select></label>
              </fieldset>;
            })}
          </div>
          <aside className="achievement-preview" aria-label="Preview danh hiệu" data-testid="achievement-preview">
            <div className="achievement-preview-heading"><div><span className="eyebrow">PREVIEW</span><h3>{selectedTheme?.name}</h3></div>
              <span>{Object.values(achievementPreview).filter((item) => item.enabled).length} đang bật</span></div>
            {ACHIEVEMENT_IDS.filter((id) => achievementPreview[id].enabled).map((id) => {
              const value = achievementPreview[id];
              const src = value.icon && selectedThemeId ? achievementIconUrl(selectedThemeId, value.icon, list?.themeVersion ?? 1) : null;
              return <article className="achievement-preview-card" key={id} style={{ '--achievement-accent': value.accentColor } as React.CSSProperties}>
                {src ? <img src={src} alt="" /> : <span className="achievement-preview-icon" aria-hidden="true">♛</span>}
                <div><b>{value.title}</b><small>{value.subtitle || DISPLAY_SLOT_LABELS[value.displaySlot]} · {DISPLAY_SLOT_LABELS[value.displaySlot]}</small></div>
                <span className="achievement-preview-count">{value.maxRows ? `TOP ${value.maxRows}` : 'TỔNG'}</span>
              </article>;
            })}
            <p className="achievement-preview-note">Preview dùng nội dung hiện tại; icon sẽ được máy chủ xác thực khi lưu.</p>
          </aside>
        </div>}
      {selectedTheme?.valid && <div className="achievement-actions">
        <div className="achievement-actions-left">
          <button className="secondary-button" type="button" onClick={() => void exportAchievements()} disabled={achievementLoading || achievementOperation !== null || operation !== null}>
            {achievementOperation === 'export' ? 'Đang xuất…' : 'Export JSON'}
          </button>
          <button className="secondary-button" type="button" onClick={validateAchievements} disabled={achievementLoading || achievementOperation !== null || operation !== null}>Validate</button>
          <button className="secondary-button" type="button" onClick={() => void resetAchievements()} disabled={achievementLoading || achievementOperation !== null || operation !== null}>
            {achievementOperation === 'reset' ? 'Đang đặt lại…' : 'Reset về mặc định'}
          </button>
        </div>
        <button className="primary-button" type="button" onClick={() => void saveAchievements()} disabled={achievementLoading || achievementOperation !== null || operation !== null}>
          {achievementOperation === 'save' ? 'Đang lưu…' : 'Lưu danh hiệu'}
        </button>
      </div>}
    </section>
  </section>;
}

function ThemeChoice({ theme, preview, selected, disabled, applyDisabled, applyReason, onSelect, onApply }: {
  theme: AdminThemeItem;
  preview?: ResolvedTheme;
  selected: boolean;
  disabled: boolean;
  applyDisabled: boolean;
  applyReason: string;
  onSelect: () => void;
  onApply: () => void;
}) {
  return <article className={`theme-choice ${selected ? 'is-selected' : ''} ${!theme.valid ? 'has-error' : ''}`} data-testid={`theme-choice-${theme.id}`}>
    <button className="theme-choice-select" type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={onSelect}>
      <span className="theme-choice-copy"><b>{theme.name}</b><small><code>{theme.id}</code></small></span>
      <span className={`theme-badge ${theme.valid ? 'is-valid' : 'is-invalid'}`}>{theme.valid ? 'Hợp lệ' : 'Lỗi'}</span>
      {theme.active && <span className="theme-badge is-active">Đang dùng</span>}
      {!theme.valid && <span className="theme-choice-error">{theme.error || 'Gói theme không hợp lệ.'}</span>}
    </button>
    {preview ? <ThemeComposite theme={preview} /> : <div className="theme-composite theme-composite-empty" aria-label="Chưa có ảnh xem trước"><span>Chưa có ảnh xem trước</span></div>}
    <button className="primary-button theme-apply-button" type="button" disabled={!theme.valid || applyDisabled || disabled}
      title={applyReason || undefined} onClick={onApply}>
      {theme.active ? 'Đang dùng' : 'Dùng theme này'}
    </button>
    {applyReason && <small className="theme-apply-reason">{applyReason}</small>}
  </article>;
}

function ThemeComposite({ theme, large = false }: { theme: ResolvedTheme; large?: boolean }) {
  const background = theme.assets['arena.background'] ?? theme.assets['victory.userCover'] ?? theme.assets['arena.questionBackground'];
  const logo = theme.assets['brand.logo'];
  return <div className={`theme-composite ${large ? 'is-large' : ''}`} data-testid={large ? 'theme-composite-preview' : undefined}>
    {background ? <img className="theme-composite-background" src={background} alt="" loading="lazy" /> : <div className="theme-composite-background is-empty" />}
    {logo ? <img className="theme-composite-logo" src={logo} alt={theme.name + ' · logo'} loading="lazy" /> : <span className="theme-composite-logo-fallback">{theme.name}</span>}
    <span className="theme-composite-label">{theme.name}</span>
  </div>;
}

function ThemeImage({ label, slot, src }: { label: string; slot: ThemeAssetSlot; src?: string }) {
  return <article className="theme-image-card" data-slot={slot}>
    <span>{label}</span>
    {src ? <img src={src} alt={`${label} · ${slot}`} loading="lazy" /> : <div className="theme-image-default">Dùng mặc định</div>}
    <code>{src ? slot : `${slot} · mặc định`}</code>
  </article>;
}
