import { overlayUrlFromLocation } from './logic';

export interface StormArenaInfo {
  version: string;
  overlayUrl: string;
  dataDir: string;
}

export interface StormArenaBridge {
  getAdminToken(): Promise<string | null>;
  getInfo(): Promise<StormArenaInfo>;
}

declare global {
  interface Window {
    stormArena?: StormArenaBridge;
  }
}

export async function adminTokenForRuntime(
  bridge: StormArenaBridge | undefined,
  developmentToken: string,
): Promise<string> {
  if (!bridge) return developmentToken;
  return (await bridge.getAdminToken())?.trim() ?? '';
}

export function shouldPersistAdminToken(bridge: StormArenaBridge | undefined): boolean {
  return bridge === undefined;
}

export function overlayUrlForRuntime(info: StormArenaInfo | null, currentHref: string): string {
  return info?.overlayUrl || overlayUrlFromLocation(currentHref);
}
