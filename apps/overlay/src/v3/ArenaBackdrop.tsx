import { useState } from 'react';

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
}: { arena?: boolean; questionBackground?: boolean; showFlags?: boolean }) {
  const backgroundClass = questionBackground ? ' v3-bg--question-user' : '';
  return (
    <div className={`v3-bg${arena ? ' v3-bg--arena' : ''}${backgroundClass}`} data-layer="background-storm" aria-hidden="true">
      {arena && <img className={`v3-arena-backdrop-image${questionBackground ? ' v3-arena-backdrop-image--user' : ''}`} src={questionBackground ? '/assets/arena/bg-question-user.jpg' : '/assets/arena/bg.jpg'} alt="" draggable={false} decoding="async" />}
      {questionBackground && <span className="v3-question-banner-mask"><img src="/assets/arena/bg-question-user.jpg" alt="" draggable={false} decoding="async" /></span>}
      <span className="v3-storm" />
      <span className="v3-bolt-l" />
      <span className="v3-bolt-r" />
      <span className="v3-lights" />
      {showFlags && <div className="v3-arena-flags">{Array.from({ length: 8 }, (_, i) => <ArenaFlag key={i + 1} index={i + 1} />)}</div>}
    </div>
  );
}
