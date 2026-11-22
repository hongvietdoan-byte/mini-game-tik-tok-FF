import { describe, expect, it } from 'vitest';
import { THEME_ASSET_SLOTS, ThemeManifestSchema, ThemeSlotRegistrySchema } from './theme';

const valid = {
  schemaVersion: 1,
  id: 'winter-event',
  name: 'Mùa đông',
  tokens: { deep: '#123456', 'font-body': "'Segoe UI', sans-serif" },
  fonts: [{ family: 'Theme Sans', file: 'fonts/theme.woff2', weight: 400, style: 'normal' }],
  assets: {
    'arena.background': 'assets/arena/bg.jpg',
    'audio.victory': 'assets/audio/victory.mp3',
    'audio.victory-music-1': 'assets/audio/victory-music-1.mp3',
  },
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

  it('giữ theme cũ hợp lệ và nhận override danh hiệu một phần theo theme hoặc sự kiện', () => {
    expect(ThemeManifestSchema.safeParse(valid).success).toBe(true);
    const parsed = ThemeManifestSchema.parse({ ...valid, achievements: {
      LONGEST_STREAK: { title: 'Chuỗi Bão Tố', icon: 'assets/achievements/streak.png' },
      MOST_CORRECT: { enabled: false, maxRows: 5 },
      eventOverrides: { 'ba-vuong-dai-chien-2026': { LONGEST_STREAK: { accentColor: '#FFCC58' } } },
    } });
    expect(parsed.achievements).toMatchObject({
      LONGEST_STREAK: { title: 'Chuỗi Bão Tố', icon: 'assets/achievements/streak.png' },
      MOST_CORRECT: { enabled: false, maxRows: 5 },
      eventOverrides: { 'ba-vuong-dai-chien-2026': { LONGEST_STREAK: { accentColor: '#FFCC58' } } },
    });
  });

  it('nhận skinAssets theo slot và registry chặn dữ liệu bố cục tự do', () => {
    const manifest = ThemeManifestSchema.parse({ ...valid, skinAssets: { K07: 'assets/K-khung/K07-o-dap-an' } });
    expect(manifest.skinAssets).toEqual({ K07: 'assets/K-khung/K07-o-dap-an' });
    expect(ThemeManifestSchema.safeParse({ ...valid, skinAssets: { 'K07;width': 'assets/frame' } }).success).toBe(false);
    expect(ThemeManifestSchema.safeParse({ ...valid, skinAssets: { K07: '../outside' } }).success).toBe(false);
    expect(ThemeManifestSchema.safeParse({ ...valid, position: { left: 1 } }).success).toBe(false);

    const registry = {
      schemaVersion: 1,
      slots: [{
        id: 'K07', nhom: 'K', lop: 1, thuMuc: 'assets/K-khung/K07-o-dap-an',
        files: [{ ten: 'default.png', batBuoc: true, trangThai: 'CAN_CHUAN_BI' }],
        kichThuoc: { rong: 100, cao: 48, tiLe: 100 / 48, saiSoPx: 0 }, nineSlice: null,
        dinhDang: ['PNG'], nenTrongSuot: true, dungLuongToiDa: 1_000_000,
        viTri: [{ man: 'QUESTION', x: 10, y: 20, rong: 100, cao: 48 }],
        nam_tren: [], nam_duoi: [], ghiChu: 'Khung đáp án.',
      }],
    };
    expect(ThemeSlotRegistrySchema.safeParse(registry).success).toBe(true);
    expect(ThemeSlotRegistrySchema.safeParse({ ...registry, slots: [{ ...registry.slots[0], left: 15 }] }).success).toBe(false);

    const offscreenEffect = {
      ...registry,
      slots: [{ ...registry.slots[0]!, id: 'H01', nhom: 'H', lop: 3,
        kichThuoc: { rong: 1200, cao: 640, tiLe: 1200 / 640, saiSoPx: 0 },
        viTri: [{ man: 'QUESTION', x: -60, y: -260, rong: 1200, cao: 640 }],
        ghiChu: 'Ảnh lấy theo bbox CSS đầy đủ; stage 1080×1920 sẽ cắt vùng tràn.' }],
    };
    expect(ThemeSlotRegistrySchema.safeParse(offscreenEffect).success).toBe(true);
    const repeatedEffectSlots = {
      ...offscreenEffect,
      slots: [{ ...offscreenEffect.slots[0]!, viTri: Array.from({ length: 80 }, (_, index) => ({
        man: 'QUESTION' as const, x: 97, y: 1935 + index, rong: 3, cao: 3,
      })) }],
    };
    expect(ThemeSlotRegistrySchema.safeParse(repeatedEffectSlots).success).toBe(true);
  });

  it('từ chối ID, màu, icon, slot và số dòng danh hiệu ngoài registry/spec với lỗi rõ', () => {
    const invalid = [
      { achievements: { UNKNOWN: { title: 'Không hợp lệ' } } },
      { achievements: { LONGEST_STREAK: { accentColor: 'gold' } } },
      { achievements: { LONGEST_STREAK: { icon: '../secret.png' } } },
      { achievements: { LONGEST_STREAK: { displaySlot: 'unknown' } } },
      { achievements: { LONGEST_STREAK: { maxRows: 5 } } },
      { achievements: { MOST_CORRECT: { maxRows: 0 } } },
      { achievements: { PERFECT_STAGE: { maxRows: 1 } } },
      { achievements: { eventOverrides: { 'Bad Event': { LONGEST_STREAK: { enabled: false } } } } },
    ];
    for (const extra of invalid) {
      const result = ThemeManifestSchema.safeParse({ ...valid, ...extra });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0]?.message).toBeTruthy();
    }
  });
});
