import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ManualScheduler } from '@quiz/live-adapters';
import { DEMO_PACK, DEMO_QUESTIONS } from '../../../fixtures/questions';
import { Store } from '@quiz/persistence';
import { buildApp } from './app';

const TOKEN = 'question-length-test-token-0123456789';
const cleanup: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});

async function boot() {
  const root = mkdtempSync(join(tmpdir(), 'quiz-question-length-'));
  const dataDir = join(root, 'data');
  mkdirSync(dataDir, { recursive: true });
  const store = new Store(join(dataDir, 'quiz.db'));
  store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, 1_800_000_000_000);
  const scheduler = new ManualScheduler(1_800_000_000_000);
  const webRoots = {
    dashboard: join(root, 'dashboard'),
    overlay: join(root, 'overlay'),
    assets: join(root, 'assets'),
  };
  for (const directory of Object.values(webRoots)) mkdirSync(directory, { recursive: true });
  const commit = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], {
    cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  for (const directory of [webRoots.dashboard, webRoots.overlay]) {
    writeFileSync(join(directory, 'index.html'), '<!doctype html>');
    writeFileSync(join(directory, '.build-commit'), `${commit}\n`);
  }
  for (const relative of ['brand/logo.png', 'victory/trophy-stage.png', 'victory/bg.jpg', 'chibi/test.png', 'mc/kelly.png']) {
    const path = join(webRoots.assets, relative);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, 'test asset');
  }
  const quiz = await buildApp({
    store,
    scheduler,
    adminToken: TOKEN,
    repositoryRoot: process.cwd(),
    webRoots,
  });
  cleanup.push(async () => {
    await quiz.close();
    store.close();
    rmSync(root, { recursive: true, force: true });
  });
  return { quiz, store, scheduler };
}

function selectionQuestion(index: number, prompt: string, optionTexts = ['Option one', 'Option two', 'Option three', 'Option four']) {
  return {
    id: `selection-${String(index).padStart(2, '0')}`,
    packId: 'length-test',
    subtopicId: 'general',
    prompt,
    options: optionTexts.map((text, optionIndex) => ({ id: `o${optionIndex + 1}`, text })),
    correctOptionId: 'o1',
    explanation: '',
    difficulty: 'EASY',
    tags: [],
    sourceRefs: [],
    verificationStatus: 'DEMO',
    approvalStatus: 'APPROVED',
  };
}

describe('Question length warnings API', () => {
  it('trả TOO_LONG trong danh sách câu và kết quả duyệt mà không chặn duyệt', async () => {
    const { quiz } = await boot();
    const listed = await quiz.app.inject({
      method: 'GET', url: '/api/questions', headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(listed.statusCode).toBe(200);
    const question = (listed.json() as { id: string; warnings: { code: string; field: string }[] }[])
      .find((item) => item.id === 'demo-001');
    expect(question?.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'TOO_LONG', field: 'prompt' }),
      expect.objectContaining({ code: 'TOO_LONG', field: 'option' }),
    ]));

    const reviewed = await quiz.app.inject({
      method: 'POST',
      url: '/api/questions/demo-001/approve',
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: { decision: 'APPROVE', operatorId: 'review-test' },
    });
    expect(reviewed.statusCode).toBe(200);
    expect(reviewed.json()).toMatchObject({
      ok: true,
      warnings: expect.arrayContaining([expect.objectContaining({ code: 'TOO_LONG' })]),
    });
  });

  it('preflight ghi thông tin số câu dài đã loại và vẫn PASS khi còn đủ câu hợp lệ', async () => {
    const { quiz, store, scheduler } = await boot();
    const exactLengthOption = 'a'.repeat(45);
    const questions = [
      { ...selectionQuestion(1, 'p'.repeat(161)), id: 'preflight-long-prompt' },
      { ...selectionQuestion(2, 'Câu ngắn', ['o'.repeat(46), 'b', 'c', 'd']), id: 'preflight-long-option' },
      { ...selectionQuestion(3, 'p'.repeat(160), [exactLengthOption, 'b'.repeat(45), 'c'.repeat(45), 'd'.repeat(45)]), id: 'preflight-at-limit' },
      ...Array.from({ length: 9 }, (_, index) => selectionQuestion(index + 4, `Câu ngắn ${index + 4}`)),
    ];
    store.seedQuestions({ id: 'length-test', name: 'Preflight display limits' }, questions, scheduler.now());
    const created = await quiz.app.inject({
      method: 'POST',
      url: '/api/sessions',
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: {
        name: 'Preflight display limits',
        config: { mode: 'MOCK', packId: 'length-test', allowDemoQuestions: true, questionsPerRound: 10, seed: 42 },
      },
    });
    expect(created.statusCode).toBe(201);
    const response = await quiz.app.inject({
      method: 'GET', url: '/api/preflight', headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(response.statusCode).toBe(200);
    const questionsCheck = response.json().checks.find((check: { id: string }) => check.id === 'questions');
    expect(questionsCheck).toMatchObject({
      status: 'PASS',
      reason: expect.stringContaining('10 câu hợp lệ (đã loại 2 câu dài khỏi lượt chọn)'),
    });
    const lengthCheck = response.json().checks.find((check: { id: string }) => check.id === 'questionLength');
    expect(lengthCheck).toMatchObject({
      status: 'PASS',
      reason: 'Đã loại 2 câu dài khỏi lượt chọn.',
    });
    expect(questionsCheck.reason).toContain('10 câu chưa dùng / cần 10');
  });

  it('FAIL khi số câu hợp lệ sau khi loại câu dài nhỏ hơn questionsPerRound', async () => {
    const { quiz, store, scheduler } = await boot();
    const questions = [
      { ...selectionQuestion(1, 'p'.repeat(161)), id: 'shortage-long-prompt' },
      { ...selectionQuestion(2, 'Câu ngắn', ['o'.repeat(46), 'b', 'c', 'd']), id: 'shortage-long-option' },
      ...Array.from({ length: 8 }, (_, index) => selectionQuestion(index + 3, `Câu hợp lệ ${index + 3}`)),
    ];
    store.seedQuestions({ id: 'length-test', name: 'Preflight insufficient valid questions' }, questions, scheduler.now());
    const created = await quiz.app.inject({
      method: 'POST',
      url: '/api/sessions',
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: {
        name: 'Preflight insufficient valid questions',
        config: { mode: 'MOCK', packId: 'length-test', allowDemoQuestions: true, questionsPerRound: 10, seed: 42 },
      },
    });
    expect(created.statusCode).toBe(201);
    const response = await quiz.app.inject({
      method: 'GET', url: '/api/preflight', headers: { authorization: `Bearer ${TOKEN}` },
    });
    const questionsCheck = response.json().checks.find((check: { id: string }) => check.id === 'questions');
    expect(questionsCheck).toMatchObject({ status: 'FAIL' });
    expect(questionsCheck.reason).toContain('8 câu hợp lệ (đã loại 2 câu dài khỏi lượt chọn)');
    expect(questionsCheck.reason).toContain('8 câu chưa dùng / cần 10');
    expect(response.json().checks.find((check: { id: string }) => check.id === 'questionLength')).toMatchObject({
      status: 'PASS', reason: 'Đã loại 2 câu dài khỏi lượt chọn.',
    });
  });

  it('thông tin câu dài không tạo cổng chặn phiên', async () => {
    const { quiz } = await boot();
    const response = await quiz.app.inject({
      method: 'GET', url: '/api/preflight', headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().checks.find((check: { id: string }) => check.id === 'questionLength')).toMatchObject({
      status: 'PASS',
      reason: expect.stringMatching(/^Đã loại \d+ câu dài khỏi lượt chọn\.$/),
    });
    expect(response.json().canStartTikTok).toBe(true);
  });

  it('không khởi tạo vòng nếu chỉ còn câu dài và không log TOO_LONG', async () => {
    const { quiz, store, scheduler } = await boot();
    const allQuestions = [
      ...Array.from({ length: 10 }, (_, index) => selectionQuestion(index + 1, `Câu ngắn ${index + 1}?`)),
      ...Array.from({ length: 10 }, (_, index) => selectionQuestion(index + 11, `Câu dài ${index + 11}: ${'nội dung '.repeat(18)}`)),
    ];
    store.seedQuestions({ id: 'length-test', name: 'Question length test' }, allQuestions, scheduler.now());
    const created = await quiz.app.inject({
      method: 'POST',
      url: '/api/sessions',
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: {
        name: 'Question length test',
        config: { mode: 'MOCK', packId: 'length-test', allowDemoQuestions: true, questionsPerRound: 20, seed: 42 },
      },
    });
    expect(created.statusCode).toBe(201);
    const sessionId = created.json().sessionId as string;
    await Promise.resolve();

    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const command = async (type: 'OPEN_LOBBY' | 'START_ROUND') => {
      const session = quiz.runtime();
      if (!session) throw new Error('Thiếu runtime test.');
      return quiz.app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/commands`,
        headers: { authorization: `Bearer ${TOKEN}` },
        payload: {
          commandId: randomUUID(),
          expectedStateVersion: session.engine.stateVersion,
          operatorId: 'test',
          requestedAtMs: scheduler.now(),
          command: { type },
        },
      });
    };
    try {
      expect((await command('OPEN_LOBBY')).statusCode).toBe(200);
      const startRound = await command('START_ROUND');
      expect(startRound.statusCode).toBe(422);
      expect(startRound.json()).toMatchObject({
        ok: false,
        code: 'INSUFFICIENT_QUESTIONS',
        details: { eligible: 10, unused: 10, required: 20 },
      });
      expect(warning).not.toHaveBeenCalledWith(expect.stringContaining('TOO_LONG'));
    } finally {
      warning.mockRestore();
    }
  });

  it('preflight dự báo quota 7/5/3, báo số vòng còn đủ và log phân bố thực tế khi bật DIFFICULTY', async () => {
    const { quiz, scheduler } = await boot();
    const created = await quiz.app.inject({
      method: 'POST',
      url: '/api/sessions',
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: {
        name: 'Difficulty selection test',
        config: {
          mode: 'MOCK', packId: 'demo', allowDemoQuestions: true,
          questionsPerRound: 15, questionSelectionMode: 'DIFFICULTY', seed: 42,
        },
      },
    });
    expect(created.statusCode).toBe(201);
    const sessionId = created.json().sessionId as string;

    const preflight = await quiz.app.inject({
      method: 'GET', url: '/api/preflight', headers: { authorization: `Bearer ${TOKEN}` },
    });
    const distribution = preflight.json().checks.find((check: { id: string }) => check.id === 'difficultyDistribution');
    expect(distribution).toMatchObject({
      status: 'WARN',
      reason: expect.stringContaining('7 dễ / 5 vừa / 3 khó'),
    });
    expect(distribution.reason).toContain('Còn đủ 2 vòng × 15 câu');
    expect(distribution.reason).toContain('6 vòng cần 90');

    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const command = async (type: 'OPEN_LOBBY' | 'START_ROUND') => {
      const session = quiz.runtime();
      if (!session) throw new Error('Thiếu runtime test.');
      return quiz.app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/commands`,
        headers: { authorization: `Bearer ${TOKEN}` },
        payload: {
          commandId: randomUUID(),
          expectedStateVersion: session.engine.stateVersion,
          operatorId: 'test',
          requestedAtMs: scheduler.now(),
          command: { type },
        },
      });
    };
    try {
      expect((await command('OPEN_LOBBY')).statusCode).toBe(200);
      expect((await command('START_ROUND')).statusCode).toBe(200);
      expect(warning).toHaveBeenCalledWith(expect.stringContaining(
        '[quiz] Phân bố độ khó: 7 dễ / 5 vừa / 3 khó',
      ));
    } finally {
      warning.mockRestore();
    }
  });
});
