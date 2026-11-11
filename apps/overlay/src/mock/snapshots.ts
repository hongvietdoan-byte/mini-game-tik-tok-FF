import type { GameState, LeaderboardEntry, Podium, PublicSnapshot, Scene } from '@quiz/contracts';
import { INITIAL_TEST_SAFE_ZONE } from '@quiz/contracts';

const leaderboard: LeaderboardEntry[] = Array.from({ length: 10 }, (_, index) => ({
  rank: index + 1,
  tied: false,
  playerId: `demo-player-${index + 1}`,
  displayName: index === 1 ? 'Chiến binh ⚡ DEMO dài dòng' : index === 2 ? '<script>window.__xss=1</script>' : index === 3 ? '<img src=x onerror="window.__xss=1">' : `Chiến binh DEMO ${String(index + 1).padStart(2, '0')}`,
  score: 1_500 - index * 100,
  correctCount: 15 - index,
}));

const options = [
  { id: 'A' as const, text: '2 người' },
  { id: 'B' as const, text: '4 người' },
  { id: 'C' as const, text: '3 người' },
  { id: 'D' as const, text: '5 người' },
];

const sceneMap: Record<string, { scene: Scene; state: GameState }> = {
  lobby: { scene: 'LOBBY', state: 'LOBBY' },
  prepare: { scene: 'QUESTION', state: 'PREPARE' },
  question: { scene: 'QUESTION', state: 'ACCEPTING' },
  // Hợp đồng V3: LEADERBOARD ngắn giữ scene REVEAL để vẫn hiện đáp án + Top 10 gọn.
  reveal: { scene: 'REVEAL', state: 'LEADERBOARD' },
  top10: { scene: 'INTERIM_TOP10', state: 'LEADERBOARD' },
  'top10-short': { scene: 'INTERIM_TOP10', state: 'LEADERBOARD' },
  'round-winner': { scene: 'ROUND_WINNER', state: 'ROUND_END' },
  victory: { scene: 'VICTORY', state: 'VICTORY' },
  'victory-tie': { scene: 'VICTORY', state: 'VICTORY' },
  intermission: { scene: 'INTERMISSION', state: 'INTERMISSION' },
  'connection-lost': { scene: 'CONNECTION_LOST', state: 'CONNECTION_INTERRUPTED' },
  paused: { scene: 'QUESTION', state: 'PAUSED' },
};

function podium(tied: boolean): Podium {
  const tiedEntries: LeaderboardEntry[] = [
    { ...leaderboard[0]!, rank: 1, tied: true },
    { ...leaderboard[1]!, rank: 1, tied: true, score: leaderboard[0]!.score, correctCount: leaderboard[0]!.correctCount },
  ];
  const entries = tied ? tiedEntries : [leaderboard[0]!];
  return {
    tieAcrossCutoff: tied,
    slots: [
      { place: 2, rank: tied ? 1 : 2, tied, entries: tied ? tiedEntries : [leaderboard[1]!] },
      { place: 1, rank: 1, tied, entries },
      { place: 3, rank: 3, tied: false, entries: [leaderboard[2]!] },
    ],
  };
}

export function makeMockSnapshot(name: string): PublicSnapshot | null {
  const mapped = sceneMap[name];
  if (!mapped) return null;
  const short = name === 'top10-short';
  const question = name === 'prepare' || name === 'question' || name === 'reveal' || name === 'paused';
  const optionsVisible = name !== 'prepare';
  const isReveal = name === 'reveal';
  return {
    contractVersion: 1,
    sessionId: 'demo-session',
    stateVersion: 1,
    state: mapped.state,
    scene: mapped.scene,
    paused: name === 'paused',
    mode: 'MOCK',
    timer: { durationMs: 15_000, remainingMs: name === 'prepare' ? 3_000 : 12_000, running: name !== 'paused' },
    round: { roundNumber: 1, questionIndex: 4, questionCount: 15 },
    question: question ? {
      questionInstanceId: 'demo-question-5',
      index: 4,
      prompt: 'Free Fire · Trong chế độ Clash Squad, mỗi đội có bao nhiêu người?',
      options: optionsVisible ? options : [],
      optionsVisible,
      isDemo: true,
    } : null,
    answerCount: name === 'prepare' ? 0 : 42,
    participantCount: short ? 3 : 57,
    reveal: isReveal ? {
      questionInstanceId: 'demo-question-5',
      correctOptionId: 'B',
      optionCounts: { A: 5, B: 19, C: 12, D: 6 },
      explanation: 'DEMO Free Fire: chế độ Clash Squad có 4 người trong mỗi đội.',
    } : null,
    leaderboard: question
      ? { kind: 'COMPACT', entries: leaderboard.slice(0, 10) }
      : ['top10', 'top10-short', 'round-winner', 'victory', 'victory-tie'].includes(name)
        ? { kind: name === 'top10' || name === 'top10-short' ? 'FULL' : 'COMPACT', entries: short ? leaderboard.slice(0, 3) : leaderboard.slice(0, name === 'round-winner' ? 3 : 10) }
        : null,
    podium: name === 'victory' || name === 'victory-tie' ? podium(name === 'victory-tie') : null,
    connection: name === 'connection-lost' ? 'BLOCKED' : 'CONNECTED',
    mc: {
      state: name === 'prepare' ? 'ask' : isReveal ? 'react' : 'idle',
      bubble: name === 'prepare' ? 'Sẵn sàng nhé! Câu hỏi Free Fire sắp bắt đầu.' : 'Bình luận A, B, C hoặc D để tham gia.',
    },
    audience: null, // TODO(codex2): mock 35 ghế (AudienceView) khi làm lớp khán giả
    safeZone: INITIAL_TEST_SAFE_ZONE,
  };
}

export const MOCK_SCENES = Object.keys(sceneMap);
