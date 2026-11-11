import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FfmpegMcVoiceAudioNormalizer } from './ffmpeg-normalizer';
import type { McVoiceAudio } from './types';

const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});

async function tempDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'mc-voice-normalizer-test-'));
  directories.push(directory);
  return directory;
}

const source: McVoiceAudio = { bytes: Buffer.from('source-mp3'), durationMs: 9_000, format: 'mp3' };

describe('FfmpegMcVoiceAudioNormalizer', () => {
  it('chuẩn hoá mono, 44.1 kHz, loudness −16 LUFS và trim khoảng lặng >300 ms', async () => {
    const root = await tempDirectory();
    const commands: Array<{ file: string; args: string[] }> = [];
    const normalizer = new FfmpegMcVoiceAudioNormalizer({
      tempDirectory: root,
      ffmpegPath: 'fake-ffmpeg',
      ffprobePath: 'fake-ffprobe',
      run: async (file, args) => {
        commands.push({ file, args });
        if (file === 'fake-ffmpeg') await writeFile(args.at(-1)!, Buffer.from('normalized-mp3'));
        return file === 'fake-ffprobe' ? '8.25\n' : '';
      },
    });

    const normalized = await normalizer.normalize(source);
    expect(normalized).toMatchObject({ durationMs: 8_250, format: 'mp3', bytes: Buffer.from('normalized-mp3') });
    const ffmpeg = commands[0]!;
    expect(ffmpeg.args).toContain('-ac');
    expect(ffmpeg.args).toContain('1');
    expect(ffmpeg.args).toContain('44100');
    expect(ffmpeg.args.find((arg) => arg.includes('silenceremove'))).toContain('start_duration=0.3');
    expect(ffmpeg.args.find((arg) => arg.includes('silenceremove'))).toContain('stop_duration=0.3');
    expect(ffmpeg.args.find((arg) => arg.includes('loudnorm'))).toContain('I=-16');
  });

  it('từ chối output vượt 20 giây và không truyền lỗi công cụ thô', async () => {
    const root = await tempDirectory();
    const tooLong = new FfmpegMcVoiceAudioNormalizer({
      tempDirectory: root,
      run: async (file, args) => {
        if (file === 'ffmpeg') await writeFile(args.at(-1)!, Buffer.from('normalized'));
        return file === 'ffprobe' ? '20.001' : '';
      },
    });
    await expect(tooLong.normalize(source)).rejects.toMatchObject({ code: 'TOO_LONG' });

    const failed = new FfmpegMcVoiceAudioNormalizer({ tempDirectory: root, run: async () => { throw new Error('token raw path'); } });
    await expect(failed.normalize(source)).rejects.toMatchObject({ code: 'FAILED', message: 'Không thể chuẩn hoá audio MC Voice.' });
  });
});
