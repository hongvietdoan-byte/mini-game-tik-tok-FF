import { useEffect, useState } from 'react';
import { hudImageUrl } from './hudText';
import { ArenaLoopVideo } from './ArenaLoopVideo';
import type { ThemeAssetSlot } from '@quiz/contracts';
import { themeAssetUrl, useTheme } from '../theme';

function ArenaFlag({ index }: { index: number }) {
  const [available, setAvailable] = useState(true);
  const [failedTheme, setFailedTheme] = useState(false);
  const theme = useTheme();
  const themedSrc = themeAssetUrl(theme, `arena.flag.${index - 1}` as ThemeAssetSlot, '');
  const src = themedSrc && !failedTheme ? themedSrc : `/assets/arena/flags/flag-${index}.png`;
  const side = index <= 4 ? 'left' : 'right';
  useEffect(() => { setAvailable(true); setFailedTheme(false); }, [theme.version, themedSrc]);

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
          src={src}
          alt=""
          draggable={false}
          decoding="async"
          onError={() => {
            if (themedSrc && !failedTheme && src === themedSrc) setFailedTheme(true);
            else setAvailable(false);
          }}
        />
      )}
    </span>
  );
}

export function ArenaBackdrop({
  arena = false,
  questionBackground = false,
  loopVideo = false,
  showFlags = arena,
  backgroundId = null,
}: { arena?: boolean; questionBackground?: boolean; loopVideo?: boolean; showFlags?: boolean; backgroundId?: string | null }) {
  const theme = useTheme();
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const fallbackBackground = questionBackground ? '/assets/arena/bg-question-user.jpg' : '/assets/arena/bg.jpg';
  const themeBackground = themeAssetUrl(theme, questionBackground ? 'arena.questionBackground' : 'arena.background', '')
    || (questionBackground ? theme.assets['arena.background'] ?? '' : '');
  const customBackground = backgroundId ? hudImageUrl(backgroundId, '') : '';
  const backgroundSrc = [themeBackground, customBackground, fallbackBackground].find((source) => source && !failedSources.includes(source)) ?? fallbackBackground;
  const isStaticQuestionBackground = questionBackground && (backgroundSrc === fallbackBackground
    || (theme.id === 'default' && backgroundSrc === themeBackground));
  const backgroundClass = questionBackground ? ' v3-bg--question-user' : '';
  useEffect(() => setFailedSources([]), [backgroundId, questionBackground, theme.version]);
  return (
    <div className={`v3-bg${arena ? ' v3-bg--arena' : ''}${backgroundClass}`} data-layer="background-storm" aria-hidden="true">
      {arena && <>
        <img className={`v3-arena-backdrop-image${isStaticQuestionBackground ? ' v3-arena-backdrop-image--user' : ''}`} data-testid="arena-background" src={backgroundSrc} alt="" draggable={false} decoding="async" onError={() => setFailedSources((current) => current.includes(backgroundSrc) ? current : [...current, backgroundSrc])} />
        {loopVideo && <ArenaLoopVideo poster={backgroundSrc} className="v3-arena-backdrop-video" testId="arena-background-video" />}
      </>}
      <span className="v3-storm" />
      <span className="v3-bolt-l" />
      <span className="v3-bolt-r" />
      <span className="v3-lights" />
      {showFlags && <div className="v3-arena-flags">{Array.from({ length: 8 }, (_, i) => <ArenaFlag key={i + 1} index={i + 1} />)}</div>}
    </div>
  );
}
