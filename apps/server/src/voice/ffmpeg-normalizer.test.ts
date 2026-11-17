import { execFile, spawnSync } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FfmpegMcVoiceAudioNormalizer } from './ffmpeg-normalizer';
import type { McVoiceAudio } from './types';
import { testTempRootAsync } from '../../../../tests/support/tempRoot';

const directories: string[] = [];
const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg';
const ffprobePath = process.env.FFPROBE_PATH ?? 'ffprobe';
const hasRealFfmpeg = [ffmpegPath, ffprobePath].every((file) => {
  const result = spawnSync(file, ['-version'], { windowsHide: true, stdio: 'ignore' });
  return !result.error && result.status === 0;
});

afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

async function tempDirectory() {
  const directory = await testTempRootAsync('mc-voice-normalizer-test-');
  directories.push(directory);
  return directory;
}

function runTool(file: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(file, args, { windowsHide: true, maxBuffer: 2 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return reject(new Error(`${file} thất bại: ${String(stderr) || error.message}`));
      resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

const source: McVoiceAudio = { bytes: Buffer.from('source-mp3'), durationMs: 9_000, format: 'mp3' };

describe('FfmpegMcVoiceAudioNormalizer', () => {
  it('chuẩn hoá mono, 44.1 kHz, loudness −16 LUFS và chỉ trim khoảng lặng ở hai đầu', async () => {
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
    const filter = ffmpeg.args[ffmpeg.args.indexOf('-af') + 1]!;
    expect(filter).toBe('silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.08,areverse,loudnorm=I=-16:TP=-1.5:LRA=11');
    expect(ffmpeg.args.find((arg) => arg.includes('loudnorm'))).toContain('I=-16');
  });

  it.skipIf(!hasRealFfmpeg)('giữ nguyên tiếng trước khoảng lặng giữa câu và đuôi fade khi chạy ffmpeg thật', async () => {
    const root = await tempDirectory();
    const inputPath = join(root, 'synthetic.mp3');
    const generated = await runTool(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100:duration=1',
      '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono:d=0.5',
      '-f', 'lavfi', '-i', 'sine=frequency=660:sample_rate=44100:duration=1',
      '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono:d=0.6',
      '-filter_complex', '[2:a]afade=t=out:st=0.4:d=0.6[tone_fade];[0:a][1:a][tone_fade][3:a]concat=n=4:v=0:a=1[out]',
      '-map', '[out]', '-codec:a', 'libmp3lame', '-b:a', '128k', inputPath,
    ]);
    expect(generated.stderr).toBe('');

    const normalized = await new FfmpegMcVoiceAudioNormalizer({ ffmpegPath, ffprobePath, tempDirectory: root }).normalize({
      bytes: await readFile(inputPath), durationMs: 3_100, format: 'mp3',
    });
    expect(normalized.durationMs).toBeGreaterThanOrEqual(2_400);
    expect(normalized.durationMs).toBeLessThanOrEqual(2_650);
    const outputPath = join(root, 'normalized.mp3');
    await writeFile(outputPath, normalized.bytes);
    const analysis = await runTool(ffmpegPath, [
      '-hide_banner', '-loglevel', 'info', '-i', outputPath,
      '-af', 'silencedetect=noise=-35dB:d=0.05', '-f', 'null', '-',
    ]);
    const starts = [...analysis.stderr.matchAll(/silence_start:\s*(-?\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]));
    const ends = [...analysis.stderr.matchAll(/silence_end:\s*(-?\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]));

    expect(starts.length, analysis.stderr).toBeGreaterThanOrEqual(1);
    expect(starts[0], analysis.stderr).toBeGreaterThanOrEqual(0.9);
    expect(starts[0], analysis.stderr).toBeLessThanOrEqual(1.1);
    expect(ends[0], analysis.stderr).toBeGreaterThanOrEqual(1.4);
    expect(ends[0], analysis.stderr).toBeLessThanOrEqual(1.6);
    expect(normalized.durationMs, analysis.stderr).toBeLessThanOrEqual(2_550);
  });

  it.skipIf(!hasRealFfmpeg)('cắt khoảng lặng đầu/cuối của câu một từ có đệm dài xuống dưới 600 ms', async () => {
    const root = await tempDirectory();
    const inputPath = join(root, 'single-word-with-padding.mp3');
    const generated = await runTool(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono:d=0.2',
      '-f', 'lavfi', '-i', 'sine=frequency=660:sample_rate=44100:duration=0.32',
      // Mô phỏng đuôi codec có noise floor −45 dB: ngưỡng cũ −50 dB coi đó là tiếng và giữ nguyên.
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100:duration=1,volume=0.005623',
      '-filter_complex', '[1:a]afade=t=in:st=0:d=0.02,afade=t=out:st=0.22:d=0.1[word];[0:a][word][2:a]concat=n=3:v=0:a=1[out]',
      '-map', '[out]', '-codec:a', 'libmp3lame', '-b:a', '128k', inputPath,
    ]);
    expect(generated.stderr).toBe('');

    const normalized = await new FfmpegMcVoiceAudioNormalizer({ ffmpegPath, ffprobePath, tempDirectory: root }).normalize({
      bytes: await readFile(inputPath), durationMs: 1_600, format: 'mp3',
    });
    expect(normalized.durationMs).toBeGreaterThanOrEqual(350);
    expect(normalized.durationMs).toBeLessThanOrEqual(600);
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
