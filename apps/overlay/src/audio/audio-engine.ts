import { countdownTickPattern, loadBgmWithFallback, selectBgmTrack, type AudioCue, type AudioMix, type AudioSlot, type BgmFileExtension, type BgmTrack } from './audio-cues';
import { MC_VOICE_DUCKING_GAIN } from './audio-cues';
import { MC_COUNTDOWN_LATE_GRACE_MS } from './mc-voice';
import type { McVoiceCue, ThemeAssetSlot } from '@quiz/contracts';
import type { PublicSnapshot } from '@quiz/contracts';

export type AudioEngineState = 'disabled' | 'running' | 'suspended' | 'unavailable';

type StateListener = (state: AudioEngineState) => void;
const AUDIO_FILE_EXTENSIONS = ['mp3', 'ogg'] as const;
const BGM_CROSSFADE_SECONDS = 1;
const BGM_STOP_GRACE_SECONDS = 0.025;

type ActiveBgm = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  buffer: AudioBuffer;
  slot: string;
  targetGain: 0 | 1;
};

/** WebAudio playback with generated cues as the always-available fallback. */
export class OverlayAudioEngine {
  private readonly context: AudioContext | null;
  private readonly master: GainNode | null;
  private readonly sfx: GainNode | null;
  private readonly bgm: GainNode | null;
  private readonly voice: GainNode | null;
  private readonly buffers = new Map<string, Promise<AudioBuffer | null>>();
  private readonly voiceBuffers = new Map<string, Promise<AudioBuffer | null>>();
  private readonly activeSources = new Set<AudioScheduledSourceNode>();
  private readonly activeBgmSources = new Set<ActiveBgm>();
  private readonly activeVoiceSources = new Set<AudioBufferSourceNode>();
  private readonly voiceStopAt = new WeakMap<AudioBufferSourceNode, number>();
  private requestedBgmTrack: BgmTrack | null | undefined;
  private bgmGeneration = 0;
  private voiceSource: AudioBufferSourceNode | null = null;
  private voiceGeneration = 0;
  private countdownVoiceGeneration = 0;
  private destroyed = false;
  private ducking = 1;
  private assetUrls: Partial<Record<ThemeAssetSlot, string>>;

  constructor(private readonly mix: AudioMix, private readonly onState: StateListener, assetUrls: Partial<Record<ThemeAssetSlot, string>> = {}) {
    this.assetUrls = assetUrls;
    if (mix.volume <= 0) {
      this.context = null;
      this.master = null;
      this.sfx = null;
      this.bgm = null;
      this.voice = null;
      onState('disabled');
      return;
    }

    try {
      this.context = typeof window.AudioContext === 'function' ? new AudioContext({ latencyHint: 'interactive' }) : null;
    } catch {
      this.context = null;
    }
    if (!this.context) {
      this.master = null;
      this.sfx = null;
      this.bgm = null;
      this.voice = null;
      onState('unavailable');
      return;
    }

    this.master = this.context.createGain();
    this.sfx = this.context.createGain();
    this.bgm = this.context.createGain();
    this.voice = this.context.createGain();
    this.master.gain.value = mix.volume;
    this.sfx.gain.value = mix.sfx;
    this.bgm.gain.value = mix.bgm;
    this.voice.gain.value = 1;
    this.sfx.connect(this.master);
    this.bgm.connect(this.master);
    this.voice.connect(this.master);
    this.master.connect(this.context.destination);
    this.context.onstatechange = () => this.publishState();
    this.publishState();

    if (this.context.state === 'suspended') void this.unlock();
  }

  setThemeAssets(assetUrls: Partial<Record<ThemeAssetSlot, string>>) {
    const previous = this.assetUrls;
    const sameAudioAssets = (Object.keys(assetUrls) as ThemeAssetSlot[])
      .filter((slot) => slot.startsWith('audio.'))
      .every((slot) => previous[slot] === assetUrls[slot])
      && (Object.keys(previous) as ThemeAssetSlot[])
        .filter((slot) => slot.startsWith('audio.'))
        .every((slot) => previous[slot] === assetUrls[slot]);
    if (sameAudioAssets) return;
    this.assetUrls = assetUrls;
    this.buffers.clear();
    if (this.requestedBgmTrack !== undefined) {
      const generation = ++this.bgmGeneration;
      void this.transitionBgm(this.requestedBgmTrack, generation);
    }
  }

  private publishState() {
    if (!this.context) return;
    this.onState(this.context.state === 'running' ? 'running' : 'suspended');
  }

  async unlock() {
    if (!this.context || this.destroyed) return;
    try {
      await this.context.resume();
    } catch {
      // Browser autoplay policy keeps the context suspended until a user gesture.
    }
    this.publishState();
    if (this.context.state === 'running') this.ensureBgm();
  }

  syncBgm(snapshot: Pick<PublicSnapshot, 'state' | 'scene' | 'round'>) {
    const track = selectBgmTrack(snapshot);
    if (track === this.requestedBgmTrack) return;
    this.requestedBgmTrack = track;
    const generation = ++this.bgmGeneration;
    void this.transitionBgm(track, generation);
  }

  private ensureBgm() {
    if (this.requestedBgmTrack === undefined || !this.context || this.mix.bgm <= 0 || this.destroyed) return;
    void this.transitionBgm(this.requestedBgmTrack, this.bgmGeneration);
  }

  private async transitionBgm(track: BgmTrack | null, generation: number) {
    const context = this.context;
    if (!context || !this.bgm || this.mix.bgm <= 0 || this.destroyed || context.state !== 'running') return;
    if (!track) {
      this.fadeOutBgm();
      return;
    }

    const loaded = await loadBgmWithFallback(track, (slot, extension) => this.loadFile(slot, [extension]));
    if (generation !== this.bgmGeneration || this.requestedBgmTrack !== track || this.destroyed || context.state !== 'running') return;
    const buffer = loaded?.value ?? this.createBgmLoop();
    if (!buffer) return;

    const resolvedSlot = loaded ? `${loaded.slot}.${loaded.extension}` : 'synth';
    let alreadyPlaying: ActiveBgm | undefined;
    for (const active of this.activeBgmSources) {
      if (active.targetGain !== 1) continue;
      if (active.slot === resolvedSlot || await this.sameBgmAudio(active.buffer, buffer)) {
        alreadyPlaying = active;
        break;
      }
    }
    if (generation !== this.bgmGeneration || this.requestedBgmTrack !== track || this.destroyed || context.state !== 'running') return;
    if (alreadyPlaying) return;

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(1, context.currentTime + BGM_CROSSFADE_SECONDS);
    source.connect(gain);
    gain.connect(this.bgm);
    const active: ActiveBgm = { source, gain, buffer, slot: resolvedSlot, targetGain: 1 };
    source.onended = () => {
      this.activeSources.delete(source);
      this.activeBgmSources.delete(active);
    };
    this.activeSources.add(source);
    this.activeBgmSources.add(active);
    try {
      source.start(context.currentTime);
    } catch {
      this.activeSources.delete(source);
      this.activeBgmSources.delete(active);
      return;
    }
    this.fadeOutBgm(active);
  }

  /** Same content in the two configured phase slots should continue without a restart. */
  private async sameBgmAudio(left: AudioBuffer, right: AudioBuffer) {
    if (left === right) return true;
    if (left.duration !== right.duration || left.length !== right.length || left.numberOfChannels !== right.numberOfChannels || left.sampleRate !== right.sampleRate)
      return false;
    const sampleCount = left.length;
    if (sampleCount === 0) return true;
    // Compare every decoded sample without monopolizing the UI thread for long tracks.
    const chunkSize = 1_048_576;
    for (let channel = 0; channel < left.numberOfChannels; channel += 1) {
      const leftData = left.getChannelData(channel);
      const rightData = right.getChannelData(channel);
      for (let start = 0; start < sampleCount; start += chunkSize) {
        const end = Math.min(sampleCount, start + chunkSize);
        for (let index = start; index < end; index += 1) {
          if (leftData[index] !== rightData[index]) return false;
        }
        if (end < sampleCount) await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
    return true;
  }

  private fadeOutBgm(except?: ActiveBgm) {
    const context = this.context;
    if (!context) return;
    const now = context.currentTime;
    for (const active of this.activeBgmSources) {
      if (active === except || active.targetGain === 0) continue;
      const parameter = active.gain.gain;
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(parameter.value, now);
      parameter.linearRampToValueAtTime(0, now + BGM_CROSSFADE_SECONDS);
      active.targetGain = 0;
      try {
        active.source.stop(now + BGM_CROSSFADE_SECONDS + BGM_STOP_GRACE_SECONDS);
      } catch {
        // The source may have ended while its fade was being scheduled.
      }
    }
  }

  setDucking(gain: number) {
    this.ducking = Math.max(0, Math.min(1, gain));
    const now = this.context?.currentTime;
    if (now === undefined) return;
    for (const [bus, volume] of [[this.sfx, this.mix.sfx], [this.bgm, this.mix.bgm]] as const) {
      if (!bus || volume <= 0) continue;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.setTargetAtTime(volume * this.ducking, now, 0.035);
    }
  }

  async play(cue: AudioCue, remainingSecond = 0) {
    const context = this.context;
    if (!context || !this.sfx || this.mix.sfx <= 0 || this.destroyed) return;
    if (context.state !== 'running') {
      void this.unlock();
      return;
    }

    const file = await this.loadFile(cue);
    if (this.destroyed || context.state !== 'running') return;
    if (file) {
      const source = context.createBufferSource();
      source.buffer = file;
      source.connect(this.sfx);
      source.onended = () => this.activeSources.delete(source);
      this.activeSources.add(source);
      source.start();
      return;
    }
    this.synthesize(cue, remainingSecond);
  }

  async playMcVoice(cue: McVoiceCue, clockOffsetMs: number, options: { preserveScheduledCountdown?: boolean } = {}) {
    const generation = ++this.voiceGeneration;
    const context = this.context;
    const voice = this.voice;
    if (!context || !voice || this.destroyed || this.mix.volume <= 0) return;

    if (context.state !== 'running') await this.unlock();
    if (generation !== this.voiceGeneration || this.destroyed || context.state !== 'running') return;

    const buffer = await this.loadMcVoice(cue.assetUrl);
    if (generation !== this.voiceGeneration || this.destroyed || !buffer || context.state !== 'running') return;

    const serverNowMs = Date.now() + clockOffsetMs;
    const lateByMs = serverNowMs - cue.startsAtServerMs;
    if (cue.eventType === 'COUNTDOWN' && lateByMs > 400) return;
    const preserveLateCountdown = cue.eventType === 'COUNTDOWN' && lateByMs > 0;
    const elapsedMs = preserveLateCountdown ? 0 : Math.max(0, lateByMs);
    const remainingMs = cue.durationMs - elapsedMs;
    const offsetSeconds = elapsedMs / 1_000;
    if (remainingMs <= 0 || offsetSeconds >= buffer.duration) return;

    const startAt = context.currentTime + Math.max(0, cue.startsAtServerMs - serverNowMs) / 1_000;
    const playbackSeconds = Math.min(remainingMs, buffer.duration * 1_000 - elapsedMs) / 1_000;
    if (playbackSeconds <= 0) return;

    const source = context.createBufferSource();
    const previousSource = this.voiceSource;
    source.buffer = buffer;
    source.connect(voice);
    source.onended = () => {
      this.activeSources.delete(source);
      this.activeVoiceSources.delete(source);
      if (this.voiceSource === source) {
        this.voiceSource = null;
        if (this.activeVoiceSources.size === 0) this.setDucking(this.ducking);
      }
    };
    this.voiceSource = source;
    this.activeSources.add(source);
    this.activeVoiceSources.add(source);
    this.scheduleVoiceDucking(startAt, startAt + playbackSeconds, options.preserveScheduledCountdown === true);
    try {
      source.start(startAt, offsetSeconds, playbackSeconds);
    } catch {
      this.activeSources.delete(source);
      this.activeVoiceSources.delete(source);
      if (this.voiceSource === source) this.voiceSource = previousSource;
      this.setDucking(this.ducking);
      return;
    }
    if (previousSource && !options.preserveScheduledCountdown) {
      const previousStopAt = this.voiceStopAt.get(previousSource);
      if (previousStopAt === undefined || startAt < previousStopAt) {
        try {
          previousSource.stop(startAt);
          this.voiceStopAt.set(previousSource, startAt);
        } catch {
          // The previous clip may already have ended before this marker.
        }
      }
    }
    this.voiceStopAt.set(source, startAt + playbackSeconds);
  }

  /** Decode the full future schedule together, then queue every source against the synchronized server clock. */
  async playMcVoiceSchedule(
    cues: readonly McVoiceCue[],
    clockOffsetMs: number,
    onSkipped?: (drop: { reason: 'TIMER_LATE' | 'ASSET_UNAVAILABLE'; timerLatenessMs?: number }) => void,
  ) {
    const generation = ++this.countdownVoiceGeneration;
    const context = this.context;
    const voice = this.voice;
    if (!context || !voice || this.destroyed || this.mix.volume <= 0 || cues.length === 0) return;

    if (context.state !== 'running') await this.unlock();
    if (generation !== this.countdownVoiceGeneration || this.destroyed || context.state !== 'running') return;

    const decoded = await Promise.all(cues.map(async (cue) => ({ cue, buffer: await this.loadMcVoice(cue.assetUrl) })));
    if (generation !== this.countdownVoiceGeneration || this.destroyed || context.state !== 'running') return;

    const serverNowMs = Date.now() + clockOffsetMs;
    const ready: { cue: McVoiceCue; buffer: AudioBuffer; startServerMs: number; latenessMs: number }[] = [];
    for (const item of decoded) {
      if (!item.buffer) {
        onSkipped?.({ reason: 'ASSET_UNAVAILABLE' });
        continue;
      }
      const latenessMs = serverNowMs - item.cue.startsAtServerMs;
      if (latenessMs > MC_COUNTDOWN_LATE_GRACE_MS) {
        onSkipped?.({ reason: 'TIMER_LATE', timerLatenessMs: Math.round(latenessMs) });
        continue;
      }
      ready.push({
        cue: item.cue,
        buffer: item.buffer,
        startServerMs: latenessMs > 0 ? serverNowMs : item.cue.startsAtServerMs,
        latenessMs: Math.max(0, latenessMs),
      });
    }

    let previousSource = this.voiceSource;
    for (let index = 0; index < ready.length; index += 1) {
      const item = ready[index]!;
      const startAt = context.currentTime + Math.max(0, item.startServerMs - serverNowMs) / 1_000;
      const nextItem = ready[index + 1];
      const nextStartAt = nextItem
        ? context.currentTime + Math.max(0, nextItem.startServerMs - serverNowMs) / 1_000
        : Number.POSITIVE_INFINITY;
      const offsetSeconds = item.latenessMs / 1_000;
      const cueDurationSeconds = Math.min(item.cue.durationMs, item.buffer.duration * 1_000 - item.latenessMs) / 1_000;
      const playbackSeconds = Math.min(cueDurationSeconds, nextStartAt - startAt);
      if (playbackSeconds <= 0 || offsetSeconds >= item.buffer.duration) {
        onSkipped?.({ reason: 'TIMER_LATE', timerLatenessMs: Math.round(item.latenessMs) });
        continue;
      }

      const source = context.createBufferSource();
      source.buffer = item.buffer;
      source.connect(voice);
      source.onended = () => {
        this.activeSources.delete(source);
        this.activeVoiceSources.delete(source);
        if (this.voiceSource === source) {
          this.voiceSource = null;
          if (this.activeVoiceSources.size === 0) this.setDucking(this.ducking);
        }
      };
      this.activeSources.add(source);
      this.activeVoiceSources.add(source);
      this.scheduleVoiceDucking(startAt, startAt + playbackSeconds, true);
      try {
        source.start(startAt, offsetSeconds, playbackSeconds);
      } catch {
        this.activeSources.delete(source);
        this.activeVoiceSources.delete(source);
        continue;
      }

      if (previousSource) {
        const previousStopAt = this.voiceStopAt.get(previousSource);
        if (previousStopAt === undefined || startAt < previousStopAt) {
          try {
            previousSource.stop(startAt);
            this.voiceStopAt.set(previousSource, startAt);
          } catch {
            // The previous clip may already have ended before this marker.
          }
        }
      }
      this.voiceSource = source;
      this.voiceStopAt.set(source, startAt + playbackSeconds);
      previousSource = source;
    }
  }

  stopMcVoice() {
    this.voiceGeneration += 1;
    this.countdownVoiceGeneration += 1;
    const sources = [...this.activeVoiceSources];
    this.activeVoiceSources.clear();
    this.voiceSource = null;
    for (const source of sources) {
      this.activeSources.delete(source);
      source.onended = null;
      try { source.stop(); } catch { /* Scheduled/ended sources are already silent. */ }
    }
    this.setDucking(this.ducking);
  }

  private loadMcVoice(assetUrl: string): Promise<AudioBuffer | null> {
    if (!/^\/api\/mc-voice\/assets\/[a-f0-9]{64}$/.test(assetUrl)) return Promise.resolve(null);
    const cached = this.voiceBuffers.get(assetUrl);
    if (cached) return cached;

    const request = (async () => {
      if (!this.context) return null;
      try {
        const response = await fetch(assetUrl, { cache: 'force-cache' });
        if (!response.ok) return null;
        return await this.context.decodeAudioData(await response.arrayBuffer());
      } catch {
        // Giọng MC là asset tùy chọn; lỗi tải/giải mã không làm gián đoạn overlay.
        return null;
      }
    })();
    this.voiceBuffers.set(assetUrl, request);
    return request;
  }

  private scheduleVoiceDucking(startAt: number, endAt: number, preserveScheduledValues = false) {
    const context = this.context;
    const sfx = this.sfx;
    if (!context) return;
    const now = context.currentTime;
    for (const [bus, volume] of [[sfx, this.mix.sfx], [this.bgm, this.mix.bgm]] as const) {
      if (!bus || volume <= 0) continue;
      if (!preserveScheduledValues) {
        bus.gain.cancelScheduledValues(now);
        bus.gain.setValueAtTime(bus.gain.value, now);
      }
      bus.gain.setTargetAtTime(volume * MC_VOICE_DUCKING_GAIN, startAt, 0.035);
      bus.gain.setTargetAtTime(volume * this.ducking, endAt, 0.035);
    }
  }

  private loadFile(slot: AudioSlot, extensions: readonly BgmFileExtension[] = AUDIO_FILE_EXTENSIONS): Promise<AudioBuffer | null> {
    const themeSlot = `audio.${slot}` as ThemeAssetSlot;
    const themedUrl = this.assetUrls[themeSlot];
    const cacheKey = `${themedUrl ?? ''}:${slot}:${extensions.join(',')}`;
    const cached = this.buffers.get(cacheKey);
    if (cached) return cached;

    const request = (async () => {
      if (!this.context) return null;
      if (themedUrl) {
        try {
          const response = await fetch(themedUrl, { cache: 'force-cache' });
          if (response.ok) return await this.context.decodeAudioData(await response.arrayBuffer());
        } catch {
          // Theme audio is optional; continue with the bundled clip or synthesized cue.
        }
      }
      for (const extension of extensions) {
        try {
          const response = await fetch(`/assets/audio/${slot}.${extension}`, { cache: 'force-cache' });
          if (!response.ok) continue;
          return await this.context.decodeAudioData(await response.arrayBuffer());
        } catch {
          // A missing or unsupported optional file falls through to synthesis.
        }
      }
      return null;
    })();
    this.buffers.set(cacheKey, request);
    return request;
  }

  private track(source: AudioScheduledSourceNode) {
    source.onended = () => this.activeSources.delete(source);
    this.activeSources.add(source);
  }

  private tone(frequency: number, duration: number, peak: number, startAt: number, type: OscillatorType = 'sine', endFrequency?: number) {
    const context = this.context;
    if (!context || !this.sfx) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startAt + duration);
    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.exponentialRampToValueAtTime(peak, startAt + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(envelope);
    envelope.connect(this.sfx);
    this.track(oscillator);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  private crowdCheer(startAt: number) {
    const context = this.context;
    if (!context || !this.sfx) return;
    const duration = 1.1;
    const frames = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let seed = 31_337;
    for (let index = 0; index < frames; index += 1) {
      seed = (seed * 16_807) % 2_147_483_647;
      const noise = (seed / 1_073_741_823.5) - 1;
      const phase = index / (frames - 1);
      const swell = Math.pow(Math.sin(Math.PI * phase), 0.65);
      const syllables = 0.62 + 0.38 * Math.sin(2 * Math.PI * 3.1 * phase);
      channel[index] = noise * swell * syllables * 0.24;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1_250, startAt);
    filter.Q.setValueAtTime(0.7, startAt);
    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.linearRampToValueAtTime(0.34, startAt + 0.14);
    envelope.gain.linearRampToValueAtTime(0.16, startAt + 0.76);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.sfx);
    this.track(source);
    source.start(startAt);
    source.stop(startAt + duration + 0.02);
  }

  private createBgmLoop() {
    const context = this.context;
    if (!context) return null;
    const seconds = 6;
    const frames = Math.ceil(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < frames; index += 1) {
      const time = index / context.sampleRate;
      const swell = 0.62 + 0.18 * Math.sin((2 * Math.PI * time) / 3);
      channel[index] = swell * (
        0.012 * Math.sin(2 * Math.PI * 110 * time) +
        0.008 * Math.sin(2 * Math.PI * 165 * time) +
        0.004 * Math.sin(2 * Math.PI * 220 * time)
      );
    }
    return buffer;
  }

  private synthesize(cue: AudioCue, remainingSecond: number) {
    const context = this.context;
    if (!context) return;
    const now = context.currentTime + 0.012;
    switch (cue) {
      case 'question-enter':
        this.tone(720, 0.32, 0.11, now, 'triangle', 170);
        this.tone(130, 0.13, 0.14, now + 0.13, 'sine', 70);
        break;
      case 'countdown-tick':
        for (const pulse of countdownTickPattern(remainingSecond)) {
          this.tone(pulse.frequency, pulse.duration, 0.07, now + pulse.offsetMs / 1_000, 'square', pulse.frequency * 0.78);
        }
        break;
      case 'timeout':
        this.tone(392, 0.16, 0.1, now, 'triangle', 300);
        this.tone(262, 0.22, 0.09, now + 0.13, 'triangle', 196);
        break;
      case 'correct-answer':
        [523, 659, 784].forEach((note, index) => this.tone(note, 0.32, 0.07, now + index * 0.035));
        break;
      case 'top10':
        [392, 523, 659].forEach((note, index) => this.tone(note, 0.25, 0.07, now + index * 0.085));
        break;
      case 'victory':
        [523, 659, 784, 1_047].forEach((note, index) => this.tone(note, 0.38, 0.085, now + index * 0.13, 'triangle'));
        [587, 698, 880, 988].forEach((note, index) => this.tone(note, 0.3, 0.025, now + 0.42 + index * 0.045, 'square'));
        this.crowdCheer(now + 0.48);
        break;
      case 'transition':
        this.tone(440, 0.16, 0.055, now);
        this.tone(554, 0.2, 0.045, now + 0.08);
        break;
    }
  }

  destroy() {
    this.destroyed = true;
    this.bgmGeneration += 1;
    this.stopMcVoice();
    for (const source of this.activeSources) {
      source.onended = null;
      try { source.stop(); } catch { /* Already ended or stopped sources are silent. */ }
    }
    this.context?.close().catch(() => undefined);
    this.activeSources.clear();
    this.activeBgmSources.clear();
  }
}
