import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeMockSnapshot } from '../mock/snapshots';
import { OverlayAudioEngine } from './audio-engine';
import { parseAudioMix } from './audio-cues';

type AudioProbe = {
  fetched: string[];
  starts: { label: string; loop: boolean; at: number }[];
  ramps: { value: number; at: number }[];
  gainTargets: { gain: number; value: number }[];
  stops: (number | undefined)[];
  resumes: number;
  closes: number;
};

function installAudioApi(available: string[], initialState: AudioContextState = 'running', audioBodies: Record<string, string> = {}) {
  const probe: AudioProbe = { fetched: [], starts: [], ramps: [], gainTargets: [], stops: [], resumes: 0, closes: 0 };
  let resumeAttempts = 0;
  let gainIndex = 0;
  class FakeAudioContext {
    state = initialState;
    currentTime = 12;
    sampleRate = 44_100;
    destination = {} as AudioDestinationNode;
    onstatechange: ((this: BaseAudioContext, ev: Event) => unknown) | null = null;

    createGain() {
      const currentGainIndex = gainIndex++;
      let value = 0;
      const gain = {
        get value() { return value; },
        set value(next: number) { value = next; },
        setValueAtTime(next: number) { value = next; },
        setTargetAtTime(next: number) { value = next; probe.gainTargets.push({ gain: currentGainIndex, value: next }); },
        linearRampToValueAtTime(next: number, at: number) { value = next; probe.ramps.push({ value: next, at }); },
        exponentialRampToValueAtTime(next: number) { value = next; },
        cancelScheduledValues() {},
      } as unknown as AudioParam;
      return { gain, connect() {} } as unknown as GainNode;
    }

    createBufferSource() {
      const currentTime = this.currentTime;
      const source = {
        buffer: null as AudioBuffer | null,
        loop: false,
        onended: null as ((this: AudioScheduledSourceNode, ev: Event) => unknown) | null,
        connect() {},
        start(at = currentTime) {
          probe.starts.push({ label: (source.buffer as AudioBuffer & { label?: string } | null)?.label ?? '', loop: source.loop, at });
        },
        stop(at?: number) { probe.stops.push(at); },
      };
      return source as unknown as AudioBufferSourceNode;
    }

    createBuffer(_channels: number, length: number, sampleRate: number) {
      return { duration: length / sampleRate, label: 'synth', getChannelData: () => new Float32Array(length) } as unknown as AudioBuffer;
    }
    decodeAudioData(data: ArrayBuffer) {
      const label = new TextDecoder().decode(data);
      const signature = [...label].reduce((sum, character) => sum + character.charCodeAt(0), 0) / 1_000;
      const samples = label.startsWith('unsampled-mismatch:')
        ? new Float32Array(64).fill(0.5)
        : new Float32Array(64).fill(signature);
      if (label === 'unsampled-mismatch:right') samples[0] = 0.75;
      return Promise.resolve({
        duration: 8, label, length: samples.length, numberOfChannels: 1, sampleRate: 44_100,
        getChannelData: () => samples,
      } as unknown as AudioBuffer & { label: string });
    }
    resume() {
      probe.resumes += 1;
      resumeAttempts += 1;
      if (initialState === 'suspended' && resumeAttempts === 1) return Promise.reject(new Error('autoplay remains locked'));
      this.state = 'running';
      return Promise.resolve();
    }
    close() { probe.closes += 1; this.state = 'closed'; return Promise.resolve(); }
  }

  vi.stubGlobal('window', { AudioContext: FakeAudioContext });
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('fetch', async (url: string) => {
    const path = new URL(url, 'http://overlay.test').pathname;
    probe.fetched.push(path);
    const label = path.split('/').at(-1)!;
    const exists = available.includes(label) || path.startsWith('/api/mc-voice/assets/');
    return {
      ok: exists,
      arrayBuffer: async () => new TextEncoder().encode(audioBodies[label] ?? label).buffer,
    } as Response;
  });
  return probe;
}

function mock(name: string) {
  const snapshot = makeMockSnapshot(name);
  if (!snapshot) throw new Error(`Unknown mock: ${name}`);
  return snapshot;
}

afterEach(() => vi.unstubAllGlobals());

describe('overlay BGM playback', () => {
  it('crossfades once per music group, mutes during victory, and stops sources on destroy', async () => {
    const probe = installAudioApi(['bgm-lobby.mp3', 'bgm-game.ogg']);
    const engine = new OverlayAudioEngine(parseAudioMix(''), () => undefined);
    const lobby = mock('lobby');
    engine.syncBgm(lobby);
    await vi.waitFor(() => expect(probe.starts).toHaveLength(1));
    expect(probe.starts[0]).toMatchObject({ label: 'bgm-lobby.mp3', loop: true });

    const playing = mock('question');
    for (const state of ['PREPARE', 'READING', 'ACCEPTING', 'REVEAL', 'LEADERBOARD'] as const)
      engine.syncBgm({ ...playing, state });
    await vi.waitFor(() => expect(probe.starts).toHaveLength(2));
    expect(probe.starts[1]).toMatchObject({ label: 'bgm-game.ogg', loop: true });
    expect(probe.ramps).toContainEqual({ value: 0, at: 13 });
    expect(probe.ramps).toContainEqual({ value: 1, at: 13 });

    const voiceCue = {
      cueId: 'voice-1', eventType: 'QUESTION' as const,
      assetUrl: `/api/mc-voice/assets/${'a'.repeat(64)}`,
      durationMs: 1_000, startsAtServerMs: Date.now(),
    };
    await engine.playMcVoice(voiceCue, 0);
    expect(probe.gainTargets).toContainEqual({ gain: 2, value: 0.18 * 0.22 });

    engine.syncBgm(mock('victory'));
    expect(probe.starts).toHaveLength(3); // Victory adds no BGM source; only the MC voice was added.
    expect(probe.stops).toContain(13.025);
    engine.destroy();
    expect(probe.closes).toBe(1);
    expect(probe.stops.filter((at) => at === undefined)).toHaveLength(3);
  });

  it('falls back to legacy bgm, then the generated loop when no audio files exist', async () => {
    const probe = installAudioApi(['bgm.ogg']);
    const engine = new OverlayAudioEngine(parseAudioMix('?bgm=0.25'), () => undefined);
    engine.syncBgm(mock('lobby'));
    await vi.waitFor(() => expect(probe.starts).toHaveLength(1));
    expect(probe.fetched).toEqual([
      '/assets/audio/bgm-lobby.mp3', '/assets/audio/bgm-lobby.ogg', '/assets/audio/bgm.mp3', '/assets/audio/bgm.ogg',
    ]);
    expect(probe.starts[0]?.label).toBe('bgm.ogg');
    engine.syncBgm({ ...mock('question'), state: 'PREPARE' });
    await vi.waitFor(() => expect(probe.fetched).toContain('/assets/audio/bgm-game.ogg'));
    expect(probe.starts).toHaveLength(1); // Both phases resolve to the same legacy file.
    engine.destroy();

    vi.unstubAllGlobals();
    const noAssets = installAudioApi([]);
    const syntheticEngine = new OverlayAudioEngine(parseAudioMix('?bgm=0.25'), () => undefined);
    syntheticEngine.syncBgm(mock('lobby'));
    await vi.waitFor(() => expect(noAssets.starts).toHaveLength(1));
    expect(noAssets.starts[0]).toMatchObject({ label: 'synth', loop: true });
    syntheticEngine.destroy();
  });

  it('keeps one source running when the lobby and game slots contain the same music file', async () => {
    const probe = installAudioApi(['bgm-lobby.mp3', 'bgm-game.mp3'], 'running', {
      'bgm-lobby.mp3': 'shared-user-track',
      'bgm-game.mp3': 'shared-user-track',
    });
    const engine = new OverlayAudioEngine(parseAudioMix(''), () => undefined);
    engine.syncBgm(mock('lobby'));
    await vi.waitFor(() => expect(probe.starts).toHaveLength(1));
    engine.syncBgm({ ...mock('question'), state: 'PREPARE' });
    await vi.waitFor(() => expect(probe.fetched).toContain('/assets/audio/bgm-game.mp3'));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(probe.starts).toHaveLength(1);
    expect(probe.stops).toEqual([]);
    engine.destroy();
  });

  it('uses the restored CC0 legacy OGG before the user-provided gameplay MP3 fallback', async () => {
    const probe = installAudioApi(['bgm-game.mp3', 'bgm.ogg'], 'running', {
      'bgm-game.mp3': 'user-backup',
      'bgm.ogg': 'cc0-game-loop',
    });
    const engine = new OverlayAudioEngine(parseAudioMix(''), () => undefined);
    engine.syncBgm({ ...mock('question'), state: 'PREPARE' });
    await vi.waitFor(() => expect(probe.starts).toHaveLength(1));
    expect(probe.starts[0]?.label).toBe('cc0-game-loop');
    expect(probe.fetched).toEqual(['/assets/audio/bgm-game.ogg', '/assets/audio/bgm.ogg']);
    engine.destroy();
  });

  it('does not treat tracks as identical when their only difference is outside the old sparse sample points', async () => {
    const probe = installAudioApi(['bgm-lobby.mp3', 'bgm-game.mp3'], 'running', {
      'bgm-lobby.mp3': 'unsampled-mismatch:left',
      'bgm-game.mp3': 'unsampled-mismatch:right',
    });
    const engine = new OverlayAudioEngine(parseAudioMix(''), () => undefined);
    engine.syncBgm(mock('lobby'));
    await vi.waitFor(() => expect(probe.starts).toHaveLength(1));
    engine.syncBgm({ ...mock('question'), state: 'PREPARE' });
    await vi.waitFor(() => expect(probe.starts).toHaveLength(2));
    engine.destroy();
  });

  it('waits for browser audio unlock before loading or starting the selected loop', async () => {
    const probe = installAudioApi(['bgm-lobby.mp3'], 'suspended');
    const engine = new OverlayAudioEngine(parseAudioMix('?bgm=0.25'), () => undefined);
    engine.syncBgm(mock('lobby'));
    expect(probe.fetched).toEqual([]);
    await engine.unlock();
    await vi.waitFor(() => expect(probe.starts).toHaveLength(1));
    expect(probe.resumes).toBeGreaterThan(0);
    engine.destroy();
  });
});
