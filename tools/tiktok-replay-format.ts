export type TikTokReplayRecord = {
  userIdHash: string;
  text: string;
  createTime: number | null;
  msgId: string | null;
  receivedAtMs: number;
};

const ALLOWED_FIELDS = ['createTime', 'msgId', 'receivedAtMs', 'text', 'userIdHash'];

/** Strict allowlist parser also rejects accidental names, avatar URLs and raw IDs. */
export function parseTikTokReplayLine(line: string, lineNumber = 1): TikTokReplayRecord {
  let value: unknown;
  try { value = JSON.parse(line); }
  catch { throw new Error(`Dòng ${lineNumber}: JSON không hợp lệ.`); }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Dòng ${lineNumber}: bản ghi phải là object.`);
  const row = value as Record<string, unknown>;
  if (Object.keys(row).sort().join('|') !== ALLOWED_FIELDS.join('|'))
    throw new Error(`Dòng ${lineNumber}: trường không đúng allowlist; từ chối phát lại.`);
  if (typeof row.userIdHash !== 'string' || !/^[a-f0-9]{64}$/.test(row.userIdHash))
    throw new Error(`Dòng ${lineNumber}: userIdHash không hợp lệ.`);
  if (typeof row.text !== 'string' || row.text.length > 2_000)
    throw new Error(`Dòng ${lineNumber}: nội dung không hợp lệ.`);
  if (row.createTime !== null && (typeof row.createTime !== 'number' || !Number.isFinite(row.createTime)))
    throw new Error(`Dòng ${lineNumber}: createTime không hợp lệ.`);
  if (row.msgId !== null && (typeof row.msgId !== 'string' || row.msgId.length > 200))
    throw new Error(`Dòng ${lineNumber}: msgId không hợp lệ.`);
  if (typeof row.receivedAtMs !== 'number' || !Number.isFinite(row.receivedAtMs))
    throw new Error(`Dòng ${lineNumber}: receivedAtMs không hợp lệ.`);
  return row as TikTokReplayRecord;
}

export function sourceTimestampForReplay(record: TikTokReplayRecord, replayReceivedAtMs: number): number | null {
  return record.createTime === null ? null : replayReceivedAtMs - (record.receivedAtMs - record.createTime);
}

export function replayDelayMs(previousReceivedAtMs: number, nextReceivedAtMs: number, speed: 1 | 5 | 20): number {
  return Math.max(0, nextReceivedAtMs - previousReceivedAtMs) / speed;
}
