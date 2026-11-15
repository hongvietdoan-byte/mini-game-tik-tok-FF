import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import type { FastifyInstance } from 'fastify';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const AUDIO_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
};
const ARENA_VIDEO_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};
const MAX_AUDIO_ASSET_BYTES = 5 * 1024 * 1024;
const MAX_ARENA_VIDEO_ASSET_BYTES = 30 * 1024 * 1024;

/**
 * Phục vụ bản build của một SPA dưới tiền tố (vd `/overlay/`) — không cần @fastify/static.
 * Chặn path traversal; đường dẫn không có đuôi file → index.html (SPA fallback).
 */
export function serveSpa(app: FastifyInstance, prefix: '/dashboard' | '/overlay', root: string) {
  const base = resolve(root);
  const index = join(base, 'index.html');
  if (!existsSync(index)) return false;

  const send = (file: string) => {
    const body = readFileSync(file);
    const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
    // index.html luôn lấy bản mới; asset có hash tên file → cache lâu
    const cache = file === index ? 'no-cache' : 'public, max-age=31536000, immutable';
    return { body, type, cache };
  };

  app.get(prefix, async (_req, reply) => reply.redirect(`${prefix}/`));
  app.get(`${prefix}/*`, async (req, reply) => {
    const rel = decodeURIComponent((req.params as { '*': string })['*'] ?? '');
    const target = normalize(join(base, rel));
    if (target !== base && !target.startsWith(base + sep)) return reply.code(403).send('Forbidden');
    let file = target;
    if (!rel || !existsSync(file) || statSync(file).isDirectory()) {
      if (extname(rel)) return reply.code(404).send('Not found');
      file = index;
    }
    const { body, type, cache } = send(file);
    return reply.header('content-type', type).header('cache-control', cache).header('x-content-type-options', 'nosniff').send(body);
  });
  return true;
}

/** Phục vụ thư mục asset cục bộ (vd /assets/mc/kelly.png) — KHÔNG fallback, chỉ file có thật, chặn path traversal. */
export function serveAssets(app: FastifyInstance, prefix: '/assets', root: string) {
  const base = resolve(root);
  if (!existsSync(base)) return false;
  app.get(`${prefix}/*`, async (req, reply) => {
    const rel = decodeURIComponent((req.params as { '*': string })['*'] ?? '');
    const target = normalize(join(base, rel));
    if (!target.startsWith(base + sep)) return reply.code(403).send('Forbidden');
    if (!existsSync(target)) return reply.code(404).send('Not found');
    const stats = statSync(target);
    if (stats.isDirectory()) return reply.code(404).send('Not found');
    const extension = extname(target).toLowerCase();
    const audioDirectory = `${resolve(base, 'audio')}${sep}`;
    const arenaDirectory = `${resolve(base, 'arena')}${sep}`;
    const audioType = AUDIO_TYPES[extension];
    const isSupportedAudio = target.startsWith(audioDirectory) && audioType !== undefined;
    const videoType = ARENA_VIDEO_TYPES[extension];
    const isSupportedArenaVideo = target.startsWith(arenaDirectory) && videoType !== undefined;
    const type = isSupportedAudio ? audioType : isSupportedArenaVideo ? videoType : TYPES[extension];
    if (!type || (!/^(image|font)\//.test(type) && !isSupportedAudio && !isSupportedArenaVideo)) return reply.code(415).send('Unsupported');
    if (isSupportedAudio && stats.size > MAX_AUDIO_ASSET_BYTES) return reply.code(413).send('Audio asset too large');
    if (isSupportedArenaVideo && stats.size > MAX_ARENA_VIDEO_ASSET_BYTES) return reply.code(413).send('Arena video asset too large');
    return reply.header('content-type', type).header('cache-control', 'public, max-age=300').header('x-content-type-options', 'nosniff').send(readFileSync(target));
  });
  return true;
}
