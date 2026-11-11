import { execFile } from 'node:child_process';
import { mkdtemp, lstat, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { MAX_MC_READING_MS } from '@quiz/contracts';
import { McVoiceProviderError, type McVoiceAudio } from './types';
import type { McVoiceAudioNormalizer } from './service';

export type AudioCommandRunner = (file: string, args: string[], signal?: AbortSignal) => Promise<string>;

const runCommand: AudioCommandRunner = (file, args, signal) => new Promise((resolveOutput, reject) => {
  execFile(file, args, { windowsHide: true, timeout: 45_000, maxBuffer: 1024 * 1024, signal }, (error, stdout) => {
    if (error) return reject(error);
    resolveOutput(String(stdout));
  });
});

export class FfmpegMcVoiceAudioNormalizer implements McVoiceAudioNormalizer {
  constructor(private readonly options: {
    ffmpegPath?: string;
    ffprobePath?: string;
    tempDirectory?: string;
    run?: AudioCommandRunner;
  } = {}) {}

  async normalize(audio: McVoiceAudio, signal?: AbortSignal): Promise<McVoiceAudio> {
    if (audio.format !== 'mp3' || audio.bytes.byteLength === 0 || audio.bytes.byteLength > 12 * 1024 * 1024)
      throw new McVoiceProviderError('INVALID_RESPONSE', 'Audio đầu vào không hợp lệ để chuẩn hoá.');
    const tempParent = resolve(this.options.tempDirectory ?? tmpdir());
    const tempRoot = await mkdtemp(join(tempParent, 'quiz-mc-voice-'));
    try {
      const rootInfo = await lstat(tempRoot);
      if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory())
        throw new McVoiceProviderError('FAILED', 'Thư mục tạm audio không hợp lệ.');
      const inputPath = join(tempRoot, 'source.mp3');
      const outputPath = join(tempRoot, 'normalized.mp3');
      await writeFile(inputPath, audio.bytes, { flag: 'wx', mode: 0o600 });
      await (this.options.run ?? runCommand)(this.options.ffmpegPath ?? process.env.FFMPEG_PATH ?? 'ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y', '-i', inputPath,
        '-ac', '1', '-ar', '44100',
        '-af', 'silenceremove=start_periods=1:start_duration=0.3:start_threshold=-50dB:stop_periods=-1:stop_duration=0.3:stop_threshold=-50dB,loudnorm=I=-16:TP=-1.5:LRA=11',
        '-codec:a', 'libmp3lame', '-b:a', '128k', outputPath,
      ], signal);
      const outputInfo = await stat(outputPath);
      if (!outputInfo.isFile() || outputInfo.size === 0 || outputInfo.size > 12 * 1024 * 1024)
        throw new McVoiceProviderError('INVALID_RESPONSE', 'Audio sau chuẩn hoá không hợp lệ.');
      const durationText = await (this.options.run ?? runCommand)(this.options.ffprobePath ?? process.env.FFPROBE_PATH ?? 'ffprobe', [
        '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', outputPath,
      ], signal);
      const durationMs = Math.round(Number(durationText.trim()) * 1_000);
      if (!Number.isSafeInteger(durationMs) || durationMs <= 0)
        throw new McVoiceProviderError('INVALID_RESPONSE', 'Không xác định được thời lượng audio đã chuẩn hoá.');
      if (durationMs > MAX_MC_READING_MS)
        throw new McVoiceProviderError('TOO_LONG', 'Audio MC Voice vượt trần 20 giây.');
      return { bytes: await readFile(outputPath), durationMs, format: 'mp3' };
    } catch (error) {
      if (error instanceof McVoiceProviderError) throw error;
      throw new McVoiceProviderError('FAILED', 'Không thể chuẩn hoá audio MC Voice.');
    } finally {
      // Chỉ dọn thư mục duy nhất do mkdtemp vừa tạo trong thư mục tạm đã resolve.
      const realParent = await realpath(tempParent).catch(() => tempParent);
      const realRoot = await realpath(tempRoot).catch(() => tempRoot);
      const rel = relative(realParent, realRoot);
      if (rel && !rel.startsWith('..') && !isAbsolute(rel) && dirname(realRoot) === realParent)
        await rm(realRoot, { recursive: true, force: true }).catch(() => {});
    }
  }
}
