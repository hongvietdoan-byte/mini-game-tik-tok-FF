import type { AudioCue, AudioMix, AudioSlot } from './audio-cues';

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
  private readonly activeOscillators = new Set<OscillatorNode>();
  private bgmSource: AudioBufferSourceNode | null = null;
  private ducking = 1;
  private destroyed = false;

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

  async play(cue: AudioCue) {
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
      source.start();
      return;
    }
    this.synthesize(cue);
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
    oscillator.onended = () => this.activeOscillators.delete(oscillator);
    this.activeOscillators.add(oscillator);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  private synthesize(cue: AudioCue) {
    if (!this.context) return;
    const now = this.context.currentTime + 0.012;
    switch (cue) {
      case 'question-enter':
        this.tone(720, 0.32, 0.11, now, 'triangle', 170);
        this.tone(130, 0.13, 0.14, now + 0.13, 'sine', 70);
        break;
      case 'countdown-tick':
        this.tone(880, 0.07, 0.08, now, 'square', 640);
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
      if (!context || !this.bgm || this.destroyed || this.mix.bgm <= 0) return;
      if (file) {
        const source = context.createBufferSource();
        source.buffer = file;
        source.loop = true;
        source.connect(this.bgm);
        source.start();
        this.bgmSource = source;
        return;
      }
      // Soft, steady two-note pad; the volume is intentionally far below SFX.
      for (const [frequency, level] of [[110, 0.018], [164.81, 0.012], [220, 0.008]] as const) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.value = level;
        oscillator.connect(gain);
        gain.connect(this.bgm);
        oscillator.start();
        this.activeOscillators.add(oscillator);
      }
    });
  }

  destroy() {
    this.destroyed = true;
    this.context?.close().catch(() => undefined);
    this.bgmSource = null;
    this.activeOscillators.clear();
  }
}
