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
  const ribbonStyle = fitHudTextStyle(ribbonText, wide ? 340 : 252, wide ? 15 : 16, 9);

  useLayoutEffect(() => {
    const element = ribbonRef.current;
    if (!element) return;

    const fit = () => {
      let size = wide ? 15 : 16;
      element.style.fontSize = `${size}px`;
      while (size > 9 && element.scrollWidth > element.clientWidth - 4) {
        size = Math.max(9, size - 0.5);
        element.style.fontSize = `${size}px`;
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element.parentElement ?? element);
    return () => observer.disconnect();
  }, [ribbonText, wide]);

  return (
    <div className={`v3-title${wide ? ' is-wide' : ''}`} aria-label={`${config.texts.kicker} · ${config.texts.arenaTitle}`}>
      {wide && logoAvailable ? (
        <img
          className="v3-brand-logo"
          data-testid="brand-logo"
          src={imageSource}
          alt="Bá Vương Đại Chiến — Ai là nhà vua bá khí"
          draggable={false}
          decoding="async"
          onError={() => setFailedSource(imageSource)}
        />
      ) : wide ? (
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
