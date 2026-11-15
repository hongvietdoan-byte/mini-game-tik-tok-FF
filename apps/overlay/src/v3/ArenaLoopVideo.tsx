import { useEffect, useState } from 'react';

const ARENA_LOOP_SOURCES = [
  { src: '/assets/arena/bg-loop.webm', type: 'video/webm' },
  { src: '/assets/arena/bg-loop.mp4', type: 'video/mp4' },
] as const;

export function ArenaLoopVideo({
  poster,
  className,
  testId,
}: {
  poster: string;
  className: string;
  testId: string;
}) {
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    setFailed(false);
    setPlaying(false);
  }, [poster]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  if (failed || reducedMotion) return null;
  return (
    <video
      className={`${className}${playing ? ' is-playing' : ''}`}
      data-testid={testId}
      data-video-state={playing ? 'playing' : 'loading'}
      poster={poster}
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
      disablePictureInPicture
      aria-hidden="true"
      onCanPlay={(event) => {
        void event.currentTarget.play()
          .then(() => setPlaying(true))
          .catch(() => setFailed(true));
      }}
      onError={() => setFailed(true)}
      onPlaying={() => setPlaying(true)}
    >
      {ARENA_LOOP_SOURCES.map((source) => <source key={source.src} src={source.src} type={source.type} />)}
    </video>
  );
}
