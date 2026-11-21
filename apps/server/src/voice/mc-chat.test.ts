import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreateSessionRequestSchema, type QuestionSnapshot } from '@quiz/contracts';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { NameFilterStore } from '../name-filter-store';
import { McChatPresetStore } from '../mc-chat-presets';
import { SessionRuntime } from '../runtime';
import { McVoiceCache } from './cache';
import { McVoiceService } from './service';
import type { McVoiceAudio, McVoiceCredentialStore, McVoiceProvider } from './types';
import { testTempRootAsync } from '../../../../tests/support/tempRoot';

type Opened = { root: string; runtime: SessionRuntime; store: Store };
const opened: Opened[] = [];

afterEach(async () => {
  for (const item of opened.splice(0)) {
    item.runtime.dispose();
    item.store.close();
    await rm(item.root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

async function makeRuntime(provider?: McVoiceProvider) {
  const root = await testTempRootAsync('mc-chat-runtime-');
  const store = new Store(join(root, 'quiz.db'));
  const scheduler = new ManualScheduler(1_000);
  const audio: McVoiceAudio = { bytes: Buffer.from('mock-chat-audio'), durationMs: 1_200, format: 'mp3' };
  const credentials: McVoiceCredentialStore = { get: async () => 'test-token', set: async () => {}, clear: async () => {} };
  const service = new McVoiceService(provider ?? { synthesize: async () => audio }, new McVoiceCache(join(root, 'cache')),
    credentials, { normalize: async (input) => input });
  const nameFilter = new NameFilterStore(join(root, 'data'), { now: () => scheduler.now() });
  const runtime = await SessionRuntime.create({
    store, scheduler, adapter: new MockAdapter(), nameFilter,
    mcVoice: { service, profile: { model: 'mock-model', voiceKey: 'mock-voice', rate: 1, voiceSettings: { style: 'neutral' } } },
  }, CreateSessionRequestSchema.parse({
    name: 'MC chat test', config: { mode: 'MOCK', allowDemoQuestions: true, mcVoiceEnabled: true },
  }));
  opened.push({ root, runtime, store });
  return { root, runtime, store, scheduler, service, nameFilter };
}

describe('MC chat', () => {
  it('câu đã duyệt không đọc tên; MC chat operator được nhắc tên nhưng MC tự động vẫn giữ luật an toàn', async () => {
    const synthesize = vi.fn(async (_request: Parameters<McVoiceProvider['synthesize']>[0]) => ({ bytes: Buffer.from('approved-question-audio'), durationMs: 1_200, format: 'mp3' as const }));
    const { runtime } = await makeRuntime({ synthesize });
    Object.defineProperty(runtime, 'voiceIdentityValues', { value: () => ['Trang'] });
    const snapshot: QuestionSnapshot = {
      questionInstanceId: 'round-1:q12', questionId: 'demo-018', questionVersion: 1, index: 11,
      prompt: 'Vật phẩm nào giúp người chơi mang theo nhiều đồ hơn trong hành trang?',
      options: [
        { id: 'A', text: 'Túi lớn', originalOptionId: 'o1' },
        { id: 'B', text: 'Giày nhanh', originalOptionId: 'o2' },
        { id: 'C', text: 'Khiên', originalOptionId: 'o3' },
        { id: 'D', text: 'Bản đồ', originalOptionId: 'o4' },
      ],
      correctOptionId: 'A', explanation: '', difficulty: 'EASY', subtopicId: 'demo-chung', isDemo: false,
    };
    const prepareQuestionVoice = (runtime as unknown as {
      prepareQuestionVoice(value: QuestionSnapshot): Promise<{ ok: boolean } | null>;
    }).prepareQuestionVoice.bind(runtime);

    await expect(prepareQuestionVoice(snapshot)).resolves.toMatchObject({ ok: true });
    expect(synthesize.mock.calls.some(([request]) => request.text.includes('hành trang'))).toBe(true);
    expect(runtime.sendMcChat({ text: 'Chào Trang, chúc bạn may mắn!', speak: false }).status).toBe(202);
    expect(synthesize.mock.calls.some(([request]) => request.text.includes('Chào Trang'))).toBe(false);
    synthesize.mockClear();
    await expect((runtime as unknown as {
      voiceAsset(event: { type: 'WELCOME'; scriptId: string }, text: string): Promise<unknown>;
    }).voiceAsset({ type: 'WELCOME', scriptId: 'lobby-v1' }, 'Chào Trang')).resolves.toBeNull();
    expect(synthesize).not.toHaveBeenCalled();
  });

  it('giữa vòng giữ câu BXH cũ; sau câu 15 phát câu kết riêng thay vì hẹn câu tiếp theo', async () => {
    const synthesize = vi.fn(async (_request: Parameters<McVoiceProvider['synthesize']>[0]) => ({ bytes: Buffer.from('round-end-audio'), durationMs: 1_200, format: 'mp3' as const }));
    const { runtime } = await makeRuntime({ synthesize });
    const cueTypes: string[] = [];
    const cueWaiters: Array<(eventType: string) => void> = [];
    Object.defineProperty(runtime, 'scheduleVoiceCue', {
      value: (eventType: string) => {
        cueTypes.push(eventType);
        cueWaiters.shift()?.(eventType);
      },
    });
    const nextCue = () => new Promise<string>((resolve) => cueWaiters.push(resolve));
    const questionInstanceIds = Array.from({ length: 15 }, (_, index) => `round-15:q${index + 1}`);
    Object.assign(runtime.engine, {
      state: 'LEADERBOARD', sessionStatus: 'OPEN',
      round: { roundId: 'round-15', questionIndex: 13, questionInstanceIds },
    });
    const afterCommit = (runtime as unknown as { afterCommit(events: never[], input: never): void }).afterCommit.bind(runtime);
    const enteredLeaderboard = [{ type: 'STATE_CHANGED', from: 'REVEAL', to: 'LEADERBOARD' }] as never[];

    const leaderboardCue = nextCue();
    afterCommit(enteredLeaderboard, null as never);
    await expect(leaderboardCue).resolves.toBe('LEADERBOARD_GENERIC');
    expect(synthesize.mock.calls.some(([request]) =>
      request.text === 'Bảng xếp hạng đã cập nhật. Cùng cố gắng ở câu tiếp theo nhé!')).toBe(true);
    expect(cueTypes).toEqual(['LEADERBOARD_GENERIC']);

    runtime.engine.round!.questionIndex = 14;
    const roundCompleteCue = nextCue();
    afterCommit(enteredLeaderboard, null as never);
    await expect(roundCompleteCue).resolves.toBe('ROUND_COMPLETE_GENERIC');
    expect(synthesize.mock.calls.some(([request]) =>
      request.text === 'Đã xong tất cả các câu hỏi! Cùng xem ai là nhà vô địch nhé!')).toBe(true);
    expect(cueTypes).toEqual(['LEADERBOARD_GENERIC', 'ROUND_COMPLETE_GENERIC']);
  });

  it('đợi giọng tạo xong, xếp hàng lúc MC bận và đồng bộ bubble với cue khi MC rảnh', async () => {
    const synthesize = vi.fn(async () => ({ bytes: Buffer.from('cached-mock-audio'), durationMs: 1_200, format: 'mp3' as const }));
    const { runtime, scheduler } = await makeRuntime({ synthesize });
    const publicSnapshots: NonNullable<ReturnType<typeof runtime.publicSnapshot>['mcVoiceCue']>[] = [];
    const bubbles: NonNullable<ReturnType<typeof runtime.publicSnapshot>['mcChatBubble']>[] = [];
    runtime.subscribe((batch) => {
      for (const item of batch) {
        if (item.audience !== 'public' || item.message.type !== 'STATE_SNAPSHOT') continue;
        const snapshot = item.message.payload;
        if (snapshot.mcVoiceCue?.eventType === 'OPERATOR_CHAT') publicSnapshots.push(snapshot.mcVoiceCue);
        if (snapshot.mcChatBubble) bubbles.push(snapshot.mcChatBubble);
      }
    });
    runtime.engine.state = 'READING';
    const accepted = runtime.sendMcChat({ text: '  Xin chào khán giả  ', speak: true });
    expect(accepted.result).toMatchObject({ ok: true, item: { text: 'Xin chào khán giả', status: 'GENERATING', speak: true } });
    await vi.waitFor(() => expect(runtime.adminSnapshot().mcChatQueue?.[0]?.status).toBe('QUEUED'));
    scheduler.advance(20_000);
    expect(runtime.publicSnapshot().mcChatBubble).toBeNull();
    expect(publicSnapshots).toHaveLength(0);

    runtime.engine.state = 'LEADERBOARD';
    (runtime as unknown as { pumpMcChatQueue(): void }).pumpMcChatQueue();
    scheduler.advance(80);
    expect(publicSnapshots).toHaveLength(1);
    expect(bubbles).toHaveLength(1);
    expect(publicSnapshots[0]).toMatchObject({ eventType: 'OPERATOR_CHAT', bubbleText: 'Xin chào khán giả' });
    expect(bubbles[0]).toMatchObject({ text: 'Xin chào khán giả', startsAtServerMs: publicSnapshots[0]!.startsAtServerMs,
      endsAtServerMs: publicSnapshots[0]!.startsAtServerMs + publicSnapshots[0]!.durationMs });
    expect(runtime.adminSnapshot().mcChatQueue?.[0]?.status).toBe('PLAYING');

    scheduler.advance(1_200);
    expect(runtime.adminSnapshot().mcChatQueue?.[0]?.status).toBe('DONE');
    expect(runtime.publicSnapshot().mcChatBubble).toBeNull();
  });

  it('chỉ hiện chữ khi speak=false; cho phép tên operator, bỏ alias không dấu và chặn nội dung có dấu', async () => {
    const { runtime, scheduler, nameFilter } = await makeRuntime();
    runtime.engine.state = 'LOBBY';
    const textOnly = runtime.sendMcChat({ text: 'Xin chào mọi người', speak: false });
    expect(textOnly.result).toMatchObject({ ok: true, item: { speak: false, status: 'QUEUED' } });
    scheduler.advance(80);
    expect(runtime.publicSnapshot().mcChatBubble?.text).toBe('Xin chào mọi người');
    expect(runtime.publicSnapshot().mcVoiceCue).toBeNull();

    Object.defineProperty(runtime, 'voiceIdentityValues', { value: () => ['player-0001', 'Tiên'] });
    for (const text of [
      'Sắp đủ ghế rùi',
      'xe lại đi anh em',
      'chỉ tính câu trả lời đầu tiên thui đó anh em',
      'các bạn lớn tuổi dù sao cũng vui',
    ]) expect(runtime.sendMcChat({ text, speak: false }).status, text).toBe(202);
    expect(runtime.sendMcChat({ text: 'Câu này địt tục quá', speak: false })).toMatchObject({
      status: 422, result: { code: 'MC_CHAT_UNSAFE_CONTENT', message: expect.stringContaining('“địt”') },
    });
    expect(runtime.sendMcChat({ text: 'dm', speak: false })).toMatchObject({
      status: 422, result: { code: 'MC_CHAT_UNSAFE_CONTENT' },
    });
    nameFilter.addRule({ term: 'từ cấm operator', aliases: [], match: 'word', group: 'PROFANITY', severity: 'HIGH' });
    expect(runtime.sendMcChat({ text: 'Câu chúc mừng này có từ cấm operator ở cuối', speak: false })).toMatchObject({
      status: 422, result: { code: 'MC_CHAT_UNSAFE_CONTENT', message: expect.stringContaining('“từ cấm operator”') },
    });

    runtime.engine.state = 'READING';
    const queued = [0, 1, 2, 3].map((index) => runtime.sendMcChat({ text: `Câu chờ ${index + 1}`, speak: false }));
    expect(queued.every((result) => result.status === 202)).toBe(true);
    expect(runtime.sendMcChat({ text: 'Câu thứ sáu', speak: false })).toMatchObject({
      status: 429, result: { code: 'MC_CHAT_QUEUE_FULL' },
    });
    const last = runtime.adminSnapshot().mcChatQueue!.at(-1)!;
    expect(runtime.cancelMcChat(last.id).status).toBe(200);
    expect(runtime.sendMcChat({ text: 'Vừa có chỗ', speak: false }).status).toBe(202);

    const history = runtime['store'].history(runtime.id);
    expect(history.actions.map((action) => action.commandType)).toContain('MC_CHAT_SEND');
    expect(JSON.stringify(history.actions)).not.toContain('Xin chào mọi người');
  });

  it('đưa câu gặp timeout sang ERROR và chỉ hiện chữ sau khi operator chọn fallback', async () => {
    const { runtime, scheduler } = await makeRuntime({ synthesize: () => new Promise<McVoiceAudio>(() => {}) });
    runtime.engine.state = 'LOBBY';
    const request = runtime.sendMcChat({ text: 'Hẹn gặp ở vòng sau', speak: true });
    const id = (request.result as { item: { id: string } }).item.id;
    scheduler.advance(10_000);
    expect(runtime.adminSnapshot().mcChatQueue?.[0]).toMatchObject({ status: 'ERROR', errorMessage: expect.stringContaining('10 giây') });
    expect(runtime.publicSnapshot().mcChatBubble).toBeNull();
    expect(runtime.useMcChatTextFallback(id)).toMatchObject({ status: 202, result: { item: { speak: false, status: 'QUEUED' } } });
    scheduler.advance(80);
    expect(runtime.publicSnapshot().mcChatBubble?.text).toBe('Hẹn gặp ở vòng sau');
  });

  it('lưu và xoá câu mẫu trong JSON cục bộ', async () => {
    const root = await testTempRootAsync('mc-chat-presets-');
    const filePath = join(root, 'data', 'mc-chat-presets.json');
    const presets = new McChatPresetStore(filePath);
    expect(presets.list()).toEqual([]);
    const preset = presets.add({ text: 'Nhớ theo dõi kênh nhé!' });
    expect(presets.list()).toEqual([preset]);
    expect(presets.remove(preset!.id)).toBe(true);
    expect(presets.list()).toEqual([]);
    await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });
});
