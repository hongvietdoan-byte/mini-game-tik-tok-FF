import { z } from 'zod';

export const THEME_ASSET_SLOTS = [
  'arena.background', 'arena.questionBackground',
  'arena.flag.0', 'arena.flag.1', 'arena.flag.2', 'arena.flag.3',
  'arena.flag.4', 'arena.flag.5', 'arena.flag.6', 'arena.flag.7',
  'arena.loopVideoWebm', 'arena.loopVideoMp4', 'brand.logo',
  'chibi.bankDir', 'chibi.podiumDir', 'mc.static', 'mc.sequenceDir', 'throne.bankDir',
  'victory.background', 'victory.userCover', 'victory.trophyStage',
  'audio.question-enter', 'audio.countdown-tick', 'audio.timeout',
  'audio.correct-answer', 'audio.top10', 'audio.victory', 'audio.transition',
  'audio.victory-music-1', 'audio.victory-music-2',
  'audio.bgm-lobby', 'audio.bgm-game', 'audio.bgm',
] as const;

export const THEME_ASSET_DIRECTORY_SLOTS = ['chibi.bankDir', 'chibi.podiumDir', 'mc.sequenceDir', 'throne.bankDir'] as const;

export const ThemeAssetSlotSchema = z.enum(THEME_ASSET_SLOTS);
export const ThemeAssetSlot = ThemeAssetSlotSchema;
export type ThemeAssetSlot = z.infer<typeof ThemeAssetSlotSchema>;

export const ACHIEVEMENT_IDS = [
  'FASTEST_CORRECT', 'STAGE_CHAMPION', 'LONGEST_STREAK', 'MOST_CORRECT', 'COMEBACK',
  'PERFECT_STAGE', 'FULL_PARTICIPATION', 'FIRST_CORRECT', 'ROUND_CHAMPION',
] as const;
export const AchievementIdSchema = z.enum(ACHIEVEMENT_IDS);
export type AchievementId = z.infer<typeof AchievementIdSchema>;

/** Số dòng tối đa là cố định theo evaluator; danh hiệu cộng đồng chỉ hiện tổng số. */
export const ACHIEVEMENT_MAX_ROWS: Readonly<Record<AchievementId, number>> = {
  FASTEST_CORRECT: 3,
  STAGE_CHAMPION: 3,
  LONGEST_STREAK: 3,
  MOST_CORRECT: 5,
  COMEBACK: 3,
  PERFECT_STAGE: 0,
  FULL_PARTICIPATION: 0,
  FIRST_CORRECT: 0,
  ROUND_CHAMPION: 3,
};

export const ACHIEVEMENT_DISPLAY_SLOTS = ['question-reveal', 'stage-recap', 'victory', 'lobby-rotation'] as const;
export const AchievementDisplaySlotSchema = z.enum(ACHIEVEMENT_DISPLAY_SLOTS);
export type AchievementDisplaySlot = z.infer<typeof AchievementDisplaySlotSchema>;

export type AchievementThemePresentation = {
  enabled: boolean;
  title: string;
  subtitle: string;
  icon: string | null;
  accentColor: string;
  maxRows: number;
  displaySlot: AchievementDisplaySlot;
};

/** Giá trị dự phòng trong ứng dụng; theme và event chỉ ghi đè các trường cần đổi. */
export const THEME_DEFAULT_ACHIEVEMENTS: Readonly<Record<AchievementId, Omit<AchievementThemePresentation, 'icon'>>> = {
  FASTEST_CORRECT: { enabled: true, title: 'ĐÚNG NHANH NHẤT', subtitle: 'TOP 3 NHANH NHẤT CÂU NÀY', accentColor: '#FFCC58', maxRows: 3, displaySlot: 'question-reveal' },
  STAGE_CHAMPION: { enabled: true, title: 'QUÁN QUÂN CHẶNG', subtitle: 'BXH CHẶNG HIỆN TẠI', accentColor: '#8CC8FB', maxRows: 3, displaySlot: 'stage-recap' },
  LONGEST_STREAK: { enabled: true, title: 'CHUỖI ĐÚNG DÀI NHẤT', subtitle: 'TOP 3 CHUỖI ĐÚNG DÀI NHẤT – TOÀN TRẬN', accentColor: '#FFCC58', maxRows: 3, displaySlot: 'victory' },
  MOST_CORRECT: { enabled: true, title: 'NHIỀU CÂU ĐÚNG NHẤT', subtitle: 'TOP 5 SỐ CÂU ĐÚNG – TOÀN TRẬN', accentColor: '#7049F5', maxRows: 5, displaySlot: 'lobby-rotation' },
  COMEBACK: { enabled: true, title: 'LỘI NGƯỢC DÒNG', subtitle: 'TOP 3 TĂNG HẠNG – CHẶNG HIỆN TẠI', accentColor: '#E47E5F', maxRows: 3, displaySlot: 'stage-recap' },
  PERFECT_STAGE: { enabled: true, title: 'CHẶNG HOÀN HẢO', subtitle: 'TỔNG SỐ NGƯỜI ĐẠT', accentColor: '#71E1BA', maxRows: 0, displaySlot: 'stage-recap' },
  FULL_PARTICIPATION: { enabled: true, title: 'THAM GIA TRỌN VẸN', subtitle: 'TỔNG SỐ NGƯỜI ĐẠT', accentColor: '#8CC8FB', maxRows: 0, displaySlot: 'victory' },
  FIRST_CORRECT: { enabled: true, title: 'ĐÃ CÓ CÂU TRẢ LỜI ĐÚNG', subtitle: 'TỔNG SỐ NGƯỜI ĐẠT', accentColor: '#71E1BA', maxRows: 0, displaySlot: 'victory' },
  ROUND_CHAMPION: { enabled: true, title: 'QUÁN QUÂN TOÀN TRẬN', subtitle: 'TOP 3 TOÀN TRẬN', accentColor: '#FFCC58', maxRows: 3, displaySlot: 'victory' },
};

export type AchievementThemeOverride = Partial<Omit<AchievementThemePresentation, 'icon'>> & { icon?: string | null };
export type AchievementThemeOverrides = Partial<Record<AchievementId, AchievementThemeOverride>>;

const ThemeColorSchema = z.string().regex(/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/iu,
  'Màu danh hiệu phải là mã hex (#RGB, #RGBA, #RRGGBB hoặc #RRGGBBAA).');
export const THEME_TOKEN_KEY = /^[a-z][a-z0-9-]{0,63}$/u;
export const THEME_GEOMETRY_TOKEN = /(^|-)(position|top|right|bottom|left|inset|offset|width|height|frame|x|y)(-|$)/iu;
export const THEME_ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.webm', '.mp4', '.mp3', '.ogg', '.wav', '.woff2'] as const;
export const MAX_THEME_FILE_BYTES = 50 * 1024 * 1024;

const ThemeTokenValueSchema = z.string().max(200).superRefine((value, ctx) => {
  if (/[;{}<]/u.test(value) || /url\s*\(|expression/iu.test(value))
    ctx.addIssue({ code: 'custom', message: 'Giá trị token chứa cú pháp CSS không an toàn.' });
  if (/[\u0000-\u001f\u007f]/u.test(value))
    ctx.addIssue({ code: 'custom', message: 'Giá trị token không được chứa ký tự điều khiển.' });
});

/** Paths use URL-style separators on every OS. No encoded or literal traversal is accepted. */
export const ThemeRelativePathSchema = z.string().min(1).max(240).superRefine((value, ctx) => {
  const segments = value.split('/');
  if (value.startsWith('/') || value.startsWith('\\') || value.includes('\\') || /^[a-z][a-z0-9+.-]*:/iu.test(value)
    || value.includes('%') || value.includes('?') || value.includes('#') || segments.some((part) => !part || part === '.' || part === '..')) {
    ctx.addIssue({ code: 'custom', message: 'Đường dẫn phải tương đối, dùng dấu / và không được thoát khỏi thư mục theme.' });
    return;
  }
  const extension = value.slice(value.lastIndexOf('/')).includes('.') ? value.slice(value.lastIndexOf('.')).toLowerCase() : '';
  if (extension && !(THEME_ALLOWED_EXTENSIONS as readonly string[]).includes(extension))
    ctx.addIssue({ code: 'custom', message: `Đuôi tệp ${extension} không được hỗ trợ.` });
});

/** A skin asset points to a slot directory, never to layout/CSS data. */
export const ThemeSkinSlotIdSchema = z.string().regex(/^[KIH]\d{2,3}$/u, 'Id slot skin phải là K/I/H theo sau bởi 2–3 chữ số.');
export const ThemeSkinAssetsSchema = z.record(ThemeSkinSlotIdSchema, ThemeRelativePathSchema).default({});

const ThemeSlotSceneSchema = z.enum([
  'LOBBY', 'QUESTION', 'REVEAL', 'LEADERBOARD', 'INTERIM_TOP10', 'VICTORY', 'INTERMISSION', 'CONNECTION_LOST',
]);
const ThemeSlotPositionSchema = z.object({
  man: ThemeSlotSceneSchema,
  // CSS boxes and repeated particles can extend past the clipped 1080×1920 stage;
  // store the full measured, unclipped box so custom artwork has exact dimensions.
  x: z.number().finite().min(-2160).max(2160),
  y: z.number().finite().min(-3840).max(3840),
  rong: z.number().finite().positive().max(2160),
  cao: z.number().finite().positive().max(3840),
}).strict().superRefine((position, ctx) => {
  if (position.x + position.rong > 2160) ctx.addIssue({ code: 'custom', path: ['rong'], message: 'BBox CSS vượt quá vùng đo tối đa 2160 px.' });
  if (position.y + position.cao > 3840) ctx.addIssue({ code: 'custom', path: ['cao'], message: 'BBox CSS vượt quá vùng đo tối đa 3840 px.' });
});
const ThemeSlotFileSchema = z.object({
  ten: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,99}$/iu, 'Tên file slot không hợp lệ.'),
  batBuoc: z.boolean(),
  trangThai: z.enum(['CO_SAN', 'CAN_CHUAN_BI', 'TUY_CHON']),
}).strict();
const ThemeSlotDimensionSchema = z.object({
  rong: z.number().finite().positive().max(2160),
  cao: z.number().finite().positive().max(3840),
  tiLe: z.number().finite().positive(),
  saiSoPx: z.number().int().min(0).max(10),
}).strict();
const ThemeNineSliceSchema = z.object({
  tren: z.number().int().min(0), phai: z.number().int().min(0), duoi: z.number().int().min(0), trai: z.number().int().min(0),
}).strict();
export const ThemeSlotSchema = z.object({
  id: ThemeSkinSlotIdSchema,
  nhom: z.enum(['K', 'I', 'H']),
  lop: z.number().int().min(0).max(3),
  thuMuc: ThemeRelativePathSchema,
  files: z.array(ThemeSlotFileSchema).min(1).max(32),
  kichThuoc: ThemeSlotDimensionSchema,
  nineSlice: ThemeNineSliceSchema.nullable(),
  dinhDang: z.array(z.enum(['PNG', 'WEBP', 'SVG'])).min(1).max(3),
  nenTrongSuot: z.boolean(),
  dungLuongToiDa: z.number().int().positive().max(MAX_THEME_FILE_BYTES),
  viTri: z.array(ThemeSlotPositionSchema).min(1).max(2_000),
  nam_tren: z.array(ThemeSkinSlotIdSchema).max(64),
  nam_duoi: z.array(ThemeSkinSlotIdSchema).max(64),
  ghiChu: z.string().max(1_000),
}).strict().superRefine((slot, ctx) => {
  if ((slot.nhom === 'K' && !slot.id.startsWith('K')) || (slot.nhom === 'I' && !slot.id.startsWith('I')) || (slot.nhom === 'H' && !slot.id.startsWith('H')))
    ctx.addIssue({ code: 'custom', path: ['id'], message: 'Tiền tố ID phải trùng nhóm slot.' });
  if (Math.abs(slot.kichThuoc.tiLe - slot.kichThuoc.rong / slot.kichThuoc.cao) > 0.01)
    ctx.addIssue({ code: 'custom', path: ['kichThuoc', 'tiLe'], message: 'Tỉ lệ phải khớp rộng/cao.' });
  if (slot.nineSlice && slot.nineSlice.trai + slot.nineSlice.phai >= slot.kichThuoc.rong)
    ctx.addIssue({ code: 'custom', path: ['nineSlice'], message: 'Hai vùng góc trái/phải phải nhỏ hơn chiều rộng slot.' });
  if (slot.nineSlice && slot.nineSlice.tren + slot.nineSlice.duoi >= slot.kichThuoc.cao)
    ctx.addIssue({ code: 'custom', path: ['nineSlice'], message: 'Hai vùng góc trên/dưới phải nhỏ hơn chiều cao slot.' });
});
export const ThemeSlotRegistrySchema = z.object({ schemaVersion: z.literal(1), slots: z.array(ThemeSlotSchema).max(500) }).strict()
  .superRefine((registry, ctx) => {
    const seen = new Set<string>();
    for (const [index, slot] of registry.slots.entries()) {
      if (seen.has(slot.id)) ctx.addIssue({ code: 'custom', path: ['slots', index, 'id'], message: `Id slot bị trùng: ${slot.id}.` });
      seen.add(slot.id);
      for (const related of [...slot.nam_tren, ...slot.nam_duoi]) {
        if (related === slot.id) ctx.addIssue({ code: 'custom', path: ['slots', index], message: 'Slot không thể tự chồng lên chính nó.' });
      }
    }
  });
export type ThemeSlot = z.infer<typeof ThemeSlotSchema>;
export type ThemeSlotRegistry = z.infer<typeof ThemeSlotRegistrySchema>;

const AchievementOverrideFieldsSchema = z.object({
  enabled: z.boolean().optional(),
  title: z.string().trim().min(1).max(100).optional(),
  subtitle: z.string().trim().max(160).optional(),
  icon: ThemeRelativePathSchema.nullable().optional(),
  accentColor: ThemeColorSchema.optional(),
  maxRows: z.number().int().min(0).max(5).optional(),
  displaySlot: AchievementDisplaySlotSchema.optional(),
}).strict();

function achievementOverrideSchema(id: AchievementId) {
  return AchievementOverrideFieldsSchema.superRefine((override, ctx) => {
    const maxRows = ACHIEVEMENT_MAX_ROWS[id];
    if (override.maxRows === undefined) return;
    if (maxRows === 0 && override.maxRows !== 0)
      ctx.addIssue({ code: 'custom', path: ['maxRows'], message: `${id} chỉ là danh hiệu đếm tổng, maxRows phải bằng 0.` });
    else if (maxRows > 0 && (override.maxRows < 1 || override.maxRows > maxRows))
      ctx.addIssue({ code: 'custom', path: ['maxRows'], message: `${id} chỉ cho phép từ 1 đến ${maxRows} dòng.` });
  });
}

const AchievementOverridesByIdSchema = z.object({
  FASTEST_CORRECT: achievementOverrideSchema('FASTEST_CORRECT').optional(),
  STAGE_CHAMPION: achievementOverrideSchema('STAGE_CHAMPION').optional(),
  LONGEST_STREAK: achievementOverrideSchema('LONGEST_STREAK').optional(),
  MOST_CORRECT: achievementOverrideSchema('MOST_CORRECT').optional(),
  COMEBACK: achievementOverrideSchema('COMEBACK').optional(),
  PERFECT_STAGE: achievementOverrideSchema('PERFECT_STAGE').optional(),
  FULL_PARTICIPATION: achievementOverrideSchema('FULL_PARTICIPATION').optional(),
  FIRST_CORRECT: achievementOverrideSchema('FIRST_CORRECT').optional(),
  ROUND_CHAMPION: achievementOverrideSchema('ROUND_CHAMPION').optional(),
}).strict();

export const ThemeAchievementsSchema = AchievementOverridesByIdSchema.extend({
  /** Ghi đè theo mã sự kiện; event luôn ưu tiên hơn cấu hình theme cùng ID. */
  eventOverrides: z.record(z.string().trim().min(1).max(120).regex(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u,
    'Mã sự kiện chỉ gồm chữ thường, số và dấu gạch ngang.'), AchievementOverridesByIdSchema).optional(),
}).strict();
export type ThemeAchievements = z.infer<typeof ThemeAchievementsSchema>;

const ThemeFontSchema = z.object({
  family: z.string().trim().min(1).max(100).superRefine((value, ctx) => {
    if (/[;{}<>]/u.test(value) || /url\s*\(|expression/iu.test(value))
      ctx.addIssue({ code: 'custom', message: 'Tên font chứa cú pháp CSS không an toàn.' });
  }),
  file: ThemeRelativePathSchema.superRefine((value, ctx) => {
    if (value.slice(value.lastIndexOf('.')).toLowerCase() !== '.woff2')
      ctx.addIssue({ code: 'custom', message: 'Font phải là tệp .woff2.' });
  }),
  weight: z.union([z.number().int().min(100).max(900), z.enum(['normal', 'bold'])]).default(400),
  style: z.enum(['normal', 'italic', 'oblique']).default('normal'),
}).strict();

const ThemeAssetsSchema = z.object({
  'arena.background': ThemeRelativePathSchema.optional(),
  'arena.questionBackground': ThemeRelativePathSchema.optional(),
  'arena.flag.0': ThemeRelativePathSchema.optional(), 'arena.flag.1': ThemeRelativePathSchema.optional(),
  'arena.flag.2': ThemeRelativePathSchema.optional(), 'arena.flag.3': ThemeRelativePathSchema.optional(),
  'arena.flag.4': ThemeRelativePathSchema.optional(), 'arena.flag.5': ThemeRelativePathSchema.optional(),
  'arena.flag.6': ThemeRelativePathSchema.optional(), 'arena.flag.7': ThemeRelativePathSchema.optional(),
  'arena.loopVideoWebm': ThemeRelativePathSchema.optional(), 'arena.loopVideoMp4': ThemeRelativePathSchema.optional(),
  'brand.logo': ThemeRelativePathSchema.optional(), 'chibi.bankDir': ThemeRelativePathSchema.optional(),
  'chibi.podiumDir': ThemeRelativePathSchema.optional(),
  'mc.static': ThemeRelativePathSchema.optional(), 'mc.sequenceDir': ThemeRelativePathSchema.optional(),
  'throne.bankDir': ThemeRelativePathSchema.optional(),
  'victory.background': ThemeRelativePathSchema.optional(), 'victory.userCover': ThemeRelativePathSchema.optional(),
  'victory.trophyStage': ThemeRelativePathSchema.optional(),
  'audio.question-enter': ThemeRelativePathSchema.optional(), 'audio.countdown-tick': ThemeRelativePathSchema.optional(),
  'audio.timeout': ThemeRelativePathSchema.optional(), 'audio.correct-answer': ThemeRelativePathSchema.optional(),
  'audio.top10': ThemeRelativePathSchema.optional(), 'audio.victory': ThemeRelativePathSchema.optional(),
  'audio.victory-music-1': ThemeRelativePathSchema.optional(), 'audio.victory-music-2': ThemeRelativePathSchema.optional(),
  'audio.transition': ThemeRelativePathSchema.optional(), 'audio.bgm-lobby': ThemeRelativePathSchema.optional(),
  'audio.bgm-game': ThemeRelativePathSchema.optional(), 'audio.bgm': ThemeRelativePathSchema.optional(),
}).strict();

const ThemeTextValueSchema = z.string().trim().max(200).superRefine((value, ctx) => {
  if (/[<>]/u.test(value))
    ctx.addIssue({ code: 'custom', message: 'Chữ theme không được chứa ký tự HTML.' });
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value))
    ctx.addIssue({ code: 'custom', message: 'Chữ theme không được chứa ký tự điều khiển.' });
});
const ThemeRequiredTextValueSchema = ThemeTextValueSchema.refine((value) => value.length > 0, 'Chữ theme không được để trống.');

/** Chữ thương hiệu theo theme; trường vắng dùng nguyên chữ HUD mặc định. */
export const ThemeTextsSchema = z.object({
  brandTitleLine1: ThemeRequiredTextValueSchema.optional(),
  brandTitleLine2: ThemeRequiredTextValueSchema.optional(),
  brandTagline: ThemeRequiredTextValueSchema.optional(),
  legacyBrandTitle: ThemeRequiredTextValueSchema.optional(),
  arenaWelcome: ThemeRequiredTextValueSchema.optional(),
  kicker: ThemeRequiredTextValueSchema.optional(),
  arenaTitle: ThemeRequiredTextValueSchema.optional(),
  playingLabel: ThemeRequiredTextValueSchema.optional(),
  roundLabel: ThemeRequiredTextValueSchema.optional(),
  leaderboardTitle: ThemeRequiredTextValueSchema.optional(),
  victoryTitle: ThemeTextValueSchema.optional(),
}).strict();
export type ThemeTexts = z.infer<typeof ThemeTextsSchema>;

export const THEME_DEFAULT_TEXTS: Readonly<Record<keyof ThemeTexts, string>> = {
  brandTitleLine1: 'BÁ VƯƠNG',
  brandTitleLine2: 'ĐẠI CHIẾN',
  brandTagline: 'AI LÀ NHÀ VUA BÁ KHÍ',
  legacyBrandTitle: 'BÁ VƯƠNG ĐẠI CHIẾN',
  arenaWelcome: 'CHÀO MỪNG ĐẾN VỚI\nĐẤU TRƯỜNG BÃO TỐ!',
  kicker: 'STORM ARENA',
  arenaTitle: 'ĐẤU TRƯỜNG BÃO TỐ',
  playingLabel: 'ĐANG CHƠI',
  roundLabel: 'VÒNG',
  leaderboardTitle: 'BXH TRỰC TIẾP',
  victoryTitle: '',
};

export const ThemeManifestSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u, 'Id theme chỉ gồm chữ thường, số và dấu gạch ngang.'),
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).default(''),
  tokens: z.record(z.string(), ThemeTokenValueSchema).superRefine((tokens, ctx) => {
    for (const key of Object.keys(tokens)) {
      if (!THEME_TOKEN_KEY.test(key))
        ctx.addIssue({ code: 'custom', path: [key], message: 'Tên token phải khớp ^[a-z][a-z0-9-]{0,63}$.' });
      if (THEME_GEOMETRY_TOKEN.test(key))
        ctx.addIssue({ code: 'custom', path: [key], message: 'Theme không được thay vị trí hoặc kích thước khung.' });
    }
  }),
  tokenDescriptions: z.record(z.string(), z.string().trim().max(200)).optional(),
  fonts: z.array(ThemeFontSchema).max(32).default([]),
  assets: ThemeAssetsSchema.default({}),
  /** Optional for C-0396 themes; adding skins never changes legacy slot semantics. */
  skinAssets: ThemeSkinAssetsSchema.optional(),
  texts: ThemeTextsSchema.optional(),
  achievements: ThemeAchievementsSchema.optional(),
}).strict();

export type ThemeManifest = z.infer<typeof ThemeManifestSchema>;
export type ThemeFont = { family: string; url: string; weight: number | 'normal' | 'bold'; style: 'normal' | 'italic' | 'oblique' };
export type ResolvedTheme = {
  id: string;
  name: string;
  version: number;
  tokens: Record<string, string>;
  fonts: ThemeFont[];
  assets: Partial<Record<ThemeAssetSlot, string>>;
  /** Slot-directory URLs; absent in legacy themes and omitted default skins. */
  skinAssets?: Record<string, string>;
  /** Validated slot artwork/slice metadata, delivered from the theme's slots.json. */
  skinSlots?: ThemeSlotRegistry;
  /** Complete, merged text values; old manifests resolve to THEME_DEFAULT_TEXTS. */
  texts?: Record<keyof ThemeTexts, string>;
  /** Luôn có ở theme resolved mới; optional để tương thích client/theme fixture cũ. */
  achievements?: Record<AchievementId, AchievementThemePresentation>;
};
