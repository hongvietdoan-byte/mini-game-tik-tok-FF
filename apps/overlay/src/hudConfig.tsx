import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_HUD_CONFIG, HudConfigSchema, type HudConfig } from '@quiz/contracts';

const HudConfigContext = createContext<HudConfig>(DEFAULT_HUD_CONFIG);

export function HudConfigProvider({ config, children }: { config: HudConfig; children: ReactNode }) {
  return <HudConfigContext.Provider value={config}>{children}</HudConfigContext.Provider>;
}

export function useHudConfig(): HudConfig {
  return useContext(HudConfigContext);
}

/** The public HTTP endpoint is the source of custom content; WS hudVersion triggers live reload. */
export function useLiveHudConfig(version: number | undefined, isMockPreview: boolean): HudConfig {
  const [config, setConfig] = useState<HudConfig>(DEFAULT_HUD_CONFIG);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch('/api/hud', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const parsed = HudConfigSchema.safeParse(await response.json() as unknown);
        if (active && parsed.success) setConfig(parsed.data);
      } catch {
        // Keep the built-in design when the HUD endpoint is unavailable.
      }
    };
    void load();
    if (!isMockPreview) return () => { active = false; controller.abort(); };

    // Preview scenes do not open a WebSocket, so poll to reflect dashboard edits without a reload.
    const timer = window.setInterval(() => void load(), 1_000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [version, isMockPreview]);

  return config;
}
