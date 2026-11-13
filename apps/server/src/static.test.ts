import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { serveAssets } from './static';
import { testTempRoot } from '../../../tests/support/tempRoot';

const MAX_AUDIO_ASSET_BYTES = 5 * 1024 * 1024;

describe('serveAssets audio slots', () => {
  let tempRoot: string;
  let assetsRoot: string;
  let app: FastifyInstance;

  beforeEach(() => {
    tempRoot = testTempRoot('quiz-static-assets-');
    assetsRoot = join(tempRoot, 'assets');
    mkdirSync(join(assetsRoot, 'audio'), { recursive: true });
    app = Fastify({ logger: false });
    serveAssets(app, '/assets', assetsRoot);
  });

  afterEach(async () => {
    await app.close();
    rmSync(tempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it.each([
    { extension: 'mp3', contentType: 'audio/mpeg' },
    { extension: 'ogg', contentType: 'audio/ogg' },
  ])('serves .$extension from /assets/audio with $contentType', async ({ extension, contentType }) => {
    const bytes = Buffer.from('short test audio');
    writeFileSync(join(assetsRoot, 'audio', `question-enter.${extension}`), bytes);

    const response = await app.inject({ url: `/assets/audio/question-enter.${extension}` });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe(contentType);
    expect(response.rawPayload).toEqual(bytes);
  });

  it('rejects unsupported audio and mp3 outside the audio directory', async () => {
    writeFileSync(join(assetsRoot, 'audio', 'unsupported.wav'), 'not accepted');
    writeFileSync(join(assetsRoot, 'question-enter.mp3'), 'not served outside audio');

    const unsupportedExtension = await app.inject({ url: '/assets/audio/unsupported.wav' });
    const outsideAudioDirectory = await app.inject({ url: '/assets/question-enter.mp3' });

    expect(unsupportedExtension.statusCode).toBe(415);
    expect(outsideAudioDirectory.statusCode).toBe(415);
  });

  it('keeps paths outside the asset root inaccessible', async () => {
    writeFileSync(join(tempRoot, 'outside.png'), 'outside asset');

    const response = await app.inject({ url: '/assets/%2e%2e%2foutside.png' });

    expect(response.statusCode).not.toBe(200);
  });

  it('serves audio up to 5 MB and rejects larger files before reading them', async () => {
    writeFileSync(join(assetsRoot, 'audio', 'maximum.ogg'), Buffer.alloc(MAX_AUDIO_ASSET_BYTES));
    writeFileSync(join(assetsRoot, 'audio', 'oversized.ogg'), Buffer.alloc(MAX_AUDIO_ASSET_BYTES + 1));

    const maximum = await app.inject({ url: '/assets/audio/maximum.ogg' });
    const oversized = await app.inject({ url: '/assets/audio/oversized.ogg' });

    expect(maximum.statusCode).toBe(200);
    expect(maximum.rawPayload).toHaveLength(MAX_AUDIO_ASSET_BYTES);
    expect(oversized.statusCode).toBe(413);
  });
});
