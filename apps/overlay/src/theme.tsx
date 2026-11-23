import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { ACHIEVEMENT_IDS, AchievementDisplaySlotSchema, THEME_DEFAULT_ACHIEVEMENTS, THEME_DEFAULT_TEXTS, THEME_DEFAULT_TOKENS, ThemeSlotRegistrySchema, ThemeTextsSchema, type AchievementId, type AchievementThemePresentation, type ResolvedTheme, type ThemeAssetSlot, type ThemeFont } from '@quiz/contracts';
import { THEME_SKIN_TARGETS, skinAssetUrl } from './theme-skins';

const EMPTY_THEME: ResolvedTheme = { id: 'default', name: 'Giao diện mặc định', version: 0, tokens: {}, fonts: [], assets: {}, texts: { ...THEME_DEFAULT_TEXTS } };
const ThemeContext = createContext<ResolvedTheme>(EMPTY_THEME);

function imageHasVisiblePixels(image: HTMLImageElement) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context || !canvas.width || !canvas.height) return true;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let alpha = 3; alpha < pixels.length; alpha += 4) if (pixels[alpha] !== 0) return true;
    return false;
  } catch {
    // A tainted or unsupported image must remain usable; only a verified fully
    // transparent PNG is treated as an unconfigured optional effect.
    return true;
  }
}

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
  const skinAssets: Record<string, string> = {};
  for (const [slot, directoryUrl] of Object.entries(row.skinAssets ?? {})) {
    if (/^[KIH]\d{2,3}$/u.test(slot) && typeof directoryUrl === 'string' && directoryUrl.startsWith('/themes/')) skinAssets[slot] = directoryUrl;
  }
  const skinSlotsParsed = ThemeSlotRegistrySchema.safeParse(row.skinSlots);
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    tokens,
    fonts: row.fonts,
    assets,
    skinAssets,
    ...(skinSlotsParsed.success ? { skinSlots: skinSlotsParsed.data } : {}),
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
        if (active && next) {
          // The exported `default` pack is an editable reference. Runtime still
          // uses shipped assets so its first render stays pixel-identical.
          const runtimeTheme = next.id === 'default' ? { ...next, assets: {} } : next;
          setTheme((current) => current.id === runtimeTheme.id && current.version === runtimeTheme.version ? current : runtimeTheme);
        }
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
      // Gói `default` chỉ là bản chụp/tham chiếu; giữ nguyên toàn bộ fallback CSS để không đổi pixel.
      if (theme.id === 'default' || THEME_DEFAULT_TOKENS[key as keyof typeof THEME_DEFAULT_TOKENS] === token) continue;
      const variable = `--theme-${key}`;
      root.style.setProperty(variable, token);
      appliedKeys.add(variable);
    }
    if (root.dataset.themeId !== theme.id) root.dataset.themeId = theme.id;
    if (root.dataset.themeVersion !== String(theme.version)) root.dataset.themeVersion = String(theme.version);

    const skinTargets = theme.id === 'default' ? [] : THEME_SKIN_TARGETS.flatMap((target) => {
      const directory = theme.skinAssets?.[target.id];
      if (!directory) return [];
      const slot = theme.skinSlots?.slots.find((entry) => entry.id === target.id);
      // The default pack captures the exact CSS pixels at the reference size;
      // custom themes use 9-slice so only the measured edge guides stay fixed.
      const nineSlice = theme.id === 'default' ? null : slot ? slot.nineSlice : target.nineSlice;
      const defaultImage = encodeURI(skinAssetUrl(directory));
      const rules = [{ selector: target.selector, images: [defaultImage] }];
      for (const variant of target.variants ?? []) {
        const legacyDirectory = variant.legacyId ? theme.skinAssets?.[variant.legacyId] : undefined;
        rules.push({
          selector: variant.selector,
          images: [
            encodeURI(skinAssetUrl(directory, variant.file)),
            ...(legacyDirectory ? [encodeURI(skinAssetUrl(legacyDirectory))] : []),
            defaultImage,
          ],
        });
      }
      return rules.map((rule) => ({ target, selector: rule.selector, images: [...new Set(rule.images)], nineSlice }));
    });
    const skinStyle = document.createElement('style');
    skinStyle.dataset.themeSkins = 'true';
    document.head.append(skinStyle);

    let active = true;
    const loadSkinImages = async () => {
      const loaded = await Promise.all(skinTargets.map(async ({ target, selector, images, nineSlice }) => {
        let image: string | null = null;
        let enableDefaultHiddenEffect = false;
        for (const candidate of images) {
          const result = await new Promise<{ loaded: boolean; visible: boolean }>((resolveImage) => {
            const probe = new Image();
            probe.onload = () => resolveImage({ loaded: true, visible: !target.defaultHidden || imageHasVisiblePixels(probe) });
            probe.onerror = () => resolveImage({ loaded: false, visible: false });
            probe.src = candidate;
          });
          if (result.loaded) {
            image = candidate;
            enableDefaultHiddenEffect = result.visible;
            break;
          }
        }
        if (!image) return null;
        // Most theme targets live inside #stage, but animated effects render
        // as siblings of it under .viewport. Scope to the overlay root so both
        // groups receive their selected skin without leaking into the page.
        const scopedSelector = selector.split(',').map((part) => `.viewport ${part.trim()}`).join(',');
        const enableEffect = target.defaultHidden && enableDefaultHiddenEffect
          ? `${scopedSelector}{display:block!important;visibility:visible!important;opacity:1!important}`
          : '';
        const skinRule = `${scopedSelector}{${nineSlice
          ? `background-image:none!important;border-image-source:url("${image}")!important;border-image-slice:${nineSlice.tren} ${nineSlice.phai} ${nineSlice.duoi} ${nineSlice.trai} fill!important;border-image-width:${nineSlice.tren}px ${nineSlice.phai}px ${nineSlice.duoi}px ${nineSlice.trai}px!important;border-image-repeat:stretch!important;border-image-outset:0!important`
          : `background-image:url("${image}")!important;background-size:100% 100%!important;background-position:center!important;background-repeat:no-repeat!important;background-origin:border-box!important`};background-color:transparent!important;border-color:transparent!important}`;
        const iconChildren = target.content === 'icon' ? `${scopedSelector}>*{visibility:hidden!important}` : '';
        return `${enableEffect}${skinRule}${iconChildren}`;
      }));
      if (active) skinStyle.textContent = loaded.filter((rule): rule is string => rule !== null).join('\n');
    };
    void loadSkinImages();
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
      skinStyle.remove();
      for (const variable of appliedKeys) root.style.removeProperty(variable);
      for (const face of faces) document.fonts.delete(face);
    };
  }, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
