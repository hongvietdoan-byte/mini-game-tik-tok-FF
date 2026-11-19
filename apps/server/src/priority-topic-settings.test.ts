import { rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ManualScheduler } from '@quiz/live-adapters';
import { DEFAULT_PRIORITY_SHARE, DEFAULT_PRIORITY_TOPIC_NAMES } from '@quiz/contracts';
import { DEMO_PACK, DEMO_QUESTIONS } from '../../../fixtures/questions';
import { Store } from '@quiz/persistence';
import { buildApp, type QuizApp } from './app';
import { testTempRootAsync } from '../../../tests/support/tempRoot';

const TOKEN = 'priority-topic-test-token-0123456789';
const headers = { authorization: `Bearer ${TOKEN}`, origin: 'http://127.0.0.1:5173' };
const opened: Array<{ root: string; quiz: QuizApp; store: Store }> = [];

async function openHarness(path?: string) {
  const root = path ? dirname(dirname(path)) : await testTempRootAsync('quiz-priority-topic-');
  const store = new Store(path ?? join(root, 'data', 'quiz.db'));
  store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, 100);
  const quiz = await buildApp({ store, scheduler: new ManualScheduler(1_000), adminToken: TOKEN });
  const harness = { root, quiz, store };
  opened.push(harness);
  return harness;
}

afterEach(async () => {
  for (const harness of opened.splice(0)) {
    await harness.quiz.close().catch(() => {});
    harness.store.close();
    await rm(harness.root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

describe('admin priority-topic settings', () => {
  it('serves defaults and available topics, then persists normalized settings across server restart', async () => {
    const root = await testTempRootAsync('quiz-priority-persist-');
    const path = join(root, 'data', 'quiz.db');
    const first = await openHarness(path);
    const defaults = await first.quiz.app.inject({ method: 'GET', url: '/api/admin/priority-topic-settings', headers });
    expect(defaults.statusCode).toBe(200);
    expect(defaults.json()).toMatchObject({ priorityTopicNames: [...DEFAULT_PRIORITY_TOPIC_NAMES], priorityShare: DEFAULT_PRIORITY_SHARE });
    expect(defaults.json().availableTopics).toContainEqual(expect.objectContaining({ id: 'ff-che-do' }));

    const saved = await first.quiz.app.inject({
      method: 'PUT', url: '/api/admin/priority-topic-settings', headers,
      payload: { priorityTopicNames: [' FFA 2026 ', 'ffa\t2026', ' Đấu Trường Bão Tố '], priorityShare: 0.65 },
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toMatchObject({ priorityTopicNames: ['FFA 2026', 'Đấu Trường Bão Tố'], priorityShare: 0.65 });

    await first.quiz.close();
    first.store.close();
    const second = await openHarness(path);
    const persisted = await second.quiz.app.inject({ method: 'GET', url: '/api/admin/priority-topic-settings', headers });
    expect(persisted.json()).toMatchObject({ priorityTopicNames: ['FFA 2026', 'Đấu Trường Bão Tố'], priorityShare: 0.65 });
  });

  it('requires admin authorization and rejects a share outside zero to one', async () => {
    const { quiz } = await openHarness();
    expect((await quiz.app.inject({ method: 'GET', url: '/api/admin/priority-topic-settings' })).statusCode).toBe(401);
    const invalid = await quiz.app.inject({
      method: 'PUT', url: '/api/admin/priority-topic-settings', headers,
      payload: { priorityTopicNames: ['FFA 2026'], priorityShare: 1.01 },
    });
    expect(invalid.statusCode).toBe(400);
  });
});
