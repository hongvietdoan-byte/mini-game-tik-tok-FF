import { z } from 'zod';

export const THEME_ASSET_SLOTS = [
  'arena.background', 'arena.questionBackground',
  'arena.flag.0', 'arena.flag.1', 'arena.flag.2', 'arena.flag.3',
  'arena.flag.4', 'arena.flag.5', 'arena.flag.6', 'arena.flag.7',
  'arena.loopVideoWebm', 'arena.loopVideoMp4', 'brand.logo',
  'chibi.bankDir', 'mc.static', 'mc.sequenceDir',
  'victory.background', 'victory.userCover', 'victory.trophyStage',
  'audio.question-enter', 'audio.countdown-tick', 'audio.timeout',
  'audio.correct-answer', 'audio.top10', 'audio.victory', 'audio.transition',
  'audio.bgm-lobby', 'audio.bgm-game', 'audio.bgm',
] as const;

export const ThemeAssetSlotSchema = z.enum(THEME_ASSET_SLOTS);
export const ThemeAssetSlot = ThemeAssetSlotSchema;
export type ThemeAssetSlot = z.infer<typeof ThemeAssetSlotSchema>;

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
  'mc.static': ThemeRelativePathSchema.optional(), 'mc.sequenceDir': ThemeRelativePathSchema.optional(),
  'victory.background': ThemeRelativePathSchema.optional(), 'victory.userCover': ThemeRelativePathSchema.optional(),
  'victory.trophyStage': ThemeRelativePathSchema.optional(),
  'audio.question-enter': ThemeRelativePathSchema.optional(), 'audio.countdown-tick': ThemeRelativePathSchema.optional(),
  'audio.timeout': ThemeRelativePathSchema.optional(), 'audio.correct-answer': ThemeRelativePathSchema.optional(),
  'audio.top10': ThemeRelativePathSchema.optional(), 'audio.victory': ThemeRelativePathSchema.optional(),
  'audio.transition': ThemeRelativePathSchema.optional(), 'audio.bgm-lobby': ThemeRelativePathSchema.optional(),
  'audio.bgm-game': ThemeRelativePathSchema.optional(), 'audio.bgm': ThemeRelativePathSchema.optional(),
}).strict();

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
  fonts: z.array(ThemeFontSchema).max(32).default([]),
  assets: ThemeAssetsSchema.default({}),
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
};
