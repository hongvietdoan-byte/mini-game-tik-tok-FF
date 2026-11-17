import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreateSessionRequestSchema } from '@quiz/contracts';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { SessionRuntime } from '../runtime';
import { McVoiceCache } from './cache';
import { McVoiceService } from './service';
import type { McVoiceAudio, McVoiceCredentialStore, McVoiceProvider } from './types';
import { testTempRootAsync } from '../../../../tests/support/tempRoot';

const opened: Array<{ root: string; runtime: SessionRuntime; store: Store }> = [];
const COUNTDOWN = [10, 5, 4, 3, 2, 1];
const COUNTDOWN_TEXTS = ['Còn 10 giây!', 'Năm', 'Bốn', 'Ba', 'Hai', 'Một'];
const REMINDER = 'Nhắc nhẹ nè: mỗi người chỉ một đáp án, bình luận đầu tiên mới được tính nhé!';

afterEach(async () => {
  for (const item of opened.splice(0)) {
    item.runtime.dispose();
    item.store.close();
    await rm(item.root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

async function makeRuntime(duration: (text: string) => number = () => 300) {
  const root = await testTempRootAsync('mc-countdown-reminder-');
  const store = new Store(join(root, 'quiz.db'));
  const scheduler = new ManualScheduler();
  const generated: string[] = [];
  const warnings: string[] = [];
  const provider: McVoiceProvider = {
    synthesize: vi.fn(async ({ text }) => {
      generated.push(text);
      return { bytes: Buffer.from(`mock:${text}`), durationMs: duration(text), format: 'mp3' } satisfies McVoiceAudio;
    }),
  };
  const credentials: McVoiceCredentialStore = { get: async () => 'mock-token', set: async () => {}, clear: async () => {} };
  const service = new McVoiceService(provider, new McVoiceCache(join(root, 'cache')), credentials, {
    normalize: async (audio) => audio,
  });
  const runtime = await SessionRuntime.create({
    store, scheduler, adapter: new MockAdapter(), warn: (message) => warnings.push(message),
    mcVoice: { service, profile: { model: 'mock-model', voiceKey: 'mock-voice', rate: 1, voiceSettings: { style: 'neutral' } } },
  }, CreateSessionRequestSchema.parse({
    name: 'MC cue test', config: { mode: 'MOCK', mcVoiceEnabled: true, allowDemoQuestions: true },
  }));
  opened.push({ root, runtime, store });
  const cues: Array<{ eventType: string; startsAtServerMs: number; durationMs: number; bubbleText?: string }> = [];
  const schedules: Array<NonNullable<ReturnType<SessionRuntime['publicSnapshot']>['mcVoiceCountdownSchedule']>> = [];
  runtime.subscribe((batch) => {
    for (const item of batch) {
      if (item.audience === 'public' && item.message.type === 'STATE_SNAPSHOT' && item.message.payload.mcVoiceCue)
        cues.push(item.message.payload.mcVoiceCue);
      if (item.audience === 'public' && item.message.type === 'STATE_SNAPSHOT' && item.message.payload.mcVoiceCountdownSchedule)
        schedules.push(item.message.payload.mcVoiceCountdownSchedule);
    }
  });
  await vi.waitFor(() => expect(generated).toEqual(expect.arrayContaining([...COUNTDOWN_TEXTS, 'Hết giờ!', REMINDER])));
  const internal = runtime as unknown as { voiceAssetPromises: Map<string, Promise<unknown>> };
  await Promise.all(internal.voiceAssetPromises.values());
  return { runtime, scheduler, generated, cues, schedules, warnings };
}

describe('cue đếm ngược và nhắc luật MC', () => {
  it('gửi một lịch đầy đủ sau khi asset sẵn sàng và giữ lịch ngoài timer server từng giây', async () => {
    const { runtime, scheduler, schedules } = await makeRuntime((text) => ({
      'Còn 10 giây!': 1_040, Năm: 500, Bốn: 436, Ba: 1_281, Hai: 450, Một: 329,
    })[text] ?? 300);
    const start = scheduler.now();
    runtime.engine.state = 'ACCEPTING';
    runtime.engine.round = { roundId: 'mock-round', roundNumber: 1, questionInstanceIds: ['mock-q'], questionIndex: 0, closed: [], voided: [] };
    runtime.engine.timer = { durationMs: 20_000, remainingMs: 20_000, deadlineMs: start + 20_000 };
    const internal = runtime as unknown as {
      scheduleQuestionCountdown(questionInstanceId: string): void;
      voiceHandles: Set<unknown>;
    };
    internal.scheduleQuestionCountdown('mock-q');
    await vi.waitFor(() => expect(schedules).toHaveLength(1));
    expect(schedules[0]?.cues.map((cue) => cue.secondsRemaining)).toEqual(COUNTDOWN);
    expect(schedules[0]?.cues.map((cue) => cue.startsAtServerMs)).toEqual(
      COUNTDOWN.map((_, index) => start + [10_000, 15_000, 16_000, 17_000, 18_000, 19_000][index]!),
    );
    expect(schedules[0]?.cues[0]?.durationMs).toBe(1_040);
    expect(schedules[0]?.cues[3]?.durationMs).toBe(1_281);
    expect(internal.voiceHandles.size).toBe(0);
    expect(runtime.publicSnapshot(start + 2_000).mcVoiceCountdownSchedule?.scheduleId).toBe(schedules[0]?.scheduleId);
  });

  it('ẩn và huỷ lịch khi câu bị pause giữa countdown', async () => {
    const { runtime, scheduler, schedules } = await makeRuntime();
    const start = scheduler.now();
    runtime.engine.state = 'ACCEPTING';
    runtime.engine.round = { roundId: 'mock-round', roundNumber: 1, questionInstanceIds: ['mock-q'], questionIndex: 0, closed: [], voided: [] };
    runtime.engine.timer = { durationMs: 20_000, remainingMs: 20_000, deadlineMs: start + 20_000 };
    const internal = runtime as unknown as {
      scheduleQuestionCountdown(questionInstanceId: string): void;
      afterCommit(events: unknown[], input: unknown): void;
    };
    internal.scheduleQuestionCountdown('mock-q');
    await vi.waitFor(() => expect(schedules).toHaveLength(1));
    runtime.engine.state = 'PAUSED';
    internal.afterCommit([{ type: 'STATE_CHANGED', from: 'ACCEPTING', to: 'PAUSED' }], {});
    expect(runtime.publicSnapshot().mcVoiceCountdownSchedule).toBeNull();
    scheduler.advance(20_000);
    expect(schedules).toHaveLength(1);
  });

  it('nhắc một lần, đợi voiceTail và gửi bong bóng; bỏ nếu phải chờ quá 4 giây', async () => {
    const { runtime, scheduler, cues } = await makeRuntime();
    const internal = runtime as unknown as {
      speakSpamReminder(questionInstanceId: string, questionNumber: number): void;
      voiceTailAtMs: number;
      voiceHandles: Set<unknown>;
    };
    const start = scheduler.now();
    runtime.engine.state = 'ACCEPTING';
    runtime.engine.round = { roundId: 'mock-round', roundNumber: 1, questionInstanceIds: ['mock-q', 'mock-q2'], questionIndex: 1, closed: [], voided: [] };
    runtime.engine.timer = { durationMs: 20_000, remainingMs: 20_000, deadlineMs: start + 20_000 };
    internal.voiceTailAtMs = start + 2_500;
    internal.speakSpamReminder('mock-q2', 2);
    await vi.waitFor(() => expect(internal.voiceHandles.size).toBe(1));
    scheduler.advance(2_500);
    expect(cues).toContainEqual(expect.objectContaining({
      eventType: 'SPAM_REMINDER', startsAtServerMs: start + 2_500, bubbleText: REMINDER,
    }));

    const lateStart = scheduler.now();
    runtime.engine.round.questionIndex = 4;
    runtime.engine.round.questionInstanceIds[4] = 'mock-q5';
    runtime.engine.timer = { durationMs: 20_000, remainingMs: 20_000, deadlineMs: lateStart + 20_000 };
    internal.voiceTailAtMs = lateStart + 4_500;
    internal.speakSpamReminder('mock-q5', 5);
    scheduler.advance(5_000);
    expect(cues.filter((cue) => cue.eventType === 'SPAM_REMINDER')).toHaveLength(1);
  });

  it('phát lời nhắc nếu kết thúc trước mốc countdown 10 giây', async () => {
    const { runtime, scheduler, cues } = await makeRuntime(() => 300);
    const start = scheduler.now();
    runtime.engine.state = 'ACCEPTING';
    runtime.engine.round = { roundId: 'mock-round', roundNumber: 1, questionInstanceIds: ['mock-q0', 'mock-q'], questionIndex: 1, closed: [], voided: [] };
    runtime.engine.timer = { durationMs: 12_000, remainingMs: 12_000, deadlineMs: start + 12_000 };
    const internal = runtime as unknown as {
      speakSpamReminder(questionInstanceId: string, questionNumber: number): void;
      voiceTailAtMs: number;
      voiceHandles: Set<unknown>;
      voiceAssetPromises: Map<string, Promise<unknown>>;
    };
    internal.voiceTailAtMs = start + 1_500;
    internal.speakSpamReminder('mock-q', 2);
    await Promise.all(internal.voiceAssetPromises.values());
    await Promise.resolve();
    expect(internal.voiceHandles.size).toBe(1);
    scheduler.advance(2_000);
    expect(cues.filter((cue) => cue.eventType === 'SPAM_REMINDER')).toHaveLength(1);
  });

  it('phát câu Hết giờ khi vào reveal bằng asset chung đã làm nóng trước', async () => {
    const { runtime, scheduler, cues } = await makeRuntime();
    runtime.engine.state = 'REVEAL';
    runtime.engine.round = { roundId: 'mock-round', roundNumber: 1, questionInstanceIds: ['mock-q'], questionIndex: 0, closed: ['mock-q'], voided: [] };
    const internal = runtime as unknown as {
      speakGeneric(event: { type: 'TIMEOUT' }, text: string): void;
      voiceHandles: Set<unknown>;
    };
    internal.speakGeneric({ type: 'TIMEOUT' }, 'Hết giờ!');
    await vi.waitFor(() => expect(internal.voiceHandles.size).toBe(1));
    scheduler.advance(80);
    expect(cues).toContainEqual(expect.objectContaining({ eventType: 'TIMEOUT' }));
  });
});
