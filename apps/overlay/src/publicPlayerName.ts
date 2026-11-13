type PublicPlayerName = { safeDisplayName?: unknown; displayName?: unknown };

/** Prefer the public moderation field; legacy names are permitted only in local mock scenes. */
export function publicPlayerName(value: PublicPlayerName, fallback: string, allowLegacyName: boolean): string {
  if (typeof value.safeDisplayName === 'string' && value.safeDisplayName.trim()) return value.safeDisplayName;
  if (allowLegacyName && typeof value.displayName === 'string' && value.displayName.trim()) return value.displayName;
  return fallback;
}
