import type { GameState } from '@quiz/contracts';
import type { AdminThemeItem } from './api/client';

export function themeStatusLabel(theme: AdminThemeItem) {
  return theme.valid ? 'Hợp lệ' : `Lỗi: ${theme.error?.trim() || 'Gói theme không hợp lệ.'}`;
}

export function themeApplyBlockReason(gameState?: GameState | null) {
  return gameState && gameState !== 'IDLE' && gameState !== 'LOBBY'
    ? 'Chỉ có thể đổi theme khi phiên ở trạng thái IDLE hoặc LOBBY.'
    : '';
}

export function canApplyTheme(theme: AdminThemeItem | undefined, activeThemeId: string | null, busy: boolean, gameState?: GameState | null) {
  return Boolean(theme?.valid && theme.id !== activeThemeId && !busy && !themeApplyBlockReason(gameState));
}

export function initialThemeSelection(themes: AdminThemeItem[], activeThemeId: string | null) {
  if (activeThemeId && themes.some((theme) => theme.id === activeThemeId)) return activeThemeId;
  return themes.find((theme) => theme.valid)?.id ?? themes[0]?.id ?? null;
}
