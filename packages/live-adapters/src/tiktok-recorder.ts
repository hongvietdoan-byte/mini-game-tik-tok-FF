import { randomUUID } from 'node:crypto';
import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs';
import { join } from 'node:path';
import type { TikTokRawCommentRecord } from './tiktok';

/** Ghi JSONL opt-in với allowlist hẹp; không có nickname, URL hay ảnh. */
export class TikTokRawCommentRecorder {
  private stream: WriteStream | null = null;
  private failed = false;

  constructor(private readonly dataDir: string, private readonly now: () => number = Date.now) {}

  record(record: TikTokRawCommentRecord) {
    if (this.failed) return;
    try {
      if (!this.stream) {
        mkdirSync(this.dataDir, { recursive: true });
        const at = new Date(this.now()).toISOString().replace(/[:.]/g, '-');
        const path = join(this.dataDir, `tiktok-comments-${at}-${randomUUID()}.jsonl`);
        this.stream = createWriteStream(path, { flags: 'wx', mode: 0o600 });
        this.stream.on('error', () => { this.failed = true; });
      }
      // Rebuild from the explicit allowlist so future adapter fields never enter the log.
      this.stream.write(`${JSON.stringify({
        userIdHash: record.userIdHash,
        text: record.text,
        createTime: record.createTime,
        msgId: record.msgId,
        receivedAtMs: record.receivedAtMs,
      })}\n`);
    } catch {
      this.failed = true;
    }
  }

  async close() {
    const stream = this.stream;
    if (!stream) return;
    this.stream = null;
    await new Promise<void>((resolve) => {
      stream.once('error', () => resolve());
      stream.end(() => resolve());
    });
  }
}
