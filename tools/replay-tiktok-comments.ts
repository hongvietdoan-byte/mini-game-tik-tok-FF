import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { isIP } from 'node:net';
import { resolve } from 'node:path';
import { parseTikTokReplayLine, replayDelayMs, sourceTimestampForReplay } from './tiktok-replay-format';

function args(argv: string[]) {
  const out = new Map<string, string>();
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith('--') || !value) throw new Error('Cú pháp: --file <jsonl> --session <id> [--url http://127.0.0.1:8787] [--speed 1|5|20]');
    out.set(key, value);
  }
  return out;
}

const sleep = (ms: number) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function localBaseUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (url.protocol !== 'http:' || !(host === 'localhost' || host === '::1' || isIP(host) === 4 && host.startsWith('127.')))
    throw new Error('Chỉ cho phép server HTTP loopback để không gửi token quản trị ra mạng.');
  return url.toString().replace(/\/$/, '');
}

async function main() {
  const options = args(process.argv);
  const file = options.get('--file');
  const sessionId = options.get('--session');
  const speedText = options.get('--speed') ?? '1';
  const speed = Number(speedText);
  if (!file || !sessionId || ![1, 5, 20].includes(speed))
    throw new Error('Cú pháp: --file <jsonl> --session <id> [--url http://127.0.0.1:8787] [--speed 1|5|20]');
  const token = process.env.QUIZ_ADMIN_TOKEN;
  if (!token) throw new Error('Đặt QUIZ_ADMIN_TOKEN trong môi trường trước khi chạy.');
  const baseUrl = localBaseUrl(options.get('--url') ?? 'http://127.0.0.1:8787');
  const endpoint = `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

  const stateResponse = await fetch(`${endpoint}/state`, { headers });
  if (!stateResponse.ok) throw new Error(`Không đọc được phiên (HTTP ${stateResponse.status}).`);
  const initial = await stateResponse.json() as { config?: { mode?: string }; sessionStatus?: string; metrics?: { received: number; accepted: number; rejected?: Record<string, number> } };
  if (initial.config?.mode !== 'MOCK' || initial.sessionStatus !== 'OPEN')
    throw new Error('Replay chỉ nhận vào phiên MOCK đang mở; sẽ không gửi dữ liệu vào TikTok LIVE thật.');
  const before = initial.metrics ?? { received: 0, accepted: 0, rejected: {} };

  let firstRecordedAt: number | null = null;
  let lastRecordedAt: number | null = null;
  let startedAt: number | null = null;
  let sent = 0;
  let lineNumber = 0;
  const input = createInterface({ input: createReadStream(resolve(file)), crlfDelay: Infinity });
  for await (const line of input) {
    lineNumber += 1;
    if (!line.trim()) continue;
    const record = parseTikTokReplayLine(line, lineNumber);
    if (firstRecordedAt === null) {
      firstRecordedAt = record.receivedAtMs;
      startedAt = Date.now();
    } else {
      const waitFor = replayDelayMs(lastRecordedAt!, record.receivedAtMs, speed as 1 | 5 | 20)
        - (Date.now() - startedAt! - ((lastRecordedAt! - firstRecordedAt) / speed));
      if (waitFor > 0) await sleep(waitFor);
    }
    lastRecordedAt = record.receivedAtMs;
    const replayNow = Date.now();
    const sourceTimestampMs = sourceTimestampForReplay(record, replayNow);
    const payload = {
      userId: record.userIdHash,
      displayName: '',
      text: record.text,
      ...(record.msgId ? { eventId: record.msgId } : {}),
      ...(sourceTimestampMs !== null
        ? { sourceTimestampMs }
        : {}),
    };
    const response = await fetch(`${endpoint}/comments`, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`Replay dừng ở dòng ${lineNumber} (HTTP ${response.status}).`);
    sent += 1;
  }
  const finalResponse = await fetch(`${endpoint}/state`, { headers });
  if (!finalResponse.ok) throw new Error(`Replay đã gửi ${sent} comment nhưng không đọc được tổng kết (HTTP ${finalResponse.status}).`);
  const final = await finalResponse.json() as { metrics?: { received: number; accepted: number; rejected?: Record<string, number> } };
  const after = final.metrics ?? { received: 0, accepted: 0, rejected: {} };
  const rejectionReasons = new Set([...Object.keys(before.rejected ?? {}), ...Object.keys(after.rejected ?? {})]);
  console.log(JSON.stringify({
    sent,
    speed,
    receivedDelta: after.received - before.received,
    acceptedDelta: after.accepted - before.accepted,
    rejectedDelta: Object.fromEntries([...rejectionReasons].map((key) => [key, (after.rejected?.[key] ?? 0) - (before.rejected?.[key] ?? 0)])),
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Replay thất bại.');
  process.exitCode = 1;
});
