export type OverlayRole = 'preview' | 'program';

export function overlayRoleFromSearch(search: string): OverlayRole {
  return new URLSearchParams(search).get('role') === 'program' ? 'program' : 'preview';
}
