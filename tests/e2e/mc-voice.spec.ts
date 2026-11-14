import { expect, test, type Page } from '@playwright/test';
import type { McVoiceCue, PublicSnapshot } from '@quiz/contracts';
import { makeMockSnapshot } from '../../apps/overlay/src/mock/snapshots';

type McVoiceProbe = {
  contexts: number;
  voiceStarts: number;
  voiceStops: number;
  activeVoiceSources: number;
  maxConcurrentVoices: number;
  sfxTargets: number[];
};

declare global {
  interface Window { __mcVoiceProbe?: McVoiceProbe; }
}

const assetUrl = `/api/mc-voice/assets/${'a'.repeat(64)}`;

function cue(cueId: string, durationMs: number, startsAtServerMs: number): McVoiceCue {
  return { cueId, eventType: 'QUESTION', assetUrl, durationMs, startsAtServerMs };
}

async function installFakeAudioProvider(page: Page) {
  await page.addInitScript(() => {
    const probe: McVoiceProbe = {
      contexts: 0,
      voiceStarts: 0,
      voiceStops: 0,
      activeVoiceSources: 0,
      maxConcurrentVoices: 0,
      sfxTargets: [],
    };
    window.__mcVoiceProbe = probe;

    type GainWithRole = GainNode & { role: string };
    class FakeAudioContext {
      state: AudioContextState = 'running';
      destination = {} as AudioDestinationNode;
      onstatechange: ((this: BaseAudioContext, ev: Event) => unknown) | null = null;
      sampleRate = 44_100;
      private readonly startedAt = Date.now();
      private gainIndex = 0;

      constructor() { probe.contexts += 1; }
      get currentTime() { return (Date.now() - this.startedAt) / 1_000; }

      createGain() {
        const role = ['master', 'sfx', 'bgm', 'voice'][this.gainIndex++] ?? 'other';
        let gainValue = 0;
        const gain = {
          get value() { return gainValue; },
          set value(value: number) { gainValue = value; },
          cancelScheduledValues() {},
          setValueAtTime(value: number) { gainValue = value; },
          setTargetAtTime(value: number) {
            gainValue = value;
            if (role === 'sfx') probe.sfxTargets.push(value);
          },
          exponentialRampToValueAtTime(value: number) { gainValue = value; },
          linearRampToValueAtTime(value: number) { gainValue = value; },
        } as unknown as AudioParam;
        return { role, gain, connect() {} } as unknown as GainWithRole;
      }

      createBufferSource() {
        let destinationRole = '';
        let endTimer = 0;
        let finished = false;
        const source = {
          buffer: null as AudioBuffer | null,
          loop: false,
          onended: null as ((this: AudioScheduledSourceNode, ev: Event) => unknown) | null,
          connect(destination: GainWithRole) { destinationRole = destination.role; },
          start: (when = this.currentTime, _offset = 0, duration = 0.25) => {
            if (destinationRole !== 'voice') return;
            probe.voiceStarts += 1;
            probe.activeVoiceSources += 1;
            probe.maxConcurrentVoices = Math.max(probe.maxConcurrentVoices, probe.activeVoiceSources);
            endTimer = window.setTimeout(() => {
              if (finished) return;
              finished = true;
              probe.activeVoiceSources -= 1;
              source.onended?.call(source as unknown as AudioScheduledSourceNode, new Event('ended'));
            }, Math.max(0, (when - this.currentTime + duration) * 1_000));
          },
          stop: () => {
            if (destinationRole !== 'voice' || finished) return;
            finished = true;
            window.clearTimeout(endTimer);
            probe.voiceStops += 1;
            probe.activeVoiceSources = Math.max(0, probe.activeVoiceSources - 1);
            source.onended?.call(source as unknown as AudioScheduledSourceNode, new Event('ended'));
          },
        };
        return source as unknown as AudioBufferSourceNode;
      }

      createOscillator() {
        const param = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} } as unknown as AudioParam;
        return { type: 'sine', frequency: param, connect() {}, start() {}, stop() {}, onended: null } as unknown as OscillatorNode;
      }

      createBuffer(channels: number, length: number, sampleRate: number) {
        return { duration: length / sampleRate, getChannelData: () => new Float32Array(length) } as unknown as AudioBuffer;
      }
      createBiquadFilter() {
        const param = { value: 0, setValueAtTime() {} } as unknown as AudioParam;
        return { type: 'lowpass', frequency: param, Q: param, connect() {} } as unknown as BiquadFilterNode;
      }
      decodeAudioData() { return Promise.resolve({ duration: 2.5 } as AudioBuffer); }
      resume() { this.state = 'running'; return Promise.resolve(); }
      close() { this.state = 'closed'; return Promise.resolve(); }
    }

    (window as typeof window & { AudioContext: typeof AudioContext }).AudioContext = FakeAudioContext as unknown as typeof AudioContext;
  });
}

async function installVoiceSnapshots(page: Page, onHello: (send: (seq: number, stateVersion: number, voiceCue: McVoiceCue | null) => void) => void) {
  const base = makeMockSnapshot('question');
  if (!base) throw new Error('Missing question snapshot fixture.');
  await page.routeWebSocket('/ws', (socket) => {
    socket.onMessage((raw) => {
      const message = JSON.parse(String(raw)) as { type?: string };
      if (message.type !== 'HELLO') return;
      const send = (seq: number, stateVersion: number, voiceCue: McVoiceCue | null) => {
        const payload = { ...base, stateVersion, mcVoiceCue: voiceCue } as PublicSnapshot;
        socket.send(JSON.stringify({
          v: 1,
          type: 'STATE_SNAPSHOT',
          seq,
          sessionId: payload.sessionId,
          stateVersion,
          serverTimeMs: Date.now(),
          payload,
        }));
      };
      onHello(send);
    });
  });
}

async function probe(page: Page) {
  return page.evaluate(() => window.__mcVoiceProbe!);
}

test('program phát một lần cho mỗi cueId trùng trong snapshot và duck SFX', async ({ page }) => {
  await installFakeAudioProvider(page);
  await page.route('**/api/mc-voice/assets/**', (route) => route.fulfill({ status: 200, contentType: 'audio/mpeg', body: 'fake audio' }));
  await installVoiceSnapshots(page, (send) => {
    const first = cue('5313b7b7-5a67-4f2d-a17e-f9406f5f4321', 3_000, Date.now() + 50);
    send(1, 1, first);
    setTimeout(() => send(2, 2, { ...first }), 300);
  });

  await page.goto('/?role=program&sfx=0.6&bgm=0', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('stage')).toBeVisible();
  await expect.poll(async () => (await probe(page)).voiceStarts).toBe(1);
  await page.waitForTimeout(450);
  expect((await probe(page)).voiceStarts).toBe(1);

  const result = await probe(page);
  expect(result.contexts).toBe(1);
  expect(result.maxConcurrentVoices).toBe(1);
  expect(result.sfxTargets.some((value) => Math.abs(value - 0.6 * 0.22) < 0.00001)).toBe(true);
  expect(result.sfxTargets.some((value) => Math.abs(value - 0.6) < 0.00001)).toBe(true);
});

test('cue mới dừng giọng cũ trước khi phát, không chồng audio', async ({ page }) => {
  await installFakeAudioProvider(page);
  await page.route('**/api/mc-voice/assets/**', (route) => route.fulfill({ status: 200, contentType: 'audio/mpeg', body: 'fake audio' }));
  await installVoiceSnapshots(page, (send) => {
    send(1, 1, cue('5313b7b7-5a67-4f2d-a17e-f9406f5f4321', 5_000, Date.now()));
    setTimeout(() => send(2, 2, cue('694a9b45-252b-4eba-8d3b-7108e729142b', 1_500, Date.now() + 50)), 1_000);
  });

  await page.goto('/?role=program&sfx=0.6&bgm=0', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('stage')).toBeVisible();
  await expect.poll(async () => (await probe(page)).voiceStarts).toBe(1);
  await expect.poll(async () => (await probe(page)).voiceStarts).toBe(2);
  const result = await probe(page);
  expect(result.voiceStops).toBeGreaterThanOrEqual(1);
  expect(result.maxConcurrentVoices).toBe(1);
});

test('preview nhận cùng snapshot nhưng tuyệt đối không tạo audio provider hay phát tiếng', async ({ page }) => {
  await installFakeAudioProvider(page);
  await page.route('**/api/mc-voice/assets/**', (route) => route.fulfill({ status: 200, contentType: 'audio/mpeg', body: 'fake audio' }));
  await installVoiceSnapshots(page, (send) => {
    send(1, 1, cue('5313b7b7-5a67-4f2d-a17e-f9406f5f4321', 1_000, Date.now()));
  });

  await page.goto('/?role=preview&sfx=0.6', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('stage')).toBeVisible();
  await page.waitForTimeout(250);
  expect(await probe(page)).toEqual({ contexts: 0, voiceStarts: 0, voiceStops: 0, activeVoiceSources: 0, maxConcurrentVoices: 0, sfxTargets: [] });
});

test('asset MC 404 được bỏ qua im lặng, không làm lỗi overlay', async ({ page }) => {
  await installFakeAudioProvider(page);
  await page.route('**/api/mc-voice/assets/**', (route) => route.fulfill({ status: 404, body: 'not found' }));
  await installVoiceSnapshots(page, (send) => {
    send(1, 1, cue('5313b7b7-5a67-4f2d-a17e-f9406f5f4321', 1_000, Date.now()));
  });

  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/?role=program&sfx=0.6', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('stage')).toBeVisible();
  await expect(page.getByTestId('overlay-audio-runtime')).toHaveAttribute('data-audio-state', 'running');
  await page.waitForTimeout(150);
  expect((await probe(page)).voiceStarts).toBe(0);
  expect(pageErrors).toEqual([]);
});
