import { randomUUID } from 'node:crypto';
import type { McVoicePreGenerateProgress } from '@quiz/contracts';
import type { McVoiceReadingLine } from './service';
import { McVoiceService } from './service';

export type McVoiceQuestionBatchItem = { lines: readonly McVoiceReadingLine[] };

type Job = {
  progress: McVoicePreGenerateProgress;
};

export class McVoicePreGenerateManager {
  private readonly jobs = new Map<string, Job>();

  constructor(
    private readonly service: McVoiceService,
    private readonly now: () => number = () => Date.now(),
    private readonly concurrency = 2,
  ) {}

  start(items: readonly McVoiceQuestionBatchItem[]): McVoicePreGenerateProgress {
    const jobId = randomUUID();
    const job: Job = {
      progress: { jobId, status: 'QUEUED', total: items.length, completed: 0, failed: 0, tooLong: 0, updatedAtMs: this.now() },
    };
    this.jobs.set(jobId, job);
    void this.run(job, [...items]);
    return { ...job.progress };
  }

  get(jobId: string): McVoicePreGenerateProgress | null {
    const job = this.jobs.get(jobId);
    return job ? { ...job.progress } : null;
  }

  private async run(job: Job, items: McVoiceQuestionBatchItem[]) {
    job.progress = { ...job.progress, status: 'RUNNING', updatedAtMs: this.now() };
    let next = 0;
    const worker = async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        const item = items[index]!;
        try {
          const result = await this.service.prepareQuestionReading(item.lines);
          job.progress = {
            ...job.progress,
            completed: job.progress.completed + Number(result.ok),
            tooLong: job.progress.tooLong + Number(!result.ok),
            updatedAtMs: this.now(),
          };
        } catch {
          job.progress = { ...job.progress, failed: job.progress.failed + 1, updatedAtMs: this.now() };
        }
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, Math.min(3, this.concurrency, items.length || 1)) }, () => worker()));
    const errors = job.progress.failed + job.progress.tooLong;
    job.progress = {
      ...job.progress,
      status: job.progress.completed === 0 && errors > 0 ? 'FAILED' : errors > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
      updatedAtMs: this.now(),
    };
  }
}
