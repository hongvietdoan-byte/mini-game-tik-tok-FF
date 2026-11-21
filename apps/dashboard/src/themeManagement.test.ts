import { describe, expect, it } from 'vitest';
import { canApplyTheme, initialThemeSelection, themeApplyBlockReason, themeStatusLabel } from './themeManagement';
import type { AdminThemeItem } from './api/client';

const valid: AdminThemeItem = { id: 'tet-2027', name: 'Tết 2027', valid: true, active: false };
const invalid: AdminThemeItem = { id: 'broken', name: 'Theme lỗi', valid: false, error: 'tokens.width: Theme không được thay kích thước.', active: false };

describe('theme management helpers', () => {
  it('chỉ cho áp dụng theme hợp lệ khác theme đang dùng khi không bận', () => {
    expect(canApplyTheme(valid, null, false)).toBe(true);
    expect(canApplyTheme(valid, null, false, 'IDLE')).toBe(true);
    expect(canApplyTheme(valid, null, false, 'LOBBY')).toBe(true);
    expect(canApplyTheme(valid, null, false, 'ACCEPTING')).toBe(false);
    expect(themeApplyBlockReason('ACCEPTING')).toBe('Chỉ có thể đổi theme khi phiên ở trạng thái IDLE hoặc LOBBY.');
    expect(canApplyTheme(invalid, null, false)).toBe(false);
    expect(canApplyTheme(valid, valid.id, false)).toBe(false);
    expect(canApplyTheme(valid, null, true)).toBe(false);
    expect(canApplyTheme(undefined, null, false)).toBe(false);
  });

  it('hiển thị nguyên nhân lỗi dễ hiểu và ưu tiên theme đang dùng', () => {
    expect(themeStatusLabel(valid)).toBe('Hợp lệ');
    expect(themeStatusLabel(invalid)).toContain('Theme không được thay kích thước');
    expect(initialThemeSelection([valid, invalid], valid.id)).toBe(valid.id);
    expect(initialThemeSelection([invalid], null)).toBe(invalid.id);
    expect(initialThemeSelection([], null)).toBeNull();
  });
});
