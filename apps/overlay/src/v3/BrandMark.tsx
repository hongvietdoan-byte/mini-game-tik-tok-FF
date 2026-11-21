import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useHudConfig } from '../hudConfig';
import { fitHudTextStyle, hudImageUrl } from './hudText';
import { themeAssetUrl, useTheme } from '../theme';
import { THEME_DEFAULT_TEXTS } from '@quiz/contracts';

export function BrandMark({ ribbon, wide = false }: { ribbon?: string; wide?: boolean }) {
  const config = useHudConfig();
  const theme = useTheme();
  const customLogo = config.images.logo ? hudImageUrl(config.images.logo, '') : null;
  const fallbackLogo = '/assets/brand/logo.png';
  const themeLogo = themeAssetUrl(theme, 'brand.logo', '');
  const candidates = [...new Set([themeLogo, customLogo, fallbackLogo].filter((source): source is string => !!source))];
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const imageSource = candidates.find((source) => !failedSources.includes(source)) ?? null;
  const logoFrameRef = useRef<HTMLDivElement>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const [wideBrandTextWidth, setWideBrandTextWidth] = useState(255);
  useEffect(() => setFailedSources([]), [customLogo, theme.version, themeLogo]);
  const logoAvailable = imageSource !== null;
  const ribbonText = ribbon ?? config.texts.arenaTitle;
  const ribbonStyle = wide ? undefined : fitHudTextStyle(ribbonText, 252, 16, 9);

  useLayoutEffect(() => {
    const frame = logoFrameRef.current;
    if (!wide || !frame) return;
    const updateWidth = () => {
      const nextWidth = Math.max(1, frame.clientWidth);
      setWideBrandTextWidth((current) => current === nextWidth ? current : nextWidth);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [wide, theme.version]);

  useLayoutEffect(() => {
    const element = ribbonRef.current;
    if (!element) return;

    const fit = () => {
      // Always measure from the stylesheet's original size. A previous theme may
      // have left an inline size behind, and that must not become the next base.
      element.style.fontSize = '';
      element.style.whiteSpace = 'nowrap';
      element.style.overflow = 'hidden';
      element.style.textOverflow = 'ellipsis';
      let size = Number.parseFloat(getComputedStyle(element).fontSize) || (wide ? 38 : 16);

      // scrollWidth uses the loaded browser font and letter spacing, unlike an
      // average-glyph estimate. Keep the default typography untouched whenever
      // the rendered text actually fits its fixed ribbon.
      while (size > 9 && element.scrollWidth > element.clientWidth) {
        size = Math.max(9, size - 0.5);
        element.style.fontSize = `${size}px`;
      }
    };

    fit();
    void document.fonts?.ready.then(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(element.parentElement ?? element);
    window.addEventListener('resize', fit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [ribbonText, wide]);

  return (
    <div className={`v3-title${wide ? ' is-wide' : ''}`} aria-label={`${config.texts.kicker} · ${config.texts.arenaTitle}`}>
      {wide ? (
        <div ref={logoFrameRef} className={`v3-logo-frame${logoAvailable ? '' : ' has-brand-copy'}`} data-testid="brand-logo-frame">
          {logoAvailable ? (
            <img
              className="v3-brand-logo"
              data-testid="brand-logo"
              src={imageSource}
              alt={config.texts.legacyBrandTitle + ' — ' + config.texts.brandTagline}
              draggable={false}
              decoding="async"
              onError={() => imageSource && setFailedSources((current) => current.includes(imageSource) ? current : [...current, imageSource])}
            />
          ) : (
            <>
              <svg className="v3-crown" viewBox="0 0 120 60" aria-hidden="true">
                <path d="M8 52 L18 12 L42 34 L60 4 L78 34 L102 12 L112 52 Z" />
              </svg>
              <div className="v3-title-main" data-testid="brand-logo">
                <span style={config.texts.brandTitleLine1 === THEME_DEFAULT_TEXTS.brandTitleLine1 ? undefined : { ...fitHudTextStyle(config.texts.brandTitleLine1, wideBrandTextWidth, 61, 8, 0.72), whiteSpace: 'nowrap', letterSpacing: 'normal' }}>{config.texts.brandTitleLine1}</span>
                <span style={config.texts.brandTitleLine2 === THEME_DEFAULT_TEXTS.brandTitleLine2 ? undefined : { ...fitHudTextStyle(config.texts.brandTitleLine2, wideBrandTextWidth, 61, 8, 0.72), whiteSpace: 'nowrap', letterSpacing: 'normal' }}>{config.texts.brandTitleLine2}</span>
              </div>
              <small className="v3-title-tagline" style={config.texts.brandTagline === THEME_DEFAULT_TEXTS.brandTagline ? undefined : { ...fitHudTextStyle(config.texts.brandTagline, wideBrandTextWidth, 11, 5, 0.72), whiteSpace: 'nowrap', letterSpacing: 'normal' }}>{config.texts.brandTagline}</small>
            </>
          )}
        </div>
      ) : logoAvailable ? (
        <img
          className="v3-brand-logo"
          data-testid="brand-image"
          src={imageSource}
          alt={config.texts.legacyBrandTitle + ' — ' + config.texts.brandTagline}
          draggable={false}
          onError={() => imageSource && setFailedSources((current) => current.includes(imageSource) ? current : [...current, imageSource])}
        />
      ) : (
        <>
          <svg className="v3-crown" viewBox="0 0 120 60" aria-hidden="true">
            <path d="M8 52 L18 12 L42 34 L60 4 L78 34 L102 12 L112 52 Z" />
          </svg>
          <div className="v3-title-main">
            <span style={config.texts.brandTitleLine1 === THEME_DEFAULT_TEXTS.brandTitleLine1 ? undefined : { ...fitHudTextStyle(config.texts.brandTitleLine1, 270, 46, 8, 0.72), whiteSpace: 'nowrap', letterSpacing: 'normal' }}>{config.texts.brandTitleLine1}</span>
            <span style={config.texts.brandTitleLine2 === THEME_DEFAULT_TEXTS.brandTitleLine2 ? undefined : { ...fitHudTextStyle(config.texts.brandTitleLine2, 270, 46, 8, 0.72), whiteSpace: 'nowrap', letterSpacing: 'normal' }}>{config.texts.brandTitleLine2}</span>
          </div>
        </>
      )}
      {ribbonText && <div ref={ribbonRef} className="v3-title-ribbon" style={ribbonStyle} title={ribbonText}>{ribbonText}</div>}
    </div>
  );
}
