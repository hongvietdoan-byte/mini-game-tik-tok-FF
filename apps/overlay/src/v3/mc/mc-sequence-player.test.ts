import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadMcSequenceManifest } from './mc-sequence-player';

afterEach(() => vi.unstubAllGlobals());

describe('MC manifest loading cache', () => {
  it('uses the static-fallback state and caches a missing manifest once per base URL', async () => {
    const request = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal('fetch', request);
    const baseUrl = '/test-assets/mc/missing-sequence';

    const first = await loadMcSequenceManifest(baseUrl);
    const second = await loadMcSequenceManifest(`${baseUrl}/`);

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(`${baseUrl}/manifest.json`);
  });

  it('caches network errors as well as 404 responses', async () => {
    const request = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', request);
    const baseUrl = '/test-assets/mc/offline-sequence';

    await expect(loadMcSequenceManifest(baseUrl)).resolves.toBeNull();
    await expect(loadMcSequenceManifest(baseUrl)).resolves.toBeNull();

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('parses and reuses a valid manifest', async () => {
    const manifest = {
      id: 'mc-kelly-cache-test',
      animations: { idle: { path: 'idle', frames: 1, fps: 12, loop: true } },
    };
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => manifest });
    vi.stubGlobal('fetch', request);
    const baseUrl = '/test-assets/mc/valid-sequence';

    const first = await loadMcSequenceManifest(baseUrl);
    const second = await loadMcSequenceManifest(baseUrl);

    expect(first).toMatchObject({ id: manifest.id });
    expect(second).toBe(first);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
