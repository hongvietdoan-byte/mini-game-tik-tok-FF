import { useEffect, useState } from 'react';
import { hudImageUrl } from './hudText';
import { ArenaLoopVideo } from './ArenaLoopVideo';

function ArenaFlag({ index }: { index: number }) {
  const [available, setAvailable] = useState(true);
  const side = index <= 4 ? 'left' : 'right';

  return (
    <span
      className={`v3-arena-flag v3-arena-flag-${index} v3-arena-flag-${side}${available ? '' : ' is-fallback'}`}
      data-testid={`arena-flag-${index}`}
      data-flag-index={index}
      aria-hidden="true"
    >
      <i className="v3-arena-flag-fallback">V</i>
      {available && (
        <img
          src={`/assets/arena/flags/flag-${index}.png`}
          alt=""
          draggable={false}
          decoding="async"
          onError={() => setAvailable(false)}
        />
      )}
    </span>
  );
}

export function ArenaBackdrop({
  arena = false,
  questionBackground = false,
  showFlags = arena,
  backgroundId = null,
}: { arena?: boolean; questionBackground?: boolean; showFlags?: boolean; backgroundId?: string | null }) {
  const [failedBackground, setFailedBackground] = useState<string | null>(null);
  useEffect(() => setFailedBackground(null), [backgroundId]);
  const useCustomBackground = !!backgroundId && failedBackground !== backgroundId;
  const fallbackBackground = questionBackground ? '/assets/arena/bg-question-user.jpg' : '/assets/arena/bg.jpg';
  const backgroundSrc = hudImageUrl(useCustomBackground ? backgroundId : null, fallbackBackground);
  const backgroundClass = questionBackground ? ' v3-bg--question-user' : '';
  return (
    <div className={`v3-bg${arena ? ' v3-bg--arena' : ''}${backgroundClass}`} data-layer="background-storm" aria-hidden="true">
      {arena && <>
        <img className={`v3-arena-backdrop-image${questionBackground && !useCustomBackground ? ' v3-arena-backdrop-image--user' : ''}`} data-testid="arena-background" src={backgroundSrc} alt="" draggable={false} decoding="async" onError={() => { if (useCustomBackground && backgroundId) setFailedBackground(backgroundId); }} />
        {questionBackground && <ArenaLoopVideo poster={backgroundSrc} className="v3-arena-backdrop-video" testId="arena-background-video" />}
      </>}
      <span className="v3-storm" />
      <span className="v3-bolt-l" />
      <span className="v3-bolt-r" />
      <span className="v3-lights" />
      {showFlags && <div className="v3-arena-flags">{Array.from({ length: 8 }, (_, i) => <ArenaFlag key={i + 1} index={i + 1} />)}</div>}
    </div>
  );
}
