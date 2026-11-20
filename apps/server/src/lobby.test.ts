import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { CreateSessionRequestSchema, type CommandBody, type QuestionSnapshot } from '@quiz/contracts';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { DEMO_PACK, DEMO_QUESTIONS } from '../../../fixtures/questions';
import { Store } from '@quiz/persistence';
import { SessionRuntime } from './runtime';
import { testTempRootAsync } from '../../../tests/support/tempRoot';

type Harness = {
  root: string;
  runtime: SessionRuntime;
  scheduler: ManualScheduler;
  store: Store;
  preflightFails: (fail: boolean) => void;
};
type RuntimeInternals = {
  preparedLobbyRound: { selection: { snapshots: QuestionSnapshot[] } } | null;
  readyQuestionVoiceKeys: Set<string>;
  questionVoiceKey(snapshot: QuestionSnapshot): string;
  lobbyOpenedAtMs: number | null;
  lobbyAutoStartGatesPass(now: number): boolean;
};

const opened: Harness[] = [];

afterEach(async () => {
  for (const item of opened.splice(0)) {
    item.runtime.dispose();
    item.store.close();
    await rm(item.root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

async function makeRuntime(): Promise<Harness> {
  const root = await testTempRootAsync('lobby-seat-');
  const store = new Store(join(root, 'quiz.db'));
  const scheduler = new ManualScheduler();
  store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, scheduler.now());
  let preflightFail = false;
  const runtime = await SessionRuntime.create({
    store,
    scheduler,
    adapter: new MockAdapter(),
    preflight: () => ({ checks: [{ id: 'test', status: preflightFail ? 'FAIL' : 'PASS', reason: 'mock' }] }),
  }, CreateSessionRequestSchema.parse({
    name: 'Lobby seat test',
    config: { mode: 'MOCK', packId: DEMO_PACK.id, allowDemoQuestions: true, questionsPerRound: 10, mcVoiceEnabled: false },
  }));
  const harness = { root, runtime, scheduler, store, preflightFails: (fail: boolean) => { preflightFail = fail; } };
  opened.push(harness);
  return harness;
}

function command(runtime: SessionRuntime, scheduler: ManualScheduler, body: CommandBody) {
  return runtime.dispatch({
    commandId: randomUUID(), expectedStateVersion: runtime.engine.stateVersion, operatorId: 'test-operator',
    requestedAtMs: scheduler.now(), command: body,
  });
}

function reserve(runtime: SessionRuntime, count: number, offset = 0) {
  for (let index = offset; index < offset + count; index += 1) {
    runtime.ingest({ source: 'MOCK', userId: `viewer-${index}`, displayName: `Viewer ${index}`, text: 'FF FREE FIRE!!!' });
  }
}

function internals(runtime: SessionRuntime) {
  return runtime as unknown as RuntimeInternals;
}

async function openLobby(harness: Harness) {
  const { runtime, scheduler } = harness;
  expect(command(runtime, scheduler, { type: 'OPEN_LOBBY' }).result.ok).toBe(true);
  await Promise.resolve();
}

describe('ghế giành được ở LOBBY', () => {
  it('chỉ nhận cụm từ cấu hình, một ghế mỗi người, hàng chờ tràn và giữ ghế khi bắt đầu vòng', async () => {
    const harness = await makeRuntime();
    await openLobby(harness);
    const { runtime, scheduler, store } = harness;
    expect(runtime.ingest({ source: 'MOCK', userId: 'solo', displayName: 'Solo', text: 'free' })).toMatchObject({ accepted: false, reason: 'NOT_AN_ANSWER' });
    expect(runtime.ingest({ source: 'MOCK', userId: 'solo', displayName: 'Solo', text: 'FreeFire' })).toEqual({ accepted: true });
    runtime.ingest({ source: 'MOCK', userId: 'solo', displayName: 'Solo', text: 'free fire' });
    reserve(runtime, 35);

    const lobby = runtime.publicSnapshot().audience!;
    expect(lobby.seats.filter((seat) => seat.occupant !== null)).toHaveLength(30);
    expect(lobby.total).toBe(36);
    expect(lobby.queued).toBe(6);
    expect(runtime.metrics.accepted).toBe(0);

    expect(command(runtime, scheduler, { type: 'START_ROUND' }).result.ok).toBe(true);
    const roundId = runtime.engine.round!.roundId;
    const started = runtime.publicSnapshot().audience!;
    expect(started.seats.filter((seat) => seat.occupant !== null)).toHaveLength(30);
    expect(started.total).toBe(36);
    expect(started.queued).toBe(6);
    expect(started.seats[0]?.occupant?.safeDisplayName).toBe(lobby.seats[0]?.occupant?.safeDisplayName);
    // Mỗi người có nhân vật riêng ngay ở sảnh (không cùng một hình), và giữ nguyên khi vào vòng.
    const lobbyChars = lobby.seats.map((seat) => seat.occupant?.characterId);
    expect(new Set(lobbyChars).size).toBeGreaterThan(5);
    expect(started.seats.map((seat) => seat.occupant?.characterId)).toEqual(lobbyChars);
    expect(runtime.engine.round?.roundId).toBe(roundId);
    expect(runtime.publicSnapshot().participantCount).toBe(0);
    expect(store.answersForRound(roundId)).toEqual([]);
  });

  it('chỉ qua cổng auto-start khi đủ ghế, sảnh đủ 30 giây, voice câu 1 sẵn sàng và preflight không FAIL', async () => {
    const harness = await makeRuntime();
    await openLobby(harness);
    const { runtime, scheduler, preflightFails } = harness;
    reserve(runtime, 29);
    expect(command(runtime, scheduler, { type: 'SET_LOBBY_AUTO_START', enabled: true }).result.ok).toBe(true);
    const state = internals(runtime);
    state.lobbyOpenedAtMs = scheduler.now() - 30_000;
    const first = state.preparedLobbyRound!.selection.snapshots[0]!;
    state.readyQuestionVoiceKeys.add(state.questionVoiceKey(first));
    expect(state.lobbyAutoStartGatesPass(scheduler.now())).toBe(false);

    reserve(runtime, 1, 29);
    state.lobbyOpenedAtMs = scheduler.now() - 29_999;
    expect(state.lobbyAutoStartGatesPass(scheduler.now())).toBe(false);
    state.lobbyOpenedAtMs = scheduler.now() - 30_000;
    state.readyQuestionVoiceKeys.clear();
    expect(state.lobbyAutoStartGatesPass(scheduler.now())).toBe(false);
    state.readyQuestionVoiceKeys.add(state.questionVoiceKey(first));
    preflightFails(true);
    expect(state.lobbyAutoStartGatesPass(scheduler.now())).toBe(false);
    preflightFails(false);
    expect(state.lobbyAutoStartGatesPass(scheduler.now())).toBe(true);
  });

  it('hiện countdown, cho huỷ không đếm lại, và kết thúc bằng START_ROUND có audit system', async () => {
    const cancelled = await makeRuntime();
    await openLobby(cancelled);
    reserve(cancelled.runtime, 35);
    const cancelState = internals(cancelled.runtime);
    cancelState.lobbyOpenedAtMs = cancelled.scheduler.now() - 30_000;
    const cancelFirst = cancelState.preparedLobbyRound!.selection.snapshots[0]!;
    cancelState.readyQuestionVoiceKeys.add(cancelState.questionVoiceKey(cancelFirst));
    command(cancelled.runtime, cancelled.scheduler, { type: 'SET_LOBBY_AUTO_START', enabled: true });
    cancelled.scheduler.advance(1_000);
    expect(cancelled.runtime.publicSnapshot().lobbyCountdown).toEqual({ durationMs: 10_000, remainingMs: 10_000 });
    command(cancelled.runtime, cancelled.scheduler, { type: 'SET_LOBBY_AUTO_START', enabled: false });
    expect(cancelled.runtime.publicSnapshot().lobbyCountdown).toBeNull();
    cancelled.scheduler.advance(12_000);
    expect(cancelled.runtime.engine.state).toBe('LOBBY');

    const automatic = await makeRuntime();
    await openLobby(automatic);
    reserve(automatic.runtime, 35);
    const autoState = internals(automatic.runtime);
    autoState.lobbyOpenedAtMs = automatic.scheduler.now() - 30_000;
    const autoFirst = autoState.preparedLobbyRound!.selection.snapshots[0]!;
    autoState.readyQuestionVoiceKeys.add(autoState.questionVoiceKey(autoFirst));
    command(automatic.runtime, automatic.scheduler, { type: 'SET_LOBBY_AUTO_START', enabled: true });
    automatic.scheduler.advance(1_000);
    expect(automatic.runtime.publicSnapshot().lobbyCountdown?.remainingMs).toBe(10_000);
    automatic.scheduler.advance(10_000);
    expect(automatic.runtime.engine.state).toBe('PREPARE');
    const actions = automatic.store.history(automatic.runtime.id).actions;
    expect(actions).toContainEqual(expect.objectContaining({ commandType: 'START_ROUND', operatorId: 'system', accepted: true }));
    expect(automatic.store.answersForRound(automatic.runtime.engine.round!.roundId)).toEqual([]);
  });
});
