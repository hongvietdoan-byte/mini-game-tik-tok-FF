import { describe, expect, it, vi } from 'vitest';
import {
  adminTokenForRuntime,
  overlayUrlForRuntime,
  shouldPersistAdminToken,
  type StormArenaBridge,
} from './desktopBridge';

describe('desktop preload bridge', () => {
  it('keeps manual development token behavior when the bridge is absent', async () => {
    expect(await adminTokenForRuntime(undefined, 'dev-token')).toBe('dev-token');
    expect(shouldPersistAdminToken(undefined)).toBe(true);
    expect(overlayUrlForRuntime(null, 'http://127.0.0.1:5173/')).toBe('http://127.0.0.1:5174/');
  });

  it('uses the preload token and app info without persisting the token', async () => {
    const bridge: StormArenaBridge = {
      getAdminToken: vi.fn().mockResolvedValue('  desktop-token  '),
      getInfo: vi.fn().mockResolvedValue({
        version: '0.1.0',
        overlayUrl: 'http://127.0.0.1:8787/overlay/',
        dataDir: 'C:/Users/demo/AppData/StormArena',
      }),
    };

    expect(await adminTokenForRuntime(bridge, 'ignored-dev-token')).toBe('desktop-token');
    expect(shouldPersistAdminToken(bridge)).toBe(false);
    expect(overlayUrlForRuntime(await bridge.getInfo(), 'http://127.0.0.1:8787/dashboard/'))
      .toBe('http://127.0.0.1:8787/overlay/');
  });
});
