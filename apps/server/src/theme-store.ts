import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import {
  ACHIEVEMENT_IDS,
  THEME_DEFAULT_ACHIEVEMENTS,
  MAX_THEME_FILE_BYTES,
  THEME_ALLOWED_EXTENSIONS,
  ThemeAchievementsSchema,
  ThemeManifestSchema,
  ThemeRelativePathSchema,
  type AchievementId,
  type AchievementThemePresentation,
  type PublicAchievementSnapshot,
  type ResolvedTheme,
  type ThemeAssetSlot,
  type ThemeAchievements,
  type ThemeManifest,
} from '@quiz/contracts';

const DIRECTORY_SLOTS = new Set<ThemeAssetSlot>(['chibi.bankDir', 'mc.sequenceDir']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.ogg', '.wav']);
const VIDEO_EXTENSIONS = new Set(['.webm', '.mp4']);
const STATE_FILE = 'theme-settings.json';

type ThemeState = { activeThemeId: string | null; version: number };
type LoadedTheme = { id: string; name: string; manifest: ThemeManifest; directory: string };
export type ThemeListItem = { id: string; name: string; valid: boolean; error?: string; active: boolean };

export class ThemeStoreError extends Error {
  constructor(readonly code: string, readonly statusCode: number, message: string) {
    super(message);
    this.name = 'ThemeStoreError';
  }
}

function isInside(root: string, target: string) {
  const rel = relative(root, target);
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`));
}

function safeRelativePath(value: string) {
  const parsed = ThemeRelativePathSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function expectedExtensions(slot: ThemeAssetSlot): Set<string> | null {
  if (slot.startsWith('audio.')) return AUDIO_EXTENSIONS;
  if (slot === 'arena.loopVideoWebm') return new Set(['.webm']);
  if (slot === 'arena.loopVideoMp4') return new Set(['.mp4']);
  return IMAGE_EXTENSIONS;
}

function mimeType(path: string) {
  const extension = extname(path).toLowerCase();
  const types: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webm': 'video/webm', '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2',
  };
  return types[extension] ?? null;
}

/**
 * Đọc và kiểm tra các gói theme từ đĩa. Lỗi của từng gói được giữ lại để Dashboard
 * hiển thị; lỗi thư mục gốc hay file settings không làm server dừng khởi động.
 */
export class ThemeStore {
  readonly themesDir: string;
  private state: ThemeState;
  private readonly valid = new Map<string, LoadedTheme>();
  private invalid = new Map<string, ThemeListItem>();

  constructor(themesDir: string, private readonly settingsDirectory: string) {
    this.themesDir = resolve(themesDir);
    this.state = this.readState();
    this.scan();
  }

  private readState(): ThemeState {
    try {
      const value = JSON.parse(readFileSync(join(this.settingsDirectory, STATE_FILE), 'utf8')) as Partial<ThemeState>;
      if ((value.activeThemeId === null || (typeof value.activeThemeId === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/u.test(value.activeThemeId)))
        && Number.isSafeInteger(value.version) && (value.version ?? 0) >= 1)
        return { activeThemeId: value.activeThemeId ?? null, version: value.version! };
    } catch { /* Lần chạy đầu hoặc settings hỏng: dùng cấu hình mặc định. */ }
    return { activeThemeId: null, version: 1 };
  }

  private persist() {
    mkdirSync(this.settingsDirectory, { recursive: true });
    const target = join(this.settingsDirectory, STATE_FILE);
    const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
    try {
      writeFileSync(temp, `${JSON.stringify(this.state, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
      renameSync(temp, target);
    } finally {
      if (existsSync(temp)) rmSync(temp, { force: true });
    }
  }

  private inspectTheme(directory: string, id: string, source?: unknown): LoadedTheme {
    const manifestFile = join(directory, 'theme.json');
    const parsed = ThemeManifestSchema.safeParse(source ?? JSON.parse(readFileSync(manifestFile, 'utf8')));
    if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => `${issue.path.join('.') || 'theme'}: ${issue.message}`).join('; '));
    const manifest = parsed.data;
    if (manifest.id !== id) throw new Error(`Id trong theme.json (${manifest.id}) phải trùng tên thư mục (${id}).`);

    const rootReal = realpathSync(directory);
    const validatePath = (raw: string, label: string, directoryPath = false, allowed: Set<string> | null = null) => {
      const safe = safeRelativePath(raw);
      if (!safe) throw new Error(`${label}: đường dẫn không an toàn.`);
      const extension = extname(safe).toLowerCase();
      if (!directoryPath && !(THEME_ALLOWED_EXTENSIONS as readonly string[]).includes(extension))
        throw new Error(`${label}: đuôi tệp ${extension || '(không có)'} không được hỗ trợ.`);
      if (allowed && !allowed.has(extension)) throw new Error(`${label}: sai loại tệp cho slot này.`);
      let current = directory;
      for (const part of safe.split('/')) {
        current = join(current, part);
        const stat = lstatSync(current);
        if (stat.isSymbolicLink()) throw new Error(`${label}: không chấp nhận symlink.`);
      }
      const real = realpathSync(current);
      if (!isInside(rootReal, real)) throw new Error(`${label}: đường dẫn thoát khỏi thư mục theme.`);
      const stats = lstatSync(real);
      if (directoryPath ? !stats.isDirectory() : !stats.isFile()) throw new Error(`${label}: không tìm thấy ${directoryPath ? 'thư mục' : 'tệp'}.`);
      if (!directoryPath && stats.size > MAX_THEME_FILE_BYTES) throw new Error(`${label}: tệp vượt quá 50 MB.`);
      return safe;
    };

    for (const [rawSlot, rawPath] of Object.entries(manifest.assets)) {
      if (!rawPath) continue;
      const slot = rawSlot as ThemeAssetSlot;
      if (DIRECTORY_SLOTS.has(slot)) validatePath(rawPath, `assets.${slot}`, true);
      else validatePath(rawPath, `assets.${slot}`, false, expectedExtensions(slot));
    }
    for (const [index, font] of manifest.fonts.entries()) {
      if (extname(font.file).toLowerCase() !== '.woff2') throw new Error(`fonts[${index}].file: chỉ hỗ trợ .woff2.`);
      validatePath(font.file, `fonts[${index}].file`, false, new Set(['.woff2']));
    }
    const validateAchievementIcons = (overrides: Record<string, { icon?: string | null }>, prefix: string) => {
      for (const [achievementId, override] of Object.entries(overrides)) {
        if (!override.icon) continue;
        const label = `${prefix}.${achievementId}.icon`;
        try { validatePath(override.icon, label, false, IMAGE_EXTENSIONS); }
        catch (error) {
          const message = error instanceof Error ? error.message : 'không đọc được tệp';
          throw new Error(message.startsWith(`${label}:`) ? message : `${label}: không thể xác thực icon (${message}).`);
        }
      }
    };
    const { eventOverrides, ...baseAchievementOverrides } = manifest.achievements ?? {};
    validateAchievementIcons(baseAchievementOverrides, 'achievements');
    for (const [eventId, overrides] of Object.entries(eventOverrides ?? {}))
      validateAchievementIcons(overrides, `achievements.eventOverrides.${eventId}`);
    return { id, name: manifest.name, manifest, directory };
  }

  private scan() {
    this.valid.clear();
    this.invalid.clear();
    try {
      mkdirSync(this.themesDir, { recursive: true });
      const rootReal = realpathSync(this.themesDir);
      for (const entry of readdirSync(this.themesDir, { withFileTypes: true })) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
        const id = entry.name;
        let name = id;
        try {
          if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u.test(id)) throw new Error('Tên thư mục theme không hợp lệ.');
          if (entry.isSymbolicLink()) throw new Error('Thư mục theme không được là symlink.');
          const directory = join(this.themesDir, id);
          const real = realpathSync(directory);
          if (!isInside(rootReal, real)) throw new Error('Thư mục theme nằm ngoài kho theme.');
          const loaded = this.inspectTheme(directory, id);
          name = loaded.name;
          this.valid.set(id, loaded);
        } catch (error) {
          if (!entry.isSymbolicLink()) {
            try {
              const candidate = JSON.parse(readFileSync(join(this.themesDir, id, 'theme.json'), 'utf8')) as { name?: unknown };
              if (typeof candidate.name === 'string' && candidate.name.trim()) name = candidate.name.slice(0, 100);
            } catch { /* giữ tên thư mục */ }
          }
          this.invalid.set(id, { id, name, valid: false, error: error instanceof Error ? error.message : 'Gói theme không hợp lệ.', active: this.state.activeThemeId === id });
        }
      }
    } catch { /* Thư mục chưa tồn tại/không đọc được: server vẫn chạy với theme rỗng. */ }
  }

  reload(increment = true) {
    if (increment) {
      this.state.version += 1;
      this.persist();
    }
    return this.list();
  }

  list(): ThemeListItem[] {
    this.scan();
    const rows: ThemeListItem[] = [];
    for (const theme of this.valid.values()) rows.push({ id: theme.id, name: theme.name, valid: true, active: this.state.activeThemeId === theme.id });
    for (const theme of this.invalid.values()) rows.push({ ...theme, active: this.state.activeThemeId === theme.id });
    return rows.sort((a, b) => a.id.localeCompare(b.id));
  }

  get version() { return this.state.version; }
  get activeThemeId() { return this.state.activeThemeId; }

  getAchievements(themeId: string): ThemeAchievements | null {
    this.scan();
    const theme = this.valid.get(themeId);
    return theme ? structuredClone(theme.manifest.achievements ?? {}) : null;
  }

  saveAchievements(themeId: string, rawAchievements: unknown) {
    if (themeId === 'default')
      throw new ThemeStoreError('THEME_READ_ONLY', 422, 'Theme mặc định là gói xuất sẵn; hãy nhân bản thành theme mới trước khi chỉnh sửa.');
    if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u.test(themeId))
      throw new ThemeStoreError('THEME_ID_INVALID', 400, 'Mã theme không hợp lệ.');

    const parsedAchievements = ThemeAchievementsSchema.safeParse(rawAchievements);
    if (!parsedAchievements.success) {
      const message = parsedAchievements.error.issues
        .map((issue) => `${issue.path.join('.') || 'achievements'}: ${issue.message}`)
        .join('; ');
      throw new ThemeStoreError('THEME_ACHIEVEMENTS_INVALID', 400, message);
    }

    this.scan();
    const theme = this.valid.get(themeId);
    if (!theme) {
      const exists = this.invalid.has(themeId);
      throw new ThemeStoreError(exists ? 'THEME_INVALID' : 'THEME_NOT_FOUND', exists ? 422 : 404,
        exists ? 'Theme đang lỗi; hãy sửa gói theme trước khi lưu danh hiệu.' : 'Không tìm thấy theme này.');
    }

    const rootReal = realpathSync(this.themesDir);
    const directory = join(this.themesDir, themeId);
    if (lstatSync(directory).isSymbolicLink() || !isInside(rootReal, realpathSync(directory)))
      throw new ThemeStoreError('THEME_PATH_INVALID', 422, 'Thư mục theme không an toàn nên không thể ghi.');
    const target = join(directory, 'theme.json');
    const targetStat = lstatSync(target);
    if (targetStat.isSymbolicLink() || !targetStat.isFile())
      throw new ThemeStoreError('THEME_FILE_INVALID', 422, 'theme.json phải là tệp thường, không phải symlink.');

    const current = ThemeManifestSchema.safeParse(JSON.parse(readFileSync(target, 'utf8')));
    if (!current.success)
      throw new ThemeStoreError('THEME_INVALID', 422, 'Theme đang lỗi; hãy sửa manifest trước khi lưu danh hiệu.');
    const achievements = parsedAchievements.data;
    const manifest = {
      ...current.data,
      achievements: Object.keys(achievements).length ? achievements : undefined,
    };
    // Kiểm tra toàn bộ manifest và đường dẫn icon trước khi tạo tệp tạm hoặc backup.
    this.inspectTheme(directory, themeId, manifest);

    const stamp = new Date().toISOString().replace(/[:.]/gu, '-');
    let backup = `${target}.bak-${stamp}`;
    for (let suffix = 1; existsSync(backup); suffix += 1) backup = `${target}.bak-${stamp}-${suffix}`;
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    const contents = `${JSON.stringify(manifest, null, 2)}\n`;
    try {
      writeFileSync(temporary, contents, { flag: 'wx', mode: 0o600 });
      copyFileSync(target, backup);
      renameSync(temporary, target);
    } catch (error) {
      if (existsSync(temporary)) rmSync(temporary, { force: true });
      throw error;
    }

    this.reload();
    return { achievements, theme: this.resolve(themeId), themeVersion: this.version, backup: basename(backup) };
  }

  setActive(id: string) {
    this.scan();
    const theme = this.valid.get(id);
    if (!theme) return false;
    this.state = { activeThemeId: id, version: this.state.version + 1 };
    this.persist();
    return true;
  }

  resolveActive(eventId?: string): ResolvedTheme {
    this.scan();
    const theme = this.state.activeThemeId ? this.valid.get(this.state.activeThemeId) : undefined;
    if (!theme) return {
      id: 'default', name: 'Giao diện mặc định', version: this.state.version, tokens: {}, fonts: [], assets: {},
      achievements: this.mergeAchievementPresentations(undefined, eventId, () => ''),
    };
    return this.resolveTheme(theme, eventId);
  }

  resolve(themeId: string, eventId?: string): ResolvedTheme | null {
    this.scan();
    const theme = this.valid.get(themeId);
    return theme ? this.resolveTheme(theme, eventId) : null;
  }

  /** Lấy cấu hình danh hiệu đang có hiệu lực cho snapshot mà không quét lại thư mục theme. */
  resolveAchievementPresentations(eventId?: string): Record<AchievementId, AchievementThemePresentation> {
    const activeTheme = this.state.activeThemeId ? this.valid.get(this.state.activeThemeId) : undefined;
    const url = activeTheme
      ? (path: string) => `/themes/${encodeURIComponent(activeTheme.id)}/${path.split('/').map(encodeURIComponent).join('/')}?v=${this.state.version}`
      : () => '';
    return this.mergeAchievementPresentations(activeTheme, eventId, url);
  }

  decorateAchievementSnapshots(snapshots: readonly PublicAchievementSnapshot[], eventId?: string): PublicAchievementSnapshot[] {
    const presentations = this.resolveAchievementPresentations(eventId);
    return snapshots.map((snapshot) => ({ ...snapshot, presentation: presentations[snapshot.achievementId] }));
  }

  private mergeAchievementPresentations(
    theme: LoadedTheme | undefined,
    eventId: string | undefined,
    url: (path: string) => string,
  ): Record<AchievementId, AchievementThemePresentation> {
    const { eventOverrides, ...baseOverrides } = theme?.manifest.achievements ?? {};
    const forEvent = eventId ? eventOverrides?.[eventId] : undefined;
    return Object.fromEntries(ACHIEVEMENT_IDS.map((id) => {
      const themeOverride = baseOverrides[id] ?? {};
      const eventOverride = forEvent?.[id] ?? {};
      const iconPath = eventOverride.icon !== undefined ? eventOverride.icon : themeOverride.icon ?? null;
      return [id, {
        enabled: eventOverride.enabled ?? themeOverride.enabled ?? THEME_DEFAULT_ACHIEVEMENTS[id].enabled,
        title: eventOverride.title ?? themeOverride.title ?? THEME_DEFAULT_ACHIEVEMENTS[id].title,
        subtitle: eventOverride.subtitle ?? themeOverride.subtitle ?? THEME_DEFAULT_ACHIEVEMENTS[id].subtitle,
        icon: iconPath ? url(iconPath) : null,
        accentColor: eventOverride.accentColor ?? themeOverride.accentColor ?? THEME_DEFAULT_ACHIEVEMENTS[id].accentColor,
        maxRows: eventOverride.maxRows ?? themeOverride.maxRows ?? THEME_DEFAULT_ACHIEVEMENTS[id].maxRows,
        displaySlot: eventOverride.displaySlot ?? themeOverride.displaySlot ?? THEME_DEFAULT_ACHIEVEMENTS[id].displaySlot,
      } satisfies AchievementThemePresentation];
    })) as Record<AchievementId, AchievementThemePresentation>;
  }

  private resolveTheme(theme: LoadedTheme, eventId?: string): ResolvedTheme {
    const url = (path: string) => `/themes/${encodeURIComponent(theme.id)}/${path.split('/').map(encodeURIComponent).join('/')}?v=${this.state.version}`;
    const assets: Partial<Record<ThemeAssetSlot, string>> = {};
    for (const [slot, path] of Object.entries(theme.manifest.assets)) if (path) assets[slot as ThemeAssetSlot] = url(path);
    return {
      id: theme.id, name: theme.name, version: this.state.version, tokens: theme.manifest.tokens,
      fonts: theme.manifest.fonts.map((font) => ({ family: font.family, url: url(font.file), weight: font.weight, style: font.style })), assets,
      achievements: this.mergeAchievementPresentations(theme, eventId, url),
    };
  }

  resolveFile(themeId: string, rawRelativePath: string) {
    this.scan();
    const theme = this.valid.get(themeId);
    if (!theme) return null;
    // Sequence metadata is package control data, not a user asset. The overlay
    // needs this one JSON file to discover the PNG frames; no other JSON is served.
    const sequenceDirectory = theme.manifest.assets['mc.sequenceDir'];
    const isSequenceManifest = !!sequenceDirectory && rawRelativePath === `${sequenceDirectory}/manifest.json`;
    const safe = isSequenceManifest ? rawRelativePath : safeRelativePath(rawRelativePath);
    if (!safe) return null;
    try {
      const themeDir = join(this.themesDir, themeId);
      const themeRootReal = realpathSync(themeDir);
      let target = themeDir;
      for (const part of safe.split('/')) {
        target = join(target, part);
        if (lstatSync(target).isSymbolicLink()) return null;
      }
      const real = realpathSync(target);
      if (!isInside(themeRootReal, real) || !lstatSync(real).isFile()) return null;
      const extension = extname(real).toLowerCase();
      const type = isSequenceManifest && extension === '.json' ? 'application/json; charset=utf-8' : mimeType(real);
      if ((!isSequenceManifest && !(THEME_ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) || !type
        || lstatSync(real).size > MAX_THEME_FILE_BYTES) return null;
      return { path: real, mimeType: type, size: lstatSync(real).size };
    } catch { return null; }
  }

  /** Export CLI dùng để kiểm tra gói một thư mục trước khi chép vào kho. */
  static validateDirectory(directory: string) {
    const absolute = resolve(directory);
    const id = basename(absolute);
    try {
      if (lstatSync(absolute).isSymbolicLink() || !lstatSync(absolute).isDirectory())
        throw new Error('Đường dẫn theme phải là một thư mục thật, không phải symlink.');
      const store = Object.create(ThemeStore.prototype) as ThemeStore;
      return { success: true as const, manifest: store.inspectTheme(absolute, id) };
    } catch (error) {
      return { success: false as const, error: error instanceof Error ? error.message : 'Gói theme không hợp lệ.' };
    }
  }
}
