import { useEffect, useState } from 'react';
import type { McState } from '@quiz/contracts';
import {
  advanceMcPlayback,
  getMcFallbackUrl,
  getMcFrameUrl,
  parseMcSequenceManifest,
  preloadMcAnimation,
  resolveMcAnimation,
  type ImageLoader,
  type McPlayback,
  type McSequenceManifest,
} from './mcSequence';

const DEFAULT_ASSET_BASE = '/assets/mc/kelly';
const DEFAULT_STATIC_FALLBACK = '/assets/mc/kelly.png';
const imageLoads = new Map<string, Promise<boolean>>();
const manifestLoads = new Map<string, Promise<McSequenceManifest | null>>();

/** Cache cả manifest hợp lệ lẫn trạng thái thiếu/lỗi theo assetBaseUrl. */
export function loadMcSequenceManifest(assetBaseUrl: string): Promise<McSequenceManifest | null> {
  const baseUrl = assetBaseUrl.replace(/\/+$/, '');
  const cached = manifestLoads.get(baseUrl);
  if (cached) return cached;

  const loading = Promise.resolve()
    .then(() => fetch(`${baseUrl}/manifest.json`))
    .then((response) => response.ok ? response.json() as Promise<unknown> : null)
    .then((value) => parseMcSequenceManifest(value))
    .catch(() => null);
  manifestLoads.set(baseUrl, loading);
  return loading;
}

function browserImageLoader(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  });
}

function cachedImageLoader(url: string): Promise<boolean> {
  const cached = imageLoads.get(url);
  if (cached) return cached;
  const loading = browserImageLoader(url);
  imageLoads.set(url, loading);
  return loading;
}

async function preloadForState(
  manifest: McSequenceManifest,
  state: McState,
  baseUrl: string,
  loadImage: ImageLoader,
): Promise<McPlayback | null> {
  const selection = resolveMcAnimation(manifest, state);
  const idle = resolveMcAnimation(manifest, 'idle');
  const nextName = selection.animation.then ?? 'idle';
  const next = resolveMcAnimation(manifest, nextName);
  const preload = new Map<string, ReturnType<typeof resolveMcAnimation>>();
  for (const animation of [selection, idle, next]) preload.set(animation.name, animation);

  const results = await Promise.all(
    [...preload.values()].map(async (animation) => ({ animation, result: await preloadMcAnimation(baseUrl, animation, loadImage) })),
  );
  const selectedResult = results.find(({ animation }) => animation.name === selection.name);
  if (selectedResult?.result.ok) return { ...selection, frameIndex: 0 };
  const idleResult = results.find(({ animation }) => animation.name === 'idle');
  return idleResult?.result.ok ? { ...idle, frameIndex: 0 } : null;
}

export type McSequenceProps = {
  state: McState;
  assetBaseUrl?: string;
  staticFallbackSrc?: string;
};

/** Phát PNG sequence ngoài assets-local; khi thiếu sequence sẽ dùng ảnh tĩnh Kelly. */
export function McSequence({
  state,
  assetBaseUrl = DEFAULT_ASSET_BASE,
  staticFallbackSrc = DEFAULT_STATIC_FALLBACK,
}: McSequenceProps) {
  const [manifest, setManifest] = useState<McSequenceManifest | null>(null);
  const [playback, setPlayback] = useState<McPlayback | null>(null);
  const [failedOver, setFailedOver] = useState(false);
  const [staticUnavailable, setStaticUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setManifest(null);
    setPlayback(null);
    void loadMcSequenceManifest(assetBaseUrl).then((value) => {
      if (!cancelled) setManifest(value);
    });
    return () => {
      cancelled = true;
    };
  }, [assetBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    setPlayback(null);
    if (!manifest) return () => { cancelled = true; };

    void preloadForState(manifest, state, assetBaseUrl, cachedImageLoader).then((nextPlayback) => {
      if (!cancelled) setPlayback(nextPlayback);
    });
    return () => {
      cancelled = true;
    };
  }, [assetBaseUrl, manifest, state]);

  useEffect(() => {
    if (!manifest || !playback) return;
    const interval = globalThis.setInterval(() => {
      setPlayback((current) => current ? advanceMcPlayback(current, manifest) : current);
    }, 1_000 / playback.animation.fps);
    return () => globalThis.clearInterval(interval);
  }, [manifest, playback?.name, playback?.animation.fps, playback?.animation.loop, playback?.animation.then]);

  const fallbackSrc = manifest
    ? getMcFallbackUrl(manifest, assetBaseUrl, staticFallbackSrc)
    : staticFallbackSrc;
  const frameSrc = manifest && playback ? getMcFrameUrl(assetBaseUrl, playback, playback.frameIndex) : null;
  const requestedSrc = failedOver ? staticFallbackSrc : frameSrc ?? fallbackSrc;

  useEffect(() => {
    setFailedOver(false);
    setStaticUnavailable(false);
  }, [frameSrc, fallbackSrc]);

  if (staticUnavailable) return null;
  return (
    <img
      className="mc-sequence"
      src={requestedSrc}
      alt=""
      aria-hidden="true"
      draggable={false}
      data-mc-animation={playback?.name ?? 'fallback'}
      onError={() => {
        if (requestedSrc !== staticFallbackSrc) setFailedOver(true);
        else setStaticUnavailable(true);
      }}
    />
  );
}
