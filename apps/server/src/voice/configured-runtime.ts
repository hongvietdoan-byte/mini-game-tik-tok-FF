import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { join, resolve } from 'node:path';
import { McVoiceCache } from './cache';
import { ClipAiMcVoiceProvider } from './clipai-provider';
import { ClipAiHttpTransport } from './clipai-http-transport';
import { FfmpegMcVoiceAudioNormalizer } from './ffmpeg-normalizer';
import { McVoiceService } from './service';
import { EnvironmentMcVoiceCredentialStore, type McVoiceProfile } from './types';

export type ConfiguredMcVoiceRuntime = {
  credentials: EnvironmentMcVoiceCredentialStore;
  service: McVoiceService;
  cache: McVoiceCache;
  profile: McVoiceProfile;
};

type LocalProfile = {
  baseUrl: string;
  provider: string;
  model: string;
  voiceId: string;
  voiceSettings: Readonly<Record<string, string | number | boolean>>;
  allowedCdnHosts: readonly string[];
};

const MAX_PROFILE_BYTES = 16 * 1024;
const MAX_SETTINGS = 32;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function boundedText(value: unknown, max = 256): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/u.test(value);
}

function voiceSettings(value: unknown): Readonly<Record<string, string | number | boolean>> | null {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > MAX_SETTINGS || entries.some(([key, item]) => !boundedText(key, 80) ||
    !(boundedText(item, 256) || typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item))))) return null;
  return Object.fromEntries(entries) as Record<string, string | number | boolean>;
}

function localProfile(value: unknown): LocalProfile | null {
  if (!isRecord(value)) return null;
  const expected = new Set(['baseUrl', 'provider', 'model', 'voiceId', 'voiceSettings', 'allowedCdnHosts']);
  if (Object.keys(value).some((key) => !expected.has(key)) ||
    !boundedText(value.provider, 100) || !boundedText(value.model, 100) ||
    !boundedText(value.voiceId, 200) || !Array.isArray(value.allowedCdnHosts) ||
    !value.allowedCdnHosts.length || value.allowedCdnHosts.length > 32) return null;
  const settings = voiceSettings(value.voiceSettings);
  if (!settings) return null;

  let base: URL;
  try {
    if (!boundedText(value.baseUrl, 2_048)) return null;
    base = new URL(value.baseUrl);
  } catch {
    return null;
  }
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') return null;

  const hosts = value.allowedCdnHosts.map((item) => typeof item === 'string' ? item.trim().toLowerCase().replace(/\.$/u, '') : '');
  if (hosts.some((host) => !host || host.length > 253 || isIP(host) !== 0 ||
    host.split('.').some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label)))) return null;
  return {
    baseUrl: base.origin,
    provider: value.provider.trim(),
    model: value.model.trim(),
    voiceId: value.voiceId.trim(),
    voiceSettings: settings,
    allowedCdnHosts: [...new Set(hosts)],
  };
}

/** Loads only the operator's machine-local profile; no profile values are logged or serialized. */
export async function configuredMcVoiceRuntime(options: { cacheDirectory: string; profileFile?: string }): Promise<ConfiguredMcVoiceRuntime | null> {
  const credentials = new EnvironmentMcVoiceCredentialStore();
  const token = await credentials.get();
  if (!token) return null;

  const profilePath = resolve(options.profileFile ?? process.env.QUIZ_MC_VOICE_PROFILE_FILE ?? join('data', 'mc-voice-profile.json'));
  try {
    const raw = await readFile(profilePath);
    if (raw.byteLength > MAX_PROFILE_BYTES) return null;
    const profile = localProfile(JSON.parse(raw.toString('utf8')) as unknown);
    if (!profile) return null;
    const cache = new McVoiceCache(options.cacheDirectory);
    const runtimeProfile: McVoiceProfile = {
      model: profile.model,
      // Cache namespace binds account/endpoint, provider profile and voice without storing raw identifiers.
      voiceKey: createHash('sha256').update(JSON.stringify([
        profile.baseUrl, profile.provider, profile.model, profile.voiceId,
      ])).digest('hex'),
      rate: 1,
      voiceSettings: profile.voiceSettings,
    };
    const transport = new ClipAiHttpTransport({
      baseUrl: profile.baseUrl,
      apiProvider: profile.provider,
      model: profile.model,
      voiceId: profile.voiceId,
      voiceSettings: profile.voiceSettings,
      allowedCdnHosts: profile.allowedCdnHosts,
    });
    return {
      credentials,
      cache,
      profile: runtimeProfile,
      service: new McVoiceService(
        new ClipAiMcVoiceProvider(transport), cache, credentials, new FfmpegMcVoiceAudioNormalizer(),
      ),
    };
  } catch {
    // Invalid local configuration is treated as disabled; parser and filesystem details stay private.
    return null;
  }
}
