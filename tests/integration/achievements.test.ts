import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { CreateSessionRequestSchema } from '@quiz/contracts';
import { ManualScheduler, MockAdapter } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { SessionRuntime } from '@quiz/server';
import { makeQuestions } from './helpers';
import { removeTestTempRoot, testTempRoot } from '../support/repoTemp';

const roots: string[] = [];
const runtimes: SessionRuntime[] = [];
const stores: Store[] = [];
afterEach(() => {
  for (const runtime of runtimes.splice(0).reverse()) runtime.dispose();
  for (const store of stores.splice(0).reverse()) store.close();
  for (const root of roots.splice(0)) removeTestTempRoot(root);
});

describe('V5 achievement runtime integration', () => {
  it('MOCK 15 câu × 100 người khớp bản tính độc lập và recovery chỉ đọc revision mới nhất', async () => {
    const root = testTempRoot('achievement-round-');
    roots.push(root);
    const store = new Store(join(root, 'quiz.db'));
    stores.push(store);
    const scheduler = new ManualScheduler();
    store.seedQuestions({ id: 'demo', name: 'Bộ test độc lập' }, makeQuestions(40), scheduler.now());
    const adapter = new MockAdapter();
    const request = CreateSessionRequestSchema.parse({
      name: 'Achievement reference 15x100',
      config: {
        mode: 'MOCK', packId: 'demo', questionsPerRound: 15, leaderboardInterval: 5,
        allowDemoQuestions: true, seed: 2_611_118,
        timings: { lobbyMs: 0, prepareMs: 500, answerMs: 3_000, revealMs: 500, leaderboardMs: 500, roundEndMs: 0, victoryMs: 1_000, intermissionMs: 1_000 },
      },
    });
    let runtime = await SessionRuntime.create({ store, scheduler, adapter }, request);
    runtimes.push(runtime);
    await Promise.resolve();
    runtime.simulatorControl({ action: 'START', players: 100, accuracy: 0.65, participation: 1, spamRate: 0, noiseRate: 0, seed: 73_111 });
    const send = (command: { type: 'OPEN_LOBBY' } | { type: 'START_ROUND'; questionCount: 15 }) => {
      const result = runtime.dispatch({
        commandId: randomUUID(), expectedStateVersion: runtime.engine.stateVersion, operatorId: 'achievement-integration',
        requestedAtMs: scheduler.now(), command,
      });
      if (!result.result.ok) throw new Error(`${command.type}: ${result.result.code} ${result.result.message}`);
    };
    send({ type: 'OPEN_LOBBY' });
    send({ type: 'START_ROUND', questionCount: 15 });
    let steps = 0;
    while (runtime.engine.state !== 'VICTORY' && steps < 100_000) {
      scheduler.advance(250);
      steps += 1;
    }
    expect(runtime.engine.state).toBe('VICTORY');

    const roundId = runtime.engine.round!.roundId;
    const questionRows = store.roundQuestions(roundId).sort((a, b) => a.position - b.position);
    expect(questionRows).toHaveLength(15);
    expect(questionRows.every((question) => question.status === 'CLOSED' || question.status === 'VOIDED')).toBe(true);

    // Bản tính tham chiếu độc lập: chỉ đọc answers, question status và ledger CORRECT/reversal.
    const rawAnswers = store.raw.prepare(
      'SELECT question_instance_id AS questionId, player_id AS playerId FROM answers WHERE round_id = ? ORDER BY id',
    ).all(roundId) as { questionId: string; playerId: string }[];
    const events = store.ledgerRows(roundId);
    const answerSets = new Map<string, Set<string>>();
    for (const answer of rawAnswers) {
      const set = answerSets.get(answer.playerId) ?? new Set<string>();
      set.add(answer.questionId);
      answerSets.set(answer.playerId, set);
    }
    const correctNet = new Map<string, number>();
    for (const event of events) {
      if (event.reason !== 'CORRECT' && event.reason !== 'VOID_REVERSAL:CORRECT') continue;
      const key = `${event.questionInstanceId}\u0000${event.playerId}`;
      correctNet.set(key, (correctNet.get(key) ?? 0) + (event.reason === 'CORRECT' ? 1 : -1));
    }
    const validQuestions = questionRows.filter((question) => question.status === 'CLOSED');
    const correctByPlayer = new Map<string, number>();
    const streakByPlayer = new Map<string, number>();
    const answeredQuestionsByPlayer = new Map<string, Set<string>>();
    for (const answer of rawAnswers) {
      if (!validQuestions.some((question) => question.id === answer.questionId)) continue;
      const answered = answeredQuestionsByPlayer.get(answer.playerId) ?? new Set<string>();
      answered.add(answer.questionId);
      answeredQuestionsByPlayer.set(answer.playerId, answered);
      if ((correctNet.get(`${answer.questionId}\u0000${answer.playerId}`) ?? 0) > 0)
        correctByPlayer.set(answer.playerId, (correctByPlayer.get(answer.playerId) ?? 0) + 1);
    }
    for (const [playerId, answered] of answeredQuestionsByPlayer) {
      const firstPosition = Math.min(...questionRows.filter((question) => answered.has(question.id)).map((question) => question.position));
      let current = 0;
      let best = 0;
      for (const question of validQuestions) {
        if (question.position < firstPosition) continue;
        const isCorrect = answered.has(question.id) && (correctNet.get(`${question.id}\u0000${playerId}`) ?? 0) > 0;
        current = isCorrect ? current + 1 : 0;
        best = Math.max(best, current);
      }
      streakByPlayer.set(playerId, best);
    }
    const roundScopeId = roundId;
    const longest = store.latestRankingSnapshot(roundId, 'ROUND', roundScopeId, 'LONGEST_STREAK')!;
    const mostCorrect = store.latestRankingSnapshot(roundId, 'ROUND', roundScopeId, 'MOST_CORRECT')!;
    const fullParticipation = store.latestRankingSnapshot(roundId, 'ROUND', roundScopeId, 'FULL_PARTICIPATION')!;
    const firstCorrect = store.latestRankingSnapshot(roundId, 'ROUND', roundScopeId, 'FIRST_CORRECT')!;
    const binary = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
    const expectedStreak = [...streakByPlayer].filter(([, value]) => value >= 3)
      .map(([playerId, metricValue]) => ({ playerId, metricValue })).sort((a, b) => b.metricValue - a.metricValue || binary(a.playerId, b.playerId)).slice(0, 3);
    const expectedCorrect = [...correctByPlayer].filter(([, value]) => value > 0)
      .map(([playerId, metricValue]) => ({ playerId, metricValue })).sort((a, b) => b.metricValue - a.metricValue || binary(a.playerId, b.playerId)).slice(0, 5);
    expect(longest.entries.map(({ playerId, metricValue }) => ({ playerId, metricValue }))).toEqual(expectedStreak);
    expect(mostCorrect.entries.map(({ playerId, metricValue }) => ({ playerId, metricValue }))).toEqual(expectedCorrect);
    expect(fullParticipation.aggregateCount).toBe([...answeredQuestionsByPlayer.values()].filter((set) => set.size === validQuestions.length).length);
    expect(firstCorrect.aggregateCount).toBe([...correctByPlayer.values()].filter((count) => count > 0).length);

    const history = store.leaderboardHistory(roundId);
    const latestByQuestion = new Map<string, typeof history[number]>();
    for (const snapshot of history) if (snapshot.questionInstanceId) latestByQuestion.set(snapshot.questionInstanceId, snapshot);
    for (let stageIndex = 0; stageIndex < 3; stageIndex += 1) {
      const firstPosition = stageIndex * 5;
      const stageRows = validQuestions.filter((question) => question.position >= firstPosition && question.position < firstPosition + 5);
      const stageIds = new Set(stageRows.map((question) => question.id));
      const perfectPlayers = [...answeredQuestionsByPlayer].filter(([playerId, answered]) => {
        if (stageIds.size === 0 || [...stageIds].some((questionId) => !answered.has(questionId))) return false;
        return [...stageIds].every((questionId) => (correctNet.get(`${questionId}\u0000${playerId}`) ?? 0) > 0);
      }).length;
      const perfect = store.latestRankingSnapshot(roundId, 'STAGE', `STAGE_${stageIndex + 1}`, 'PERFECT_STAGE')!;
      expect(perfect.aggregateCount).toBe(perfectPlayers);
      if (stageIndex === 0) {
        expect(store.latestRankingSnapshot(roundId, 'STAGE', 'STAGE_1', 'COMEBACK')).toBeNull();
        continue;
      }

      const boundarySnapshot = (position: number) => {
        for (let candidate = Math.min(position, 14); candidate >= 0; candidate -= 1) {
          const snapshot = latestByQuestion.get(questionRows[candidate]!.id);
          if (snapshot) return snapshot;
        }
        return undefined;
      };
      const before = boundarySnapshot(firstPosition - 1);
      const after = boundarySnapshot(firstPosition + 4);
      const beforeRanks = new Map(before?.entries.map((entry) => [entry.playerId, entry.rank]) ?? []);
      const afterEntries = after?.entries ?? [];
      const comeback = afterEntries.flatMap((entry) => {
        const rankBefore = beforeRanks.get(entry.playerId);
        const answeredStage = rawAnswers.filter((answer) => stageIds.has(answer.questionId) && answer.playerId === entry.playerId).length;
        const metricValue = rankBefore === undefined ? 0 : rankBefore - entry.rank;
        return rankBefore !== undefined && metricValue > 0 && answeredStage >= 3 ? [{ playerId: entry.playerId, metricValue }] : [];
      }).sort((a, b) => b.metricValue - a.metricValue || binary(a.playerId, b.playerId)).slice(0, 3);
      const snapshot = store.latestRankingSnapshot(roundId, 'STAGE', `STAGE_${stageIndex + 1}`, 'COMEBACK')!;
      expect(snapshot.entries.map(({ playerId, metricValue }) => ({ playerId, metricValue }))).toEqual(comeback);
    }

    const revisionsBefore = store.raw.prepare(
      `SELECT achievement_id AS achievementId, scope_id AS scopeId, MAX(revision) AS revision
       FROM ranking_snapshots WHERE round_id = ? GROUP BY achievement_id, scope_id ORDER BY achievement_id, scope_id`,
    ).all(roundId);
    expect(runtime.publicSnapshot().achievementSnapshots?.every((snapshot) => snapshot.revision > 0)).toBe(true);
    const priorSessionId = runtime.id;
    runtime.dispose();
    const recovered = await SessionRuntime.recover({ store, scheduler, adapter: new MockAdapter() }, store.getSession(priorSessionId)!);
    runtimes.push(recovered);
    const revisionsAfter = store.raw.prepare(
      `SELECT achievement_id AS achievementId, scope_id AS scopeId, MAX(revision) AS revision
       FROM ranking_snapshots WHERE round_id = ? GROUP BY achievement_id, scope_id ORDER BY achievement_id, scope_id`,
    ).all(roundId);
    expect(revisionsAfter).toEqual(revisionsBefore);
    expect(store.currentAchievementAwards(roundId, 'ROUND', roundId, 'MOST_CORRECT').every((row) => row.revision === mostCorrect.revision)).toBe(true);
  }, 60_000);
});
