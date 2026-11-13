export type OverlayRole = 'preview' | 'program';
export type OverlayFit = 'contain' | 'cover';

const STAGE_WIDTH = 1080;
const STAGE_HEIGHT = 1920;

export function overlayRoleFromSearch(search: string): OverlayRole {
  return new URLSearchParams(search).get('role') === 'program' ? 'program' : 'preview';
}

export function overlayFitFromSearch(search: string, role = overlayRoleFromSearch(search)): OverlayFit {
  const requested = new URLSearchParams(search).get('fit');
  if (requested === 'contain' || requested === 'cover') return requested;
  return role === 'program' ? 'cover' : 'contain';
}

export function overlayStageScale(width: number, height: number, fit: OverlayFit): number {
  const widthScale = width / STAGE_WIDTH;
  const heightScale = height / STAGE_HEIGHT;
  return fit === 'cover' ? Math.max(widthScale, heightScale) : Math.min(widthScale, heightScale);
}
