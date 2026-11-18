import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreateSessionRequestSchema, type CommandBody } from '@quiz/contracts';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { DEMO_PACK, DEMO_QUESTIONS } from '../../../fixtures/questions';
import { Store } from '@quiz/persistence';
import { testTempRootAsync } from '../../../tests/support/tempRoot';
import { SessionRuntime } from './runtime';

const opened: { root: string; runtime?: SessionRuntime; store: Store }[] = [];

afterEach(async () => {
  for (const item of opened.splice(0).reverse()) {
    item.runtime?.dispose();
    item.store.close();
    await rm(item.root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

describe('SessionRuntime stream-delay cache', () => {
  it('không truy vấn mẫu độ trễ hoặc round_questions mỗi lần tạo snapshot', async () => {
    const root = await testTempRootAsync('stream-delay-cache-');
    const store = new Store(join(root, 'quiz.db'));
    const cleanup: { root: string; store: Store; runtime?: SessionRuntime } = { root, store };
    opened.push(cleanup);
    const scheduler = new ManualScheduler();
    store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, scheduler.now());
    const recentSamples = vi.spyOn(store, 'recentCorrectAnswerElapsedMs');
    const roundQuestions = vi.spyOn(store, 'roundQuestions');
    const runtime = await SessionRuntime.create({ store, scheduler, adapter: new MockAdapter() }, CreateSessionRequestSchema.parse({
      name: 'Stream delay cache',
      config: { mode: 'MOCK', packId: DEMO_PACK.id, allowDemoQuestions: true, questionsPerRound: 10, mcVoiceEnabled: false },
    }));
    cleanup.runtime = runtime;
    recentSamples.mockClear();

    const dispatch = (command: CommandBody) => runtime.dispatch({
      commandId: randomUUID(), expectedStateVersion: runtime.engine.stateVersion,
      operatorId: 'stream-delay-cache-test', requestedAtMs: scheduler.now(), command,
    });
    expect(dispatch({ type: 'OPEN_LOBBY' }).result.ok).toBe(true);
    expect(dispatch({ type: 'START_ROUND' }).result.ok).toBe(true);
    expect(roundQuestions).toHaveBeenCalledTimes(1); // Nạp một lần khi vòng bắt đầu.
    roundQuestions.mockClear();

    for (let index = 0; index < 20; index += 1) runtime.adminSnapshot();
    expect(recentSamples).not.toHaveBeenCalled();
    expect(roundQuestions).not.toHaveBeenCalled();

    expect(runtime.updateStreamDelaySettings({ mode: 'MANUAL', manualDelayMs: 4_500 })).toBe(true);
    expect(runtime.adminSnapshot().streamDelay).toMatchObject({ mode: 'MANUAL', nextQuestionDelayMs: 4_500 });
    expect(recentSamples).not.toHaveBeenCalled();
    expect(runtime.updateStreamDelaySettings({ mode: 'AUTO', manualDelayMs: 4_500 })).toBe(true);
    expect(recentSamples).not.toHaveBeenCalled(); // Mẫu đã nạp một lần khi tạo runtime.

    recentSamples.mockClear();
    for (let index = 0; index < 20; index += 1) runtime.adminSnapshot();
    expect(recentSamples).not.toHaveBeenCalled();
    expect(roundQuestions).not.toHaveBeenCalled();
  });
});
