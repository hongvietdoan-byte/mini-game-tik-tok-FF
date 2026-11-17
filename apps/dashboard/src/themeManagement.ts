import type { AdminThemeItem } from './api/client';

export function themeStatusLabel(theme: AdminThemeItem) {
  return theme.valid ? 'Hợp lệ' : `Lỗi: ${theme.error?.trim() || 'Gói theme không hợp lệ.'}`;
}

export function canApplyTheme(theme: AdminThemeItem | undefined, activeThemeId: string | null, busy: boolean) {
  return Boolean(theme?.valid && theme.id !== activeThemeId && !busy);
}

export function initialThemeSelection(themes: AdminThemeItem[], activeThemeId: string | null) {
  if (activeThemeId && themes.some((theme) => theme.id === activeThemeId)) return activeThemeId;
  return themes.find((theme) => theme.valid)?.id ?? themes[0]?.id ?? null;
}
