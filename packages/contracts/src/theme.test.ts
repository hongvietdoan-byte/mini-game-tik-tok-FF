import { describe, expect, it } from 'vitest';
import { THEME_ASSET_SLOTS, ThemeManifestSchema } from './theme';

const valid = {
  schemaVersion: 1,
  id: 'winter-event',
  name: 'Mùa đông',
  tokens: { deep: '#123456', 'font-body': "'Segoe UI', sans-serif" },
  fonts: [{ family: 'Theme Sans', file: 'fonts/theme.woff2', weight: 400, style: 'normal' }],
  assets: { 'arena.background': 'assets/arena/bg.jpg', 'audio.victory': 'assets/audio/victory.mp3' },
};

describe('ThemeManifestSchema', () => {
  it('nhận theme hợp lệ và giữ enum slot đóng', () => {
    expect(ThemeManifestSchema.parse(valid)).toMatchObject({ description: '', assets: valid.assets });
    expect(THEME_ASSET_SLOTS).toContain('audio.countdown-tick');
    expect(THEME_ASSET_SLOTS).toContain('audio.victory-music-1');
    expect(THEME_ASSET_SLOTS).toContain('audio.victory-music-2');
    expect(ThemeManifestSchema.safeParse({ ...valid, assets: { 'unknown.slot': 'a.png' } }).success).toBe(false);
  });

  it('từ chối tên token sai, giá trị CSS nguy hiểm và đường dẫn thoát thư mục', () => {
    expect(ThemeManifestSchema.safeParse({ ...valid, tokens: { 'Deep Color': '#fff' } }).success).toBe(false);
    expect(ThemeManifestSchema.safeParse({ ...valid, tokens: { 'frame-width': '1080px' } }).success).toBe(false);
    for (const value of ['red; color:blue', 'url(https://example.test/x)', 'expression(alert(1))', '<script>'])
      expect(ThemeManifestSchema.safeParse({ ...valid, tokens: { deep: value } }).success).toBe(false);
    for (const path of ['../outside.png', 'assets/../../secret.png', '/etc/passwd', 'C:/secret.png'])
      expect(ThemeManifestSchema.safeParse({ ...valid, assets: { 'arena.background': path } }).success).toBe(false);
  });
});
