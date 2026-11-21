import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { ACHIEVEMENT_IDS, AchievementDisplaySlotSchema, THEME_DEFAULT_ACHIEVEMENTS, THEME_DEFAULT_TEXTS, THEME_DEFAULT_TOKENS, ThemeTextsSchema, type AchievementId, type AchievementThemePresentation, type ResolvedTheme, type ThemeAssetSlot, type ThemeFont } from '@quiz/contracts';

const EMPTY_THEME: ResolvedTheme = { id: 'default', name: 'Giao diện mặc định', version: 0, tokens: {}, fonts: [], assets: {}, texts: { ...THEME_DEFAULT_TEXTS } };
const ThemeContext = createContext<ResolvedTheme>(EMPTY_THEME);

function isFont(value: unknown): value is ThemeFont {
  if (typeof value !== 'object' || value === null) return false;
  const font = value as Record<string, unknown>;
  return typeof font.family === 'string' && typeof font.url === 'string'
    && (typeof font.weight === 'number' || font.weight === 'normal' || font.weight === 'bold')
    && (font.style === 'normal' || font.style === 'italic' || font.style === 'oblique');
}

function parseResolvedTheme(value: unknown): ResolvedTheme | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.name !== 'string' || typeof row.version !== 'number'
    || !Number.isFinite(row.version) || typeof row.tokens !== 'object' || row.tokens === null || Array.isArray(row.tokens)
    || !Array.isArray(row.fonts) || !row.fonts.every(isFont)
    || typeof row.assets !== 'object' || row.assets === null || Array.isArray(row.assets)) return null;

  const tokens: Record<string, string> = {};
  for (const [key, token] of Object.entries(row.tokens)) {
    if (/^[a-z][a-z0-9-]{0,63}$/u.test(key) && typeof token === 'string' && token.length <= 200
      && !/[;{}<>]/u.test(token) && !/url\s*\(|expression/iu.test(token)) tokens[key] = token;
  }
  const textsParsed = ThemeTextsSchema.safeParse(row.texts ?? {});
  if (!textsParsed.success) return null;
  const rawAchievements = typeof row.achievements === 'object' && row.achievements !== null && !Array.isArray(row.achievements)
    ? row.achievements as Record<string, unknown> : {};
  const achievements = Object.fromEntries(ACHIEVEMENT_IDS.map((id) => {
    const fallback = THEME_DEFAULT_ACHIEVEMENTS[id];
    const raw = typeof rawAchievements[id] === 'object' && rawAchievements[id] !== null && !Array.isArray(rawAchievements[id])
      ? rawAchievements[id] as Record<string, unknown> : {};
    const icon = typeof raw.icon === 'string' && raw.icon.startsWith('/themes/') ? raw.icon : null;
    const slot = AchievementDisplaySlotSchema.safeParse(raw.displaySlot);
    return [id, {
      enabled: typeof raw.enabled === 'boolean' ? raw.enabled : fallback.enabled,
      title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim().slice(0, 100) : fallback.title,
      subtitle: typeof raw.subtitle === 'string' ? raw.subtitle.trim().slice(0, 160) : fallback.subtitle,
      icon,
      accentColor: typeof raw.accentColor === 'string' && /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/iu.test(raw.accentColor)
        ? raw.accentColor : fallback.accentColor,
      maxRows: Number.isInteger(raw.maxRows) && Number(raw.maxRows) >= 0 && Number(raw.maxRows) <= 5 ? Number(raw.maxRows) : fallback.maxRows,
      displaySlot: slot.success ? slot.data : fallback.displaySlot,
    } satisfies AchievementThemePresentation];
  })) as Record<AchievementId, AchievementThemePresentation>;
  const assets: Partial<Record<ThemeAssetSlot, string>> = {};
  for (const [slot, url] of Object.entries(row.assets)) {
    if (typeof url === 'string' && url.startsWith('/themes/')) assets[slot as ThemeAssetSlot] = url;
  }
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    tokens,
    fonts: row.fonts,
    assets,
    texts: { ...THEME_DEFAULT_TEXTS, ...textsParsed.data },
    achievements,
  };
}

/** Thêm một tệp con vào URL thư mục theme mà vẫn giữ query version ở cuối. */
export function themeAssetChildUrl(directoryUrl: string, childPath: string): string {
  const queryAt = directoryUrl.indexOf('?');
  const pathname = queryAt < 0 ? directoryUrl : directoryUrl.slice(0, queryAt);
  const query = queryAt < 0 ? '' : directoryUrl.slice(queryAt);
  return `${pathname.replace(/\/+$/u, '')}/${childPath.split('/').map(encodeURIComponent).join('/')}${query}`;
}

export function themeAssetUrl(theme: ResolvedTheme, slot: ThemeAssetSlot, fallback: string): string {
  return theme.assets[slot] ?? fallback;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ themeVersion, mock = false, children }: { themeVersion?: number; mock?: boolean; children: ReactNode }) {
  const [theme, setTheme] = useState<ResolvedTheme>(EMPTY_THEME);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/theme', { cache: 'no-store' });
        if (!response.ok) return;
        const next = parseResolvedTheme(await response.json());
        if (active && next) setTheme((current) => current.id === next.id && current.version === next.version ? current : next);
      } catch {
        // Theme là tuỳ chọn; nếu API đang vắng thì giữ giao diện gốc.
      }
    };
    void load();
    const timer = mock ? window.setInterval(() => void load(), 2_500) : undefined;
    return () => {
      active = false;
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [mock, themeVersion]);

  const value = useMemo(() => theme, [theme]);
  useLayoutEffect(() => {
    const root = document.documentElement;
    const appliedKeys = new Set<string>();
    for (const [key, token] of Object.entries(theme.tokens)) {
      // Giá trị mặc định dùng nguyên fallback trong CSS để đảm bảo pixel cũ.
      if (THEME_DEFAULT_TOKENS[key as keyof typeof THEME_DEFAULT_TOKENS] === token) continue;
      const variable = `--theme-${key}`;
      root.style.setProperty(variable, token);
      appliedKeys.add(variable);
    }
    root.dataset.themeId = theme.id;
    root.dataset.themeVersion = String(theme.version);

    let active = true;
    const faces: FontFace[] = [];
    const loadFonts = async () => {
      for (const font of theme.fonts) {
        try {
          const face = new FontFace(font.family, `url("${font.url.replaceAll('"', '%22')}")`, {
            weight: String(font.weight), style: font.style,
          });
          await face.load();
          if (!active) return;
          document.fonts.add(face);
          faces.push(face);
        } catch {
          // Font lỗi không làm dừng cảnh; font-family dự phòng vẫn được dùng.
        }
      }
    };
    void loadFonts();
    return () => {
      active = false;
      for (const variable of appliedKeys) root.style.removeProperty(variable);
      for (const face of faces) document.fonts.delete(face);
    };
  }, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
