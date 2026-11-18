import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { QuizApp } from '@quiz/server';
import type { Store } from '@quiz/persistence';
import { ManualScheduler } from '@quiz/live-adapters';
import { AUTH, boot, command, createSession, rt } from './helpers';
import { testTempRootAsync } from '../support/tempRoot';

const opened: Array<{ root: string; quiz: QuizApp; store: Store }> = [];

afterEach(async () => {
  for (const item of opened.splice(0)) {
    await item.quiz.close().catch(() => {});
    item.store.close();
    await rm(item.root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

async function harness(mcVoiceEnabled = false) {
  const root = await testTempRootAsync('mc-chat-api-');
  const base = await boot({ dbPath: join(root, 'quiz.db'), scheduler: new ManualScheduler(1_000) });
  opened.push({ root, quiz: base.quiz, store: base.store });
  const session = await createSession(base, { mcVoiceEnabled });
  return { ...session, root };
}

describe('MC chat admin API', () => {
  it('guard token, validate text, expose queue, persist presets locally and audit operator actions', async () => {
    const h = await harness();
    expect((await h.quiz.app.inject({ method: 'GET', url: '/api/mc-chat-presets' })).statusCode).toBe(401);
    expect((await h.quiz.app.inject({ method: 'POST', url: `/api/sessions/${h.sessionId}/mc-chat`, payload: { text: 'Hi' } })).statusCode).toBe(401);

    const empty = await h.quiz.app.inject({ method: 'POST', url: '/api/mc-chat-presets', headers: AUTH, payload: { text: '   ' } });
    expect(empty.statusCode).toBe(422);
    const added = await h.quiz.app.inject({ method: 'POST', url: '/api/mc-chat-presets', headers: AUTH, payload: { text: 'Theo dõi kênh để xem vòng tiếp theo!' } });
    expect(added.statusCode).toBe(200);
    const preset = added.json().presets[0] as { id: string; text: string };
    expect((await h.quiz.app.inject({ method: 'GET', url: '/api/mc-chat-presets', headers: AUTH })).json().presets).toEqual([preset]);
    expect((await h.quiz.app.inject({ method: 'DELETE', url: `/api/mc-chat-presets/${preset.id}`, headers: AUTH })).json().presets).toEqual([]);

    const runtime = rt(h);
    await command(h, { type: 'OPEN_LOBBY' });
    const sent = await h.quiz.app.inject({ method: 'POST', url: `/api/sessions/${h.sessionId}/mc-chat`, headers: AUTH,
      payload: { text: '  Xin chào khán giả  ', speak: true } });
    expect(sent.statusCode).toBe(202);
    expect(sent.json().item).toMatchObject({ text: 'Xin chào khán giả', speak: false, status: 'QUEUED' });
    expect(runtime.adminSnapshot().mcChatQueue?.[0]?.text).toBe('Xin chào khán giả');
    const safety = await h.quiz.app.inject({ method: 'POST', url: `/api/sessions/${h.sessionId}/mc-chat`, headers: AUTH,
      payload: { text: 'Địt thật', speak: false } });
    expect(safety.statusCode).toBe(422);
    expect(safety.json()).toMatchObject({ code: 'MC_CHAT_UNSAFE_CONTENT', message: expect.stringContaining('“Địt”') });
    h.scheduler.advance(80);
    expect(runtime.publicSnapshot().mcChatBubble?.text).toBe('Xin chào khán giả');

    const actions = h.store.history(h.sessionId).actions;
    expect(actions.map((action: { commandType: string }) => action.commandType)).toContain('MC_CHAT_SEND');
    expect(JSON.stringify(actions)).not.toContain('Xin chào khán giả');
  });

  it('huỷ câu đang chờ, fallback khi giọng chưa sẵn sàng và từ chối khi phiên đóng', async () => {
    const h = await harness(true);
    const runtime = rt(h);
    runtime.engine.state = 'READING';
    const first = await h.quiz.app.inject({ method: 'POST', url: `/api/sessions/${h.sessionId}/mc-chat`, headers: AUTH,
      payload: { text: 'Câu chờ một', speak: false } });
    const firstId = (first.json() as { item: { id: string } }).item.id;
    const cancelled = await h.quiz.app.inject({ method: 'POST', url: `/api/sessions/${h.sessionId}/mc-chat/${firstId}/cancel`, headers: AUTH, payload: {} });
    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.json().item.status).toBe('CANCELLED');

    const failedVoice = await h.quiz.app.inject({ method: 'POST', url: `/api/sessions/${h.sessionId}/mc-chat`, headers: AUTH,
      payload: { text: 'Không có voice provider', speak: true } });
    const id = (failedVoice.json() as { item: { id: string } }).item.id;
    await vi.waitFor(() => expect(runtime.adminSnapshot().mcChatQueue?.find((item) => item.id === id)?.status).toBe('ERROR'));
    const fallback = await h.quiz.app.inject({ method: 'POST', url: `/api/sessions/${h.sessionId}/mc-chat/${id}/fallback`, headers: AUTH, payload: {} });
    expect(fallback.statusCode).toBe(202);
    expect(fallback.json().item).toMatchObject({ speak: false, status: 'QUEUED' });

    runtime.engine.sessionStatus = 'CLOSED';
    expect(runtime.sendMcChat({ text: 'Phiên đã đóng', speak: false }).status).toBe(409);
  });
});
