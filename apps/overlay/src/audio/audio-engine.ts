import { countdownTickPattern, type AudioCue, type AudioMix, type AudioSlot } from './audio-cues';

export type AudioEngineState = 'disabled' | 'running' | 'suspended' | 'unavailable';

type StateListener = (state: AudioEngineState) => void;
const AUDIO_FILE_EXTENSIONS = ['mp3', 'ogg'] as const;

/** WebAudio playback with generated cues as the always-available fallback. */
export class OverlayAudioEngine {
  private readonly context: AudioContext | null;
  private readonly master: GainNode | null;
  private readonly sfx: GainNode | null;
  private readonly bgm: GainNode | null;
  private readonly buffers = new Map<AudioSlot, Promise<AudioBuffer | null>>();
  private readonly activeSources = new Set<AudioScheduledSourceNode>();
  private destroyed = false;
  private ducking = 1;

  constructor(private readonly mix: AudioMix, private readonly onState: StateListener) {
    if (mix.volume <= 0 || (mix.sfx <= 0 && mix.bgm <= 0)) {
      this.context = null;
      this.master = null;
      this.sfx = null;
      this.bgm = null;
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
      onState('unavailable');
      return;
    }

    this.master = this.context.createGain();
    this.sfx = this.context.createGain();
    this.bgm = this.context.createGain();
    this.master.gain.value = mix.volume;
    this.sfx.gain.value = mix.sfx;
    this.bgm.gain.value = mix.bgm;
    this.sfx.connect(this.master);
    this.bgm.connect(this.master);
    this.master.connect(this.context.destination);
    this.context.onstatechange = () => this.publishState();
    this.publishState();

    if (mix.bgm > 0) this.startBgm();
    if (this.context.state === 'suspended') void this.unlock();
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
  }

  setDucking(gain: number) {
    this.ducking = Math.max(0, Math.min(1, gain));
    if (this.context && this.sfx)
      this.sfx.gain.setTargetAtTime(this.mix.sfx * this.ducking, this.context.currentTime, 0.035);
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

  private loadFile(slot: AudioSlot): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(slot);
    if (cached) return cached;

    const request = (async () => {
      if (!this.context) return null;
      for (const extension of AUDIO_FILE_EXTENSIONS) {
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
    this.buffers.set(slot, request);
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

  private startBgm() {
    void this.loadFile('bgm').then((file) => {
      const context = this.context;
      const bus = this.bgm;
      if (!context || !bus || this.destroyed || this.mix.bgm <= 0) return;
      const source = context.createBufferSource();
      source.buffer = file ?? this.createBgmLoop();
      if (!source.buffer) return;
      source.loop = true;
      source.connect(bus);
      this.track(source);
      source.start();
    });
  }

  destroy() {
    this.destroyed = true;
    this.context?.close().catch(() => undefined);
    this.activeSources.clear();
  }
}
