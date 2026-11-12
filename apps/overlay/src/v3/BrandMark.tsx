import { useState } from 'react';

export function BrandMark({ ribbon, wide = false }: { ribbon?: string; wide?: boolean }) {
  const [logoAvailable, setLogoAvailable] = useState(true);

  return (
    <div className={`v3-title${wide ? ' is-wide' : ''}`} aria-label="Bá Vương Đại Chiến — Ai là nhà vua bá khí">
      {wide && logoAvailable ? (
        <img
          className="v3-brand-logo"
          data-testid="brand-logo"
          src="/assets/brand/logo.png"
          alt="Bá Vương Đại Chiến — Ai là nhà vua bá khí"
          draggable={false}
          decoding="async"
          onError={() => setLogoAvailable(false)}
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
          src="/assets/brand/logo.png"
          alt="Bá Vương Đại Chiến — Ai là nhà vua bá khí"
          draggable={false}
          onError={() => setLogoAvailable(false)}
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
      {ribbon && <div className="v3-title-ribbon">{ribbon}</div>}
    </div>
  );
}
