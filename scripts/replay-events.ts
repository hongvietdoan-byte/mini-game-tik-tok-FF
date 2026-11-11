import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

export type ReplayEvent = {
  atMs: number;
  userId: string;
  displayName: string;
  text: string;
  eventId?: string;
};

export type ScheduledReplayEvent = ReplayEvent & { delayMs: number; elapsedMs: number };

export type ReplayCliOptions = {
  inputFile: string;
  sessionId: string;
  baseUrl: string;
  speed: number;
  tokenFile: string;
};

export type ReplayStats = {
  attempted: number;
  delivered: number;
  dropped: number;
  httpErrors: number;
};

const DEFAULT_BASE_URL = 'http://127.0.0.1:8787';
const DEFAULT_TOKEN_FILE = 'data/admin-token.txt';
const USAGE =
  'Cách dùng: tsx scripts/replay-events.ts <file.jsonl> --session-id <id> [--base-url http://127.0.0.1:8787] [--speed N] [--token-file data/admin-token.txt]';

/** Parse one JSON object per line. Empty lines are ignored and errors name the line. */
export function parseReplayEvents(jsonl: string): ReplayEvent[] {
  const events: ReplayEvent[] = [];
  const lines = jsonl.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!.trim();
    if (!line) continue;

    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      throw new Error(`JSON không hợp lệ tại dòng ${index + 1}.`);
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`Dòng ${index + 1} phải là một JSON object.`);
    }

    const row = value as Record<string, unknown>;
    if (typeof row.atMs !== 'number' || !Number.isFinite(row.atMs) || row.atMs < 0) {
      throw new Error(`Dòng ${index + 1}: atMs phải là số hữu hạn không âm.`);
    }
    if (typeof row.userId !== 'string' || row.userId.trim().length === 0 || row.userId.length > 200) {
      throw new Error(`Dòng ${index + 1}: userId phải có 1–200 ký tự.`);
    }
    if (typeof row.displayName !== 'string' || row.displayName.length > 400) {
      throw new Error(`Dòng ${index + 1}: displayName phải là chuỗi tối đa 400 ký tự.`);
    }
    if (typeof row.text !== 'string' || row.text.length > 2000) {
      throw new Error(`Dòng ${index + 1}: text phải là chuỗi tối đa 2000 ký tự.`);
    }
    if (row.eventId !== undefined &&
      (typeof row.eventId !== 'string' || row.eventId.length === 0 || row.eventId.length > 200)) {
      throw new Error(`Dòng ${index + 1}: eventId phải có 1–200 ký tự nếu được cung cấp.`);
    }

    events.push({
      atMs: row.atMs,
      userId: row.userId,
      displayName: row.displayName,
      text: row.text,
      ...(row.eventId === undefined ? {} : { eventId: row.eventId as string }),
    });
  }
  return events;
}

/** Sort stably by event time and convert offsets to wall-clock delays. */
export function buildReplaySchedule(events: readonly ReplayEvent[], speed = 1): ScheduledReplayEvent[] {
  if (!Number.isFinite(speed) || speed <= 0) throw new RangeError('speed phải là số hữu hạn lớn hơn 0.');
  const ordered = events
    .map((event, inputIndex) => ({ event, inputIndex }))
    .sort((a, b) => a.event.atMs - b.event.atMs || a.inputIndex - b.inputIndex);
  let previousElapsedMs = 0;
  return ordered.map(({ event }, index) => {
    const elapsedMs = event.atMs / speed;
    const scheduled = { ...event, elapsedMs, delayMs: index === 0 ? elapsedMs : elapsedMs - previousElapsedMs };
    previousElapsedMs = elapsedMs;
    return scheduled;
  });
}

export function parseReplayArgs(args: readonly string[]): ReplayCliOptions {
  let inputFile: string | undefined;
  let sessionId: string | undefined;
  let baseUrl = DEFAULT_BASE_URL;
  let speed = 1;
  let tokenFile = DEFAULT_TOKEN_FILE;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === '--help' || arg === '-h') throw new Error(USAGE);
    if (arg.startsWith('--')) {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Thiếu giá trị cho ${arg}.\n${USAGE}`);
      index += 1;
      if (arg === '--session-id') sessionId = value;
      else if (arg === '--base-url') baseUrl = value;
      else if (arg === '--token-file') tokenFile = value;
      else if (arg === '--speed') {
        speed = Number(value);
        if (!Number.isFinite(speed) || speed <= 0) throw new Error('--speed phải là số hữu hạn lớn hơn 0.');
      } else {
        throw new Error(`Tham số không hỗ trợ: ${arg}.\n${USAGE}`);
      }
    } else if (!inputFile) {
      inputFile = arg;
    } else {
      throw new Error(`Chỉ nhận một file đầu vào.\n${USAGE}`);
    }
  }

  if (!inputFile || !sessionId?.trim()) throw new Error(`Thiếu file JSONL hoặc --session-id.\n${USAGE}`);
  return {
    inputFile: resolve(inputFile),
    sessionId: sessionId.trim(),
    baseUrl,
    speed,
    tokenFile: resolve(tokenFile),
  };
}

function assertLoopbackUrl(baseUrl: string): URL {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error('--base-url không phải URL hợp lệ.');
  }
  const allowedHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
  if (!['http:', 'https:'].includes(url.protocol) || !allowedHosts.has(url.hostname.toLowerCase()) ||
    url.username !== '' || url.password !== '') {
    throw new Error('--base-url chỉ được trỏ tới localhost/127.0.0.1 để không gửi token ra máy khác.');
  }
  return url;
}

function sleep(ms: number): Promise<void> {
  return ms <= 0 ? Promise.resolve() : new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

/** Replay to the local MOCK admin endpoint; payload content and token are never printed. */
export async function runReplay(options: ReplayCliOptions): Promise<ReplayStats> {
  const baseUrl = assertLoopbackUrl(options.baseUrl);
  const [fileText, rawToken] = await Promise.all([
    readFile(options.inputFile, 'utf8'),
    readFile(options.tokenFile, 'utf8'),
  ]);
  const token = rawToken.trim();
  if (!token) throw new Error('File token rỗng.');
  const schedule = buildReplaySchedule(parseReplayEvents(fileText), options.speed);
  const endpoint = new URL(`/api/sessions/${encodeURIComponent(options.sessionId)}/comments`, baseUrl);
  const startedAt = performance.now();
  const stats: ReplayStats = { attempted: 0, delivered: 0, dropped: 0, httpErrors: 0 };

  for (const scheduled of schedule) {
    await sleep(Math.max(0, startedAt + scheduled.elapsedMs - performance.now()));
    stats.attempted += 1;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: scheduled.userId,
          displayName: scheduled.displayName,
          text: scheduled.text,
          ...(scheduled.eventId === undefined ? {} : { eventId: scheduled.eventId }),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        stats.httpErrors += 1;
        continue;
      }
      const result: unknown = await response.json();
      if (typeof result === 'object' && result !== null && 'ok' in result && result.ok === true) {
        stats.delivered += 1;
      } else {
        stats.dropped += 1;
      }
    } catch {
      stats.httpErrors += 1;
    }
  }
  return stats;
}

async function main(): Promise<void> {
  const options = parseReplayArgs(process.argv.slice(2));
  const stats = await runReplay(options);
  console.log(
    `[replay] đã thử gửi ${stats.attempted}; MOCK nhận ${stats.delivered}; bị rơi ${stats.dropped}; lỗi HTTP/mạng ${stats.httpErrors}.`,
  );
  if (stats.httpErrors > 0) process.exitCode = 1;
}

const entrypoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === entrypoint) {
  void main().catch((error: unknown) => {
    console.error(`[replay] ${(error as Error).message}`);
    process.exitCode = 1;
  });
}
