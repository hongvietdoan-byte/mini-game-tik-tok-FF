import { memo, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { PublicSnapshot } from '@quiz/contracts';
import { AudioCueTracker, mcDuckingGain, parseAudioMix, type AudioCue, type VisualCue } from '../audio/audio-cues';
import { OverlayAudioEngine, type AudioEngineState } from '../audio/audio-engine';

const MIX = parseAudioMix(location.search);
const SOURCE_MODE = new URLSearchParams(location.search).get('source') === '1' || 'obsstudio' in window;
const FX_LOW = new URLSearchParams(location.search).get('fx') === 'low';

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

export const AudioFxLayer = memo(function AudioFxLayer({ snapshot, remainingMs }: { snapshot: PublicSnapshot; remainingMs: number }) {
  const tracker = useRef(new AudioCueTracker());
  const engine = useRef<OverlayAudioEngine | null>(null);
  const cleanupTimer = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const [audioState, setAudioState] = useState<AudioEngineState>('disabled');
  const [cues, setCues] = useState<AudioCue[]>([]);
  const [visualCue, setVisualCue] = useState<VisualCue | null>(null);
  const [visualVersion, setVisualVersion] = useState(0);
  const second = Math.max(0, Math.ceil(remainingMs / 1_000));

  useEffect(() => {
    if (cleanupTimer.current !== null) window.clearTimeout(cleanupTimer.current);
    const instance = engine.current ?? new OverlayAudioEngine(MIX, setAudioState);
    engine.current = instance;
    return () => {
      cleanupTimer.current = window.setTimeout(() => {
        instance.destroy();
        if (engine.current === instance) engine.current = null;
        cleanupTimer.current = null;
      }, 0);
    };
  }, []);

  useEffect(() => {
    const audio = engine.current;
    audio?.setDucking(mcDuckingGain(snapshot));
    const decision = tracker.current.consume(snapshot, second * 1_000);
    if (decision.cues.length) {
      for (const cue of decision.cues) void audio?.play(cue);
      setCues((previous) => [...previous, ...decision.cues].slice(-32));
    }
    if (decision.visualCue) {
      setVisualCue(decision.visualCue);
      setVisualVersion((previous) => previous + 1);
    }
  }, [
    second,
    snapshot,
    snapshot.scene,
    snapshot.state,
    snapshot.stateVersion,
    snapshot.question?.questionInstanceId,
    snapshot.round?.roundNumber,
  ]);

  const hintVisible = !SOURCE_MODE && audioState === 'suspended' && MIX.volume > 0 && (MIX.sfx > 0 || MIX.bgm > 0);
  const particleCount = reducedMotion ? 0 : FX_LOW ? 4 : 16;
  const confettiCount = snapshot.scene === 'VICTORY' && !reducedMotion && !FX_LOW ? 20 : 0;

  return <>
    <div
      className={`overlay-fx-layer ${FX_LOW ? 'is-low' : ''} ${reducedMotion ? 'is-reduced-motion' : ''}`}
      data-testid="overlay-fx"
      data-visual-cue={visualCue ?? ''}
      aria-hidden="true"
    >
      <div key={visualVersion} className={`overlay-fx-flash ${visualCue ? `is-${visualCue}` : ''}`} />
      {Array.from({ length: particleCount }, (_, index) => {
        const style = {
          '--particle-x': `${(index * 67 + 9) % 100}%`,
          '--particle-duration': `${9 + (index % 7) * 1.8}s`,
          '--particle-delay': `${-((index * 3) % 13)}s`,
        } as CSSProperties;
        return <i key={`particle-${index}`} className="overlay-fx-particle" style={style} />;
      })}
      {Array.from({ length: confettiCount }, (_, index) => {
        const style = {
          '--confetti-x': `${(index * 47 + 4) % 100}%`,
          '--confetti-delay': `${-((index * 11) % 9)}s`,
          '--confetti-duration': `${5 + (index % 5)}s`,
          '--confetti-hue': `${(index * 61) % 360}deg`,
        } as CSSProperties;
        return <i key={`confetti-${index}`} className="overlay-fx-confetti" style={style} />;
      })}
    </div>
    {hintVisible && <button type="button" className="audio-unlock-hint" data-testid="audio-unlock" onClick={() => void engine.current?.unlock()}>
      ♪ Bấm để bật âm
    </button>}
    <output
      hidden
      data-testid="overlay-audio-runtime"
      data-audio-state={audioState}
      data-phase={snapshot.state}
      data-cue-count={cues.length}
      data-cues={cues.join(',')}
      data-sfx={MIX.sfx}
      data-bgm={MIX.bgm}
      data-volume={MIX.volume}
    />
  </>;
}, (previous, next) => previous.snapshot === next.snapshot && Math.ceil(previous.remainingMs / 1_000) === Math.ceil(next.remainingMs / 1_000));
