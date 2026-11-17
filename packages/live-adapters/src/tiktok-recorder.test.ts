import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { TikTokRawCommentRecorder } from './tiktok-recorder';
import { parseTikTokReplayLine, replayDelayMs, sourceTimestampForReplay } from '../../../tools/tiktok-replay-format';

const tempDirs: string[] = [];
afterEach(() => {
  for (const directory of tempDirs.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('ghi comment TikTok tùy chọn', () => {
  it('chỉ lưu allowlist gồm userId băm, nội dung và mốc thời gian, không lưu nickname', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'tiktok-comment-log-'));
    tempDirs.push(directory);
    const recorder = new TikTokRawCommentRecorder(directory, () => 1_800_000_000_000);
    recorder.record({ userIdHash: 'a'.repeat(64), text: 'A', createTime: 1_799_999_999_900, msgId: 'msg-1', receivedAtMs: 1_800_000_000_000 });
    await recorder.close();

    const [file] = readdirSync(directory);
    const row = JSON.parse(readFileSync(join(directory, file!), 'utf8').trim());
    expect(row).toEqual({
      userIdHash: 'a'.repeat(64), text: 'A', createTime: 1_799_999_999_900, msgId: 'msg-1', receivedAtMs: 1_800_000_000_000,
    });
    expect(Object.keys(row).sort()).toEqual(['createTime', 'msgId', 'receivedAtMs', 'text', 'userIdHash']);
  });

  it('fixture replay dùng đúng allowlist và giữ độ trễ nguồn khi đổi mốc phát lại', () => {
    const fixture = readFileSync(new URL('../../../fixtures/replay/tiktok-raw-comments.jsonl', import.meta.url), 'utf8')
      .trim().split(/\r?\n/).map((line, index) => parseTikTokReplayLine(line, index + 1));
    expect(fixture).toHaveLength(2);
    expect(sourceTimestampForReplay(fixture[0]!, 5_000)).toBe(4_700);
    expect(replayDelayMs(fixture[0]!.receivedAtMs, fixture[1]!.receivedAtMs, 5)).toBe(140);
    expect(() => parseTikTokReplayLine(JSON.stringify({ ...fixture[0], displayName: 'must-reject' }))).toThrow(/allowlist/);
  });
});
