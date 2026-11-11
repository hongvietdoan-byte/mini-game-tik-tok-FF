import type { McState } from '@quiz/contracts';

export type McSequenceAnimation = {
  path: string;
  frames: number;
  fps: number;
  loop: boolean;
  then?: McState;
};

export type McSequenceManifest = {
  id: string;
  fallback?: string;
  animations: Partial<Record<McState, McSequenceAnimation>> & { idle: McSequenceAnimation };
};

export type McAnimationSelection = {
  name: McState;
  animation: McSequenceAnimation;
};

export type McPlayback = McAnimationSelection & { frameIndex: number };

export type ImageLoader = (url: string) => Promise<boolean>;

const MC_STATES: readonly McState[] = ['idle', 'welcome', 'ask', 'react', 'celebrate'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeRelativePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const path = value.trim().replaceAll('\\', '/');
  if (!path || path.startsWith('/') || /^[a-z][a-z\d+.-]*:/i.test(path)) return null;
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0 || parts.some((part) => part === '.' || part === '..')) return null;
  return parts.join('/');
}

function parseAnimation(value: unknown): McSequenceAnimation | null {
  if (!isRecord(value)) return null;
  const path = safeRelativePath(value.path);
  if (
    !path ||
    typeof value.frames !== 'number' ||
    !Number.isInteger(value.frames) ||
    value.frames < 1 ||
    typeof value.fps !== 'number' ||
    !Number.isFinite(value.fps) ||
    value.fps <= 0 ||
    typeof value.loop !== 'boolean'
  ) {
    return null;
  }

  const then = MC_STATES.includes(value.then as McState) ? (value.then as McState) : undefined;
  return {
    path,
    frames: value.frames as number,
    fps: value.fps,
    loop: value.loop,
    ...(then ? { then } : {}),
  };
}

export function parseMcSequenceManifest(value: unknown): McSequenceManifest | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim() || !isRecord(value.animations)) return null;

  const idle = parseAnimation(value.animations.idle);
  if (!idle) return null;

  const animations: Partial<Record<McState, McSequenceAnimation>> & { idle: McSequenceAnimation } = { idle };
  for (const state of MC_STATES) {
    if (state === 'idle') continue;
    const animation = parseAnimation(value.animations[state]);
    if (animation) animations[state] = animation;
  }

  const fallback = safeRelativePath(value.fallback);
  return { id: value.id, ...(fallback ? { fallback } : {}), animations };
}

export function resolveMcAnimation(manifest: McSequenceManifest, state: McState): McAnimationSelection {
  const animation = manifest.animations[state] ?? manifest.animations.idle;
  return { name: manifest.animations[state] ? state : 'idle', animation };
}

export function getMcFrameUrl(baseUrl: string, selection: McAnimationSelection, frameIndex: number): string | null {
  if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= selection.animation.frames) return null;
  const base = baseUrl.replace(/\/+$/, '');
  const frameNumber = String(frameIndex + 1).padStart(4, '0');
  return `${base}/${selection.animation.path}/${frameNumber}.png`;
}

export function getMcFallbackUrl(manifest: McSequenceManifest, baseUrl: string, staticFallback: string): string {
  return manifest.fallback ? `${baseUrl.replace(/\/+$/, '')}/${manifest.fallback}` : staticFallback;
}

export function createMcPlayback(selection: McAnimationSelection, frameIndex = 0): McPlayback {
  return { ...selection, frameIndex };
}

export function advanceMcPlayback(playback: McPlayback, manifest: McSequenceManifest): McPlayback {
  const { animation, frameIndex } = playback;
  if (frameIndex + 1 < animation.frames) return { ...playback, frameIndex: frameIndex + 1 };
  if (animation.loop) return { ...playback, frameIndex: 0 };

  const next = resolveMcAnimation(manifest, animation.then ?? 'idle');
  return next.name === playback.name && !next.animation.loop
    ? playback
    : createMcPlayback(next);
}

export async function preloadMcAnimation(
  baseUrl: string,
  selection: McAnimationSelection,
  loadImage: ImageLoader,
): Promise<{ ok: boolean; urls: string[] }> {
  const urls = Array.from({ length: selection.animation.frames }, (_, frameIndex) =>
    getMcFrameUrl(baseUrl, selection, frameIndex),
  ).filter((url): url is string => url !== null);
  const loaded = await Promise.all(urls.map(loadImage));
  return { ok: urls.length > 0 && loaded.every(Boolean), urls };
}
