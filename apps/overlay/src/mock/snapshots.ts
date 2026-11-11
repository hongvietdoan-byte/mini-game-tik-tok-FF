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
  { id: 'A' as const, text: 'Đáp án A · lựa chọn thử nghiệm' },
  { id: 'B' as const, text: 'Đáp án B · lựa chọn nổi bật' },
  { id: 'C' as const, text: 'Đáp án C · kiến thức tổng hợp' },
  { id: 'D' as const, text: 'Đáp án D · câu trả lời cuối' },
];

const sceneMap: Record<string, { scene: Scene; state: GameState }> = {
  lobby: { scene: 'LOBBY', state: 'LOBBY' },
  prepare: { scene: 'QUESTION', state: 'PREPARE' },
  question: { scene: 'QUESTION', state: 'ACCEPTING' },
  reveal: { scene: 'REVEAL', state: 'REVEAL' },
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
  const question = name === 'question' || name === 'reveal' || name === 'paused';
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
      prompt: 'Trong chế độ thử nghiệm, lựa chọn nào đại diện cho đáp án mẫu?',
      options,
      optionsVisible: true,
      isDemo: true,
    } : null,
    answerCount: 42,
    participantCount: short ? 3 : 57,
    reveal: isReveal ? {
      questionInstanceId: 'demo-question-5',
      correctOptionId: 'C',
      optionCounts: { A: 5, B: 12, C: 19, D: 6 },
      explanation: 'Đây là câu hỏi DEMO để kiểm tra cách trình bày phần giải thích.',
    } : null,
    leaderboard: ['top10', 'top10-short', 'round-winner', 'victory', 'victory-tie'].includes(name)
      ? { kind: name === 'top10' || name === 'top10-short' ? 'FULL' : 'COMPACT', entries: short ? leaderboard.slice(0, 3) : leaderboard.slice(0, name === 'round-winner' ? 3 : 10) }
      : null,
    podium: name === 'victory' || name === 'victory-tie' ? podium(name === 'victory-tie') : null,
    connection: name === 'connection-lost' ? 'BLOCKED' : 'CONNECTED',
    // TODO(codex2, C-0016): mock theo hợp đồng mới — PREPARE options rỗng, Top 10 COMPACT trong cảnh câu hỏi, lời thoại MC.
    mc: { state: 'idle', bubble: 'Bình luận A/B/C/D để tham gia' },
    safeZone: INITIAL_TEST_SAFE_ZONE,
  };
}

export const MOCK_SCENES = Object.keys(sceneMap);
