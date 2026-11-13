/**
 * Mô phỏng một vòng MOCK hoàn chỉnh trên đồng hồ ảo, in bảng xếp hạng và kiểm toàn vẹn điểm.
 *   corepack pnpm simulate -- --players 100 --questions 15 --seed 42
 * DB tạm trong .tmp-test/ của repo, không đụng data/.
 */
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import type { CommandBody } from '@quiz/contracts';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { SessionRuntime } from '@quiz/server';
import { removeTestTempRoot, testTempRoot } from '../tests/support/repoTemp';

const { values } = parseArgs({
  args: process.argv.slice(2).filter((a) => a !== '--'),
  options: {
    players: { type: 'string', default: '100' },
    questions: { type: 'string', default: '15' },
    seed: { type: 'string', default: '42' },
    accuracy: { type: 'string', default: '0.6' },
  },
});
const players = Number(values.players);
const questionCount = Number(values.questions) as 10 | 15 | 20;
const seed = Number(values.seed);

const scheduler = new ManualScheduler();
const tempRoot = testTempRoot('quiz-sim-');
const dbPath = join(tempRoot, 'sim.db');
let store: Store | null = null;
let runtime: SessionRuntime | null = null;
let exitCode = 0;

try {
store = new Store(dbPath);
store.seedQuestions(
  { id: 'demo', name: 'Demo mô phỏng' },
  Array.from({ length: 60 }, (_, i) => ({
    id: `sim-q${i + 1}`,
    packId: 'demo',
    subtopicId: 'demo-sim',
    prompt: `Câu hỏi mô phỏng ${i + 1}?`,
    options: [1, 2, 3, 4].map((k) => ({ id: `o${k}`, text: `Phương án ${k}` })),
    correctOptionId: `o${(i % 4) + 1}`,
    difficulty: (['EASY', 'MEDIUM', 'HARD'] as const)[i % 3]!,
    verificationStatus: 'DEMO',
    approvalStatus: 'APPROVED',
  })),
  scheduler.now(),
);

runtime = await SessionRuntime.create(
  { store, scheduler, adapter: new MockAdapter() },
  {
    name: 'Mô phỏng',
    config: {
      mode: 'MOCK',
      packId: 'demo',
      questionsPerRound: questionCount,
      leaderboardInterval: 5,
      timings: {
        lobbyMs: 30_000, prepareMs: 3_000, answerMs: 15_000, revealMs: 4_000,
        leaderboardMs: 4_000, roundEndMs: 2_000, victoryMs: 18_000, intermissionMs: 25_000,
      },
      speedMultiplier: 1,
      allowDemoQuestions: true,
      seed,
      maxSourceLagMs: 5_000,
      audienceRotateEvery: 2,
      speedBonusMax: 50,
      scoringMode: 'KAHOOT',
      audiencePinTop: 3,
    },
  },
);
await Promise.resolve();

const send = (command: CommandBody) => {
  const out = runtime!.dispatch({
    commandId: randomUUID(),
    expectedStateVersion: runtime!.engine.stateVersion,
    operatorId: 'simulate-round',
    requestedAtMs: scheduler.now(),
    command,
  });
  if (!out.result.ok) throw new Error(`${command.type}: ${out.result.code} ${out.result.message}`);
};

runtime.simulatorControl({ action: 'START', players, accuracy: Number(values.accuracy), participation: 0.9, spamRate: 0.15, noiseRate: 0.1, seed });
send({ type: 'OPEN_LOBBY' });
send({ type: 'START_ROUND', questionCount });
const roundId = runtime.engine.round!.roundId;
let guard = 0;
while (runtime.engine.state !== 'VICTORY' && guard++ < 100_000) scheduler.advance(250);

const snap = runtime.adminSnapshot();
console.log(`Vòng ${roundId}: ${questionCount} câu, ${snap.public.participantCount} người tham gia`);
console.log('Chỉ số nhận comment:', JSON.stringify(snap.metrics));
console.log('\nTop 10:');
for (const e of snap.public.leaderboard?.entries ?? [])
  console.log(`  #${String(e.rank).padStart(2)}${e.tied ? '=' : ' '} ${e.safeDisplayName.padEnd(16)} ${String(e.score).padStart(5)} điểm  (${e.correctCount} đúng)`);
const podium = snap.public.podium!;
console.log(`\nBục: ${podium.slots.map((s) => `hạng ${s.rank}${s.tied ? ' (ĐỒNG HẠNG)' : ''}: ${s.entries.map((x) => x.safeDisplayName).join(', ')}`).join(' | ')}`);
const integrity = runtime.verifyIntegrity();
console.log(`\nToàn vẹn sổ cái: ${integrity ?? 'OK'}`);
if (integrity) exitCode = 1;
} finally {
  try {
    runtime?.dispose();
  } finally {
    try {
      store?.close();
    } finally {
      removeTestTempRoot(tempRoot);
    }
  }
}

process.exitCode = exitCode;
