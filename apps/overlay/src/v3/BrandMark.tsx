import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useHudConfig } from '../hudConfig';
import { fitHudTextStyle, hudImageUrl } from './hudText';

export function BrandMark({ ribbon, wide = false }: { ribbon?: string; wide?: boolean }) {
  const config = useHudConfig();
  const customLogo = config.images.logo ? hudImageUrl(config.images.logo, '') : null;
  const fallbackLogo = '/assets/brand/logo.png';
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);
  useEffect(() => setFailedSource(null), [customLogo]);
  const imageSource = customLogo && failedSource !== customLogo ? customLogo : fallbackLogo;
  const logoAvailable = failedSource !== fallbackLogo;
  const ribbonText = ribbon ?? config.texts.arenaTitle;
  const ribbonStyle = wide ? undefined : fitHudTextStyle(ribbonText, 252, 16, 9);

  useLayoutEffect(() => {
    const element = ribbonRef.current;
    if (!element) return;

    const fit = () => {
      const computed = getComputedStyle(element);
      const maximumWidth = wide ? 560 : 252;
      const horizontalPadding = Number.parseFloat(computed.paddingLeft) + Number.parseFloat(computed.paddingRight);
      const textWidth = Math.max(1, maximumWidth - horizontalPadding);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      let size = wide ? 38 : 16;
      element.style.whiteSpace = 'nowrap';
      element.style.overflow = 'hidden';
      element.style.textOverflow = 'ellipsis';
      const fits = (fontSize: number) => {
        if (!context) return true;
        context.font = `${computed.fontWeight} ${fontSize}px ${computed.fontFamily}`;
        return context.measureText(ribbonText).width <= textWidth;
      };
      while (size > 9 && !fits(size)) {
        size = Math.max(9, size - 0.5);
      }
      element.style.fontSize = `${size}px`;
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
        <div className="v3-logo-frame" data-testid="brand-logo-frame">
          {logoAvailable ? (
            <img
              className="v3-brand-logo"
              data-testid="brand-logo"
              src={imageSource}
              alt="Bá Vương Đại Chiến — Ai là nhà vua bá khí"
              draggable={false}
              decoding="async"
              onError={() => setFailedSource(imageSource)}
            />
          ) : (
            <>
              <svg className="v3-crown" viewBox="0 0 120 60" aria-hidden="true">
                <path d="M8 52 L18 12 L42 34 L60 4 L78 34 L102 12 L112 52 Z" />
              </svg>
              <div className="v3-title-main" data-testid="brand-logo">
                <span>BÁ VƯƠNG</span>
                <span>ĐẠI CHIẾN</span>
              </div>
              <small className="v3-title-tagline">AI LÀ NHÀ VUA BÁ KHÍ</small>
            </>
          )}
        </div>
      ) : logoAvailable ? (
        <img
          className="v3-brand-logo"
          data-testid="brand-image"
          src={imageSource}
          alt="Bá Vương Đại Chiến — Ai là nhà vua bá khí"
          draggable={false}
          onError={() => setFailedSource(imageSource)}
        />
      ) : (
        <>
          <svg className="v3-crown" viewBox="0 0 120 60" aria-hidden="true">
            <path d="M8 52 L18 12 L42 34 L60 4 L78 34 L102 12 L112 52 Z" />
          </svg>
          <div className="v3-title-main">
            <span>BÁ VƯƠNG</span>
            <span>ĐẠI CHIẾN</span>
          </div>
        </>
      )}
      {ribbonText && <div ref={ribbonRef} className="v3-title-ribbon" style={ribbonStyle} title={ribbonText}>{ribbonText}</div>}
    </div>
  );
}
