import { isIP } from 'node:net';
import type { McVoiceSynthesisRequest } from './types';
import { ClipAiTransportError, type ClipAiTransport } from './clipai-provider';

type ApiEnvelope = {
  code?: unknown;
  status?: unknown;
  msg?: unknown;
  message?: unknown;
  data?: unknown;
};
type AudioRow = { id?: unknown; status?: unknown; duration_ms?: unknown; url?: unknown; provider_error?: unknown };
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

export type ClipAiHttpProfile = {
  baseUrl: string;
  apiProvider: string;
  model: string;
  voiceId: string;
  voiceSettings: Readonly<Record<string, string | number | boolean>>;
  allowedCdnHosts: readonly string[];
};

function safeString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function retryAfterMs(value: string | null, message: string, code: number): number | undefined {
  if (value) {
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1_000, 30_000);
    const date = Date.parse(value);
    if (Number.isFinite(date)) return Math.min(Math.max(0, date - Date.now()), 30_000);
  }
  const match = /(?:retry|try)(?:\s+again)?\s+(?:after|in)\s+(\d+)\s*(?:s|sec|seconds?)/iu.exec(message) ??
    /(\d+)\s*(?:s|sec|seconds?)\s+(?:before|until)\s+(?:retry|try)/iu.exec(message);
  if (match) return Math.min((Number(match[1]) + 1) * 1_000, 30_000);
  return code === 1130 ? 1_000 : undefined;
}

function errorCode(envelope: ApiEnvelope, httpStatus: number, retryHeader: string | null): ClipAiTransportError {
  if (httpStatus === 401 || httpStatus === 403) return new ClipAiTransportError('AUTH');
  const message = safeString(envelope.msg) || safeString(envelope.message);
  if (/insufficient\s+(balance|credit)/iu.test(message)) return new ClipAiTransportError('NO_CREDIT');
  const code = Number(envelope.code);
  if (httpStatus === 429 || code === 1130)
    return new ClipAiTransportError('RATE_LIMITED', retryAfterMs(retryHeader, message, code === 1130 || httpStatus === 429 ? 1130 : code));
  return new ClipAiTransportError('FAILED');
}

function envelopeData(value: unknown, httpStatus: number, retryHeader: string | null): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ClipAiTransportError('FAILED');
  const envelope = value as ApiEnvelope;
  const code: number | undefined = envelope.code === undefined ? undefined : Number(envelope.code);
  const status = typeof envelope.status === 'string' ? envelope.status.toLowerCase() : undefined;
  const codeOk = code === undefined || code === 0 || code === 200;
  const statusOk = status === undefined || status === 'success' || status === 'ok';
  if (!(codeOk && statusOk) || (httpStatus !== 200 && httpStatus !== 201))
    throw errorCode(envelope, httpStatus, retryHeader);
  if (!envelope.data || typeof envelope.data !== 'object' || Array.isArray(envelope.data)) throw new ClipAiTransportError('FAILED');
  const data = envelope.data as Record<string, unknown>;
  if (typeof data.status === 'string' && ['failed', 'deleted'].includes(data.status.toLowerCase())) {
    const reason = safeString(data.provider_error);
    if (/insufficient\s+(balance|credit)/iu.test(reason)) throw new ClipAiTransportError('NO_CREDIT');
    throw new ClipAiTransportError('FAILED');
  }
  return data;
}

function requestSignal(signal: AbortSignal | undefined, timeoutMs: number) {
  return signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
}

async function readBoundedAudio(response: Response): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_AUDIO_BYTES)
    throw new ClipAiTransportError('DOWNLOAD_FAILED');
  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_AUDIO_BYTES) throw new ClipAiTransportError('DOWNLOAD_FAILED');
    return bytes;
  }
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_AUDIO_BYTES) {
        await reader.cancel().catch(() => {});
        throw new ClipAiTransportError('DOWNLOAD_FAILED');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export class ClipAiHttpTransport implements ClipAiTransport {
  private readonly baseUrl: URL;
  private readonly cdnHosts: Set<string>;

  constructor(private readonly profile: ClipAiHttpProfile) {
    this.baseUrl = new URL(profile.baseUrl);
    if (this.baseUrl.protocol !== 'https:' || this.baseUrl.username || this.baseUrl.password || this.baseUrl.search ||
      this.baseUrl.hash || this.baseUrl.pathname !== '/')
      throw new Error('MC Voice local profile invalid.');
    const hosts = profile.allowedCdnHosts.map((host) => host.toLowerCase().replace(/\.$/u, ''));
    if (!hosts.length || hosts.some((host) => isIP(host) !== 0 || host.split('.').some((label) =>
      !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label)))) throw new Error('MC Voice local profile invalid.');
    this.cdnHosts = new Set(hosts);
  }

  private async json(path: string, method: 'GET' | 'POST', token: string, body?: unknown, params?: URLSearchParams, signal?: AbortSignal) {
    const url = new URL(path, this.baseUrl);
    if (params) url.search = params.toString();
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: requestSignal(signal, 15_000),
        redirect: 'error',
      });
    } catch {
      throw new ClipAiTransportError('FAILED');
    }
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      if (response.status === 401 || response.status === 403) throw new ClipAiTransportError('AUTH');
      if (response.status === 429)
        throw new ClipAiTransportError('RATE_LIMITED', retryAfterMs(response.headers.get('retry-after'), '', 1130));
      throw new ClipAiTransportError('FAILED');
    }
    return envelopeData(raw, response.status, response.headers.get('retry-after'));
  }

  async submit(input: McVoiceSynthesisRequest, token: string, signal?: AbortSignal) {
    if (input.text.length > 2_000 || input.format !== 'mp3') throw new ClipAiTransportError('FAILED');
    const inputParams = { output_format: 'mp3', ...this.profile.voiceSettings };
    const data = await this.json('/api/sound/generate', 'POST', token, {
      name: 'quiz-mc-voice', provider: this.profile.apiProvider, type: 'tts', model: this.profile.model,
      text: input.text, voice_actor_id: this.profile.voiceId, input_params: inputParams,
    }, undefined, signal);
    const assetId = data.asset_id;
    if ((typeof assetId !== 'string' && typeof assetId !== 'number') || String(assetId).length === 0 || String(assetId).length > 200)
      throw new ClipAiTransportError('FAILED');
    return { jobId: String(assetId) };
  }

  private async page(token: string, page: number, signal?: AbortSignal): Promise<AudioRow[]> {
    const params = new URLSearchParams({ category: 'tts', page: String(page), page_size: '50' });
    const data = await this.json('/api/sound/audio-list', 'GET', token, undefined, params, signal);
    return Array.isArray(data.items) ? data.items.filter((row): row is AudioRow => !!row && typeof row === 'object') : [];
  }

  private async findAsset(assetId: string, token: string, signal?: AbortSignal): Promise<AudioRow | null> {
    for (let page = 1; page <= 5; page += 1) {
      const rows = await this.page(token, page, signal);
      const found = rows.find((row) => String(row.id ?? '') === assetId);
      if (found) return found;
      if (rows.length < 50) return null;
    }
    return null;
  }

  async poll(assetId: string, token: string, signal?: AbortSignal) {
    const row = await this.findAsset(assetId, token, signal);
    if (!row) return { status: 'PROCESSING' as const };
    const status = safeString(row.status).toLowerCase();
    if (status === 'failed' || status === 'deleted') {
      const reason = safeString(row.provider_error);
      return { status: 'FAILED' as const, code: /insufficient\s+(balance|credit)/iu.test(reason) ? 'NO_CREDIT' as const : 'FAILED' as const };
    }
    if (status === 'success' && typeof row.url === 'string' && row.url.length > 0) return { status: 'SUCCEEDED' as const };
    return { status: 'PROCESSING' as const };
  }

  async listAudio(assetId: string, token: string, signal?: AbortSignal) {
    const row = await this.findAsset(assetId, token, signal);
    if (!row || safeString(row.status).toLowerCase() !== 'success' || typeof row.url !== 'string' ||
      !Number.isSafeInteger(row.duration_ms) || Number(row.duration_ms) <= 0)
      return [];
    return [{ assetRef: row.url, durationMs: Number(row.duration_ms) }];
  }

  async download(assetRef: string, _token: string, signal?: AbortSignal) {
    let url: URL;
    try {
      url = new URL(assetRef);
    } catch {
      throw new ClipAiTransportError('DOWNLOAD_FAILED');
    }
    const host = url.hostname.toLowerCase().replace(/\.$/u, '');
    if (url.protocol !== 'https:' || url.username || url.password || !this.cdnHosts.has(host))
      throw new ClipAiTransportError('DOWNLOAD_FAILED');
    let response: Response;
    try {
      response = await fetch(url, { signal: requestSignal(signal, 15_000), redirect: 'error' });
    } catch {
      throw new ClipAiTransportError('DOWNLOAD_FAILED');
    }
    if (response.status === 429)
      throw new ClipAiTransportError('RATE_LIMITED', retryAfterMs(response.headers.get('retry-after'), '', 1130));
    if (!response.ok) throw new ClipAiTransportError('DOWNLOAD_FAILED');
    try {
      return await readBoundedAudio(response);
    } catch {
      throw new ClipAiTransportError('DOWNLOAD_FAILED');
    }
  }
}
