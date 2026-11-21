import { afterEach, describe, expect, it } from 'vitest';
import type { PublicSnapshot, SessionConfig } from '@quiz/contracts';
import { ManualScheduler } from '@quiz/live-adapters';
import { boot, command, createSession, rt, runUntil, tempDbPath, type Harness } from './helpers';

const open: Harness[] = [];
afterEach(async () => {
  for (const harness of open.splice(0)) {
    await harness.quiz.close().catch(() => {});
    harness.store.close();
  }
});

async function session(dbPath: string, config: Partial<SessionConfig> = {}) {
  const harness = await createSession(await boot({ dbPath, questions: 40 }), config);
  open.push(harness);
  return harness;
}

async function answerCurrent(harness: Harness, questionIndex: number) {
  const runtime = rt(harness);
  runUntil(harness, () => runtime.engine.state === 'ACCEPTING' && runtime.engine.round!.questionIndex === questionIndex);
  const correct = runtime.adminSnapshot().current!.correctOptionId;
  for (let index = 0; index < 3; index += 1) {
    runtime.ingest({
      source: 'MOCK',
      userId: `throne-player-${index}`,
      displayName: `Người ${index}`,
      text: correct,
      eventId: `throne-q${questionIndex + 1}-p${index}`,
    });
  }
  runUntil(harness, () => runtime.engine.state === 'REVEAL');
}

async function restart(harness: Harness, dbPath: string) {
  const expectedThrone = rt(harness).publicSnapshot().throne;
  const sessionId = harness.sessionId;
  const now = harness.scheduler.now();
  await harness.quiz.close();
  harness.store.close();
  open.splice(open.indexOf(harness), 1);
  const recovered = await boot({ dbPath, scheduler: new ManualScheduler(now + 10_000), seedQuestions: false });
  await recovered.quiz.recover();
  const next: Harness = { ...recovered, sessionId };
  open.push(next);
  const recoveredThrone = rt(next).publicSnapshot().throne;
  expect(recoveredThrone.state).toBe(expectedThrone.state);
  if (recoveredThrone.state === 'HELD' && expectedThrone.state === 'HELD') {
    expect(recoveredThrone.holder).toMatchObject({
      safeDisplayName: expectedThrone.holder.safeDisplayName,
      characterId: expectedThrone.holder.characterId,
      score: expectedThrone.holder.score,
      streak: expectedThrone.holder.streak,
    });
  }
  const resume = await command(next, {
    type: 'RESOLVE_RECOVERY',
    decision: 'RESUME',
    reason: 'Kiểm thử phát lại ngai sau khởi động lại',
  });
  expect(resume.status).toBe(200);
  return next;
}

describe('ngai server-side và liên kết nhân vật', () => {
  it('thay ngai ở lượt xoay gần nhất bằng người đầu hàng chờ, không trùng ngai và ghế', async () => {
    const harness = await session(tempDbPath(), { audienceRotateEvery: 6 });
    await command(harness, { type: 'OPEN_LOBBY' });
    const runtime = rt(harness);
    for (let index = 0; index < 35; index += 1) {
      runtime.ingest({
        source: 'MOCK', userId: `throne-player-${index}`, displayName: `Người ${index}`,
        text: 'Comment Free Fire', eventId: `lobby-throne-${index}`,
      });
    }
    expect(runtime.publicSnapshot().audience).toMatchObject({ queued: 5, total: 35 });
    await command(harness, { type: 'START_ROUND' });

    for (let questionIndex = 0; questionIndex <= 5; questionIndex += 1)
      await answerCurrent(harness, questionIndex);

    const before = runtime.publicSnapshot();
    expect(before.throne.state).toBe('HELD');
    if (before.throne.state !== 'HELD') throw new Error('Ngai chưa có chủ sau câu 6');
    const oldHolderName = before.throne.holder.safeDisplayName;
    const oldHolderSeat = before.audience!.seats.find((seat) => seat.occupant === null)?.slotId;
    expect(oldHolderSeat).toBeDefined();
    expect(before.audience!.seats.filter((seat) => seat.occupant === null)).toHaveLength(1);

    runUntil(harness, () => runtime.engine.state === 'PREPARE' && runtime.engine.round?.questionIndex === 6);
    const after = runtime.publicSnapshot();
    const names = after.audience!.seats.flatMap((seat) => seat.occupant ? [seat.occupant.safeDisplayName] : []);
    expect(after.audience!.seats.find((seat) => seat.slotId === oldHolderSeat)?.occupant?.safeDisplayName).toBe('Người 30');
    expect(names).not.toContain(oldHolderName);
    expect(new Set(names).size).toBe(30);
    expect(after.audience!.queued).toBe(0);
  });

  it('giữ cùng public playerId/characterId qua Top 10, Top 3, ngai, ghế, podium và restart sau câu 7/9', async () => {
    const dbPath = tempDbPath();
    let harness = await session(dbPath);
    await command(harness, { type: 'OPEN_LOBBY' });
    await command(harness, { type: 'START_ROUND' });
    expect(rt(harness).publicSnapshot().audience!.seats).toHaveLength(30);

    let questionFiveSnapshot: PublicSnapshot | null = null;
    let questionFiveCharacters = new Map<string, string>();
    for (let questionIndex = 0; questionIndex < 15; questionIndex += 1) {
      if (questionIndex === 4) {
        runUntil(harness, () => rt(harness).engine.state === 'ACCEPTING' && rt(harness).engine.round!.questionIndex === questionIndex);
        questionFiveCharacters = new Map(rt(harness).publicSnapshot().audience!.seats.flatMap((seat) =>
          seat.occupant ? [[seat.occupant.safeDisplayName, seat.occupant.characterId] as const] : [],
        ));
      }
      await answerCurrent(harness, questionIndex);

      if (questionIndex === 4) {
        questionFiveSnapshot = rt(harness).publicSnapshot();
        expect(questionFiveSnapshot.throne.state).toBe('HELD');
        const holder = questionFiveSnapshot.throne.state === 'HELD' ? questionFiveSnapshot.throne.holder : null;
        expect(holder).not.toBeNull();
        expect(questionFiveSnapshot.leaderboard!.entries[0]).toMatchObject({
          playerId: holder!.playerId,
          characterId: holder!.characterId,
        });
        expect(questionFiveSnapshot.questionTop3!.entries[0]).toMatchObject({
          playerId: holder!.playerId,
          characterId: holder!.characterId,
        });
        const audience = questionFiveSnapshot.audience!;
        const audienceHolder = audience.seats
          .flatMap((seat) => seat.occupant ? [seat.occupant] : [])
          .find((occupant) => occupant.safeDisplayName === holder!.safeDisplayName);
        expect(audienceHolder).toBeUndefined();
        expect(questionFiveCharacters.get(holder!.safeDisplayName)).toBe(holder!.characterId);

        runUntil(harness, () => rt(harness).publicSnapshot().stageTop3 !== null);
        const stage = rt(harness).publicSnapshot().stageTop3!;
        expect(stage.entries[0]).toMatchObject({ playerId: holder!.playerId, characterId: holder!.characterId });
      }

      if (questionIndex === 6 || questionIndex === 8) {
        runUntil(harness, () => rt(harness).engine.state === 'ACCEPTING' && rt(harness).engine.round!.questionIndex === questionIndex + 1);
        harness = await restart(harness, dbPath);
      }
    }

    runUntil(harness, () => rt(harness).engine.state === 'VICTORY');
    const victory = rt(harness).publicSnapshot();
    expect(victory.throne.state).toBe('HELD');
    const holder = victory.throne.state === 'HELD' ? victory.throne.holder : null;
    expect(holder).not.toBeNull();
    expect(victory.podium!.slots.find((slot) => slot.place === 1)!.entries[0]).toMatchObject({
      playerId: holder!.playerId,
      characterId: holder!.characterId,
    });
    expect(questionFiveSnapshot?.throne.state).toBe('HELD');
  });
});
