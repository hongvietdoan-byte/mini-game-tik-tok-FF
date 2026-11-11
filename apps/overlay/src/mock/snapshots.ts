import type { GameState, LeaderboardEntry, Podium, PublicSnapshot, Scene } from '@quiz/contracts';
import { INITIAL_TEST_SAFE_ZONE, type AudienceView } from '@quiz/contracts';
import { createSlots } from '@quiz/audience-engine';

/** Mã chibi theo kho tách nền (assets-local/chibi). Không có ảnh → overlay tự dùng hình giữ chỗ. */
const MOCK_CHIBI = ['chibi-002-a124', 'chibi-004-alvaro', 'chibi-005-andrew', 'chibi-006-antonio', 'chibi-007-caroline', 'chibi-008-clu',
  'chibi-009-d-bee', 'chibi-010-dasha', 'chibi-011-dimitri', 'chibi-012-ford', 'chibi-013-hayato', 'chibi-014-homer', 'chibi-015-ignis',
  'chibi-016-iris', 'chibi-017-joseph', 'chibi-018-jota', 'chibi-019-k', 'chibi-020-kairos', 'chibi-021-kapella', 'chibi-022-kassie'];

/** 35 ghế mock (tên hư cấu, gồm tên dài / emoji / chuỗi giống HTML) — toạ độ lấy từ cùng audience-engine như server. */
const MOCK_NAMES = [
  'StormKing', 'Rồng Lửa', 'BoomBoom', 'Choco.M', 'Hami', 'Nyla_xinch', 'Lophgg', 'my.mitmeo', 'coheo246', 'Diemmy',
  'ThuyTrang', 'Hồ Anh Tuấn', 'Mai Linh', 'kho kho', 'TEENHAYQUAYCUOP', 'Nhân cách', 'Tú Toàn', 'Huy Vũ', 'thảo cute', 'Bé cua 2k',
  'Phươngg', 'Xunx', 'Trần Khoa', 'sóng chó điên 99', '34a.', 'LMHxr76', 'Muốn học giỏi', 'Lananh', 'nguyenhuyen', 'Mai Trí Đức',
  'Hoài Thương', 'Choco Mutt', '<b>bó đái</b>', 'LNH 👨‍👩‍👧', 'Misu',
];
function mockAudience(withResults: boolean): AudienceView {
  const slots = createSlots();
  return {
    rotationId: 3,
    queued: 1213,
    total: 1248,
    seats: slots.map((slot, i) => ({
      ...slot,
      occupant: {
        displayName: MOCK_NAMES[i % MOCK_NAMES.length]!,
        characterId: MOCK_CHIBI[(i * 7) % MOCK_CHIBI.length]!,
        pinned: i < 3,
        result: withResults ? (i % 3 === 0 ? 'wrong' : i % 5 === 0 ? 'none' : 'correct') : null,
      },
    })),
  };
}

const leaderboard: LeaderboardEntry[] = Array.from({ length: 10 }, (_, index) => ({
  rank: index + 1,
  tied: false,
  playerId: `demo-player-${index + 1}`,
  displayName: index === 1 ? 'Chiến binh ⚡ DEMO dài dòng' : index === 2 ? '<script>window.__xss=1</script>' : index === 3 ? '<img src=x onerror="window.__xss=1">' : `Chiến binh DEMO ${String(index + 1).padStart(2, '0')}`,
  score: 1_500 - index * 100,
  correctCount: 15 - index,
  characterId: ['chibi-020-kairos', 'chibi-016-iris', 'chibi-013-hayato', 'chibi-007-caroline', 'chibi-012-ford', 'chibi-009-d-bee', 'chibi-010-dasha', 'chibi-002-a124', 'chibi-017-joseph', 'chibi-021-kapella'][index]!,
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
    audience: ['lobby', 'prepare', 'question', 'reveal', 'paused'].includes(name) ? mockAudience(name === 'reveal') : null,
    safeZone: INITIAL_TEST_SAFE_ZONE,
  };
}

export const MOCK_SCENES = Object.keys(sceneMap);
