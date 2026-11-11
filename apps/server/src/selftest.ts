import { randomUUID } from 'node:crypto';
import type { CommandBody } from '@quiz/contracts';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { SessionRuntime } from './runtime';

export type SelfTestResult = {
  ok: boolean;
  mockComment: boolean;
  engineRecorded: boolean;
  detail: string;
  durationMs: number;
};

/**
 * Tự kiểm pipeline (Connection Test bước 5 + 8) trên DB TẠM trong bộ nhớ và đồng hồ ảo:
 * mock comment → cửa sổ nhận → ghi đáp án → chốt câu → sổ cái điểm. Không đụng phiên LIVE đang chạy.
 * Câu hỏi ở đây là dữ liệu kỹ thuật nội bộ, không bao giờ hiện lên overlay.
 */
export async function runPipelineSelfTest(): Promise<SelfTestResult> {
  const t0 = performance.now();
  const scheduler = new ManualScheduler();
  const store = new Store(':memory:');
  let rt: SessionRuntime | null = null;
  try {
    store.seedQuestions(
      { id: 'selftest', name: 'Tự kiểm' },
      Array.from({ length: 10 }, (_, i) => ({
        id: `selftest-${i + 1}`,
        packId: 'selftest',
        subtopicId: 'selftest',
        prompt: `Câu tự kiểm hệ thống ${i + 1}`,
        options: [1, 2, 3, 4].map((k) => ({ id: `o${k}`, text: `Lựa chọn ${k}` })),
        correctOptionId: 'o1',
        difficulty: 'EASY',
        verificationStatus: 'DEMO',
        approvalStatus: 'APPROVED',
      })),
      scheduler.now(),
    );
    const adapter = new MockAdapter();
    rt = await SessionRuntime.create(
      { store, scheduler, adapter },
      {
        name: 'Tự kiểm',
        config: {
          mode: 'MOCK',
          packId: 'selftest',
          questionsPerRound: 10,
          leaderboardInterval: 5,
          timings: {
            lobbyMs: 30_000,
            prepareMs: 3_000,
            answerMs: 15_000,
            revealMs: 4_000,
            leaderboardMs: 4_000,
            roundEndMs: 2_000,
            victoryMs: 18_000,
            intermissionMs: 25_000,
          },
          speedMultiplier: 1,
          allowDemoQuestions: true,
          seed: 1,
          maxSourceLagMs: 5_000,
        },
      },
    );
    await Promise.resolve();
    const r = rt;
    const send = (command: CommandBody) =>
      r.dispatch({
        commandId: randomUUID(),
        expectedStateVersion: r.engine.stateVersion,
        operatorId: 'selftest',
        requestedAtMs: scheduler.now(),
        command,
      });
    if (!send({ type: 'OPEN_LOBBY' }).result.ok || !send({ type: 'START_ROUND' }).result.ok)
      return done(false, false, 'Không mở được vòng thử');
    for (let i = 0; i < 100 && r.engine.state !== 'ACCEPTING'; i++) scheduler.advance(250);
    const correct = r.adminSnapshot().current?.correctOptionId;
    if (r.engine.state !== 'ACCEPTING' || !correct) return done(false, false, `Không vào được ACCEPTING (${r.engine.state})`);

    // Bước 5: comment đi qua MockAdapter (đúng đường của nguồn thật), không gọi thẳng ingest.
    const delivered = adapter.emit({ eventId: 'selftest-1', userId: 'selftest-user', displayName: 'Tự kiểm', text: correct });
    const accepted = r.metrics.accepted === 1;
    if (!delivered || !accepted) return done(false, false, `Mock comment không được nhận (delivered=${delivered}, accepted=${r.metrics.accepted})`);

    // Bước 8: chốt câu → điểm vào sổ cái.
    for (let i = 0; i < 100 && r.engine.state === 'ACCEPTING'; i++) scheduler.advance(250);
    const totals = store.ledgerTotals(r.engine.round!.roundId);
    const score = totals.get('MOCK:selftest-user') ?? 0;
    const integrity = r.verifyIntegrity();
    const engineOk = score === 100 && integrity === null;
    return done(
      true,
      engineOk,
      engineOk ? 'Mock comment được nhận, chốt câu cộng đúng 100 điểm, sổ cái khớp' : `Điểm sau chốt câu = ${score}, toàn vẹn: ${integrity ?? 'OK'}`,
    );
  } catch (err) {
    return done(false, false, `Lỗi: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    rt?.dispose();
    store.close();
  }

  function done(mockComment: boolean, engineRecorded: boolean, detail: string): SelfTestResult {
    return { ok: mockComment && engineRecorded, mockComment, engineRecorded, detail, durationMs: Math.round(performance.now() - t0) };
  }
}
