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

const mockTopNames = ['FFVN.Kelly', 'StormKing', 'BVD.Champion', 'Choco.M', 'Hami', 'Nyla_xinch', 'Lophgg', 'my.mitmeo', 'coheo246', 'Diemmy'];
const mockTopScores = [1_500, 1_350, 1_300, 1_220, 1_180, 1_160, 1_120, 1_100, 1_080, 1_060];
const leaderboard: LeaderboardEntry[] = Array.from({ length: 10 }, (_, index) => ({
  rank: index + 1,
  tied: false,
  playerId: `demo-player-${index + 1}`,
  displayName: mockTopNames[index]!,
  score: mockTopScores[index]!,
  correctCount: 15 - index,
  ...(index === 0 ? { top1Streak: 3 } : {}),
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
  reading: { scene: 'QUESTION', state: 'READING' },
  'reading-longest': { scene: 'QUESTION', state: 'READING' },
  question: { scene: 'QUESTION', state: 'ACCEPTING' },
  'question-long-name': { scene: 'QUESTION', state: 'ACCEPTING' },
  'question-longest': { scene: 'QUESTION', state: 'ACCEPTING' },
  'question-long-answer': { scene: 'QUESTION', state: 'ACCEPTING' },
  'question-clamp-text': { scene: 'QUESTION', state: 'ACCEPTING' },
  // Hợp đồng V3: LEADERBOARD ngắn giữ scene REVEAL để vẫn hiện đáp án + Top 10 gọn.
  reveal: { scene: 'REVEAL', state: 'LEADERBOARD' },
  'reveal-clamp-text': { scene: 'REVEAL', state: 'LEADERBOARD' },
  'fastest-a': { scene: 'REVEAL', state: 'LEADERBOARD' },
  'fastest-a-long': { scene: 'REVEAL', state: 'LEADERBOARD' },
  'fastest-b': { scene: 'REVEAL', state: 'LEADERBOARD' },
  top10: { scene: 'INTERIM_TOP10', state: 'LEADERBOARD' },
  'top10-short': { scene: 'INTERIM_TOP10', state: 'LEADERBOARD' },
  'top10-long-name': { scene: 'INTERIM_TOP10', state: 'LEADERBOARD' },
  'top10-xss': { scene: 'INTERIM_TOP10', state: 'LEADERBOARD' },
  'round-winner': { scene: 'ROUND_WINNER', state: 'ROUND_END' },
  victory: { scene: 'VICTORY', state: 'VICTORY' },
  'victory-tie': { scene: 'VICTORY', state: 'VICTORY' },
  'victory-name-test': { scene: 'VICTORY', state: 'VICTORY' },
  intermission: { scene: 'INTERMISSION', state: 'INTERMISSION' },
  'connection-lost': { scene: 'CONNECTION_LOST', state: 'CONNECTION_INTERRUPTED' },
  paused: { scene: 'QUESTION', state: 'PAUSED' },
};

function podium(tied: boolean): Podium {
  const first = { ...leaderboard[0]!, displayName: 'FFVN.Kelly', score: 1_500 };
  const second = { ...leaderboard[1]!, displayName: 'StormKing', score: tied ? 1_500 : 1_350 };
  const third = { ...leaderboard[2]!, displayName: 'BVD.Champion', score: 1_300 };
  return {
    tieAcrossCutoff: tied,
    slots: [
      { place: 2, rank: tied ? 1 : 2, tied, entries: [{ ...second, rank: tied ? 1 : 2, tied, correctCount: tied ? first.correctCount : second.correctCount }] },
      { place: 1, rank: 1, tied, entries: [{ ...first, rank: 1, tied }] },
      { place: 3, rank: 3, tied: false, entries: [third] },
    ],
  };
}

function victoryNameTestPodium(): Podium {
  const demo = podium(true);
  return {
    ...demo,
    slots: demo.slots.map((slot) => {
      const entries = slot.entries.map((entry) => ({ ...entry, displayName: 'BVD.Championship' }));
      return {
        ...slot,
        entries: slot.place === 3
          ? [...entries, { ...entries[0]!, playerId: 'demo-player-long-name', displayName: 'BVD.ChampionshipXYZ' }]
          : entries,
      };
    }),
  };
}

function firstGraphemes(text: string, count: number): string {
  return Array.from(new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(text), (part) => part.segment)
    .slice(0, count)
    .join('');
}

export function makeMockSnapshot(name: string): PublicSnapshot | null {
  const mapped = sceneMap[name];
  if (!mapped) return null;
  const short = name === 'top10-short';
  const isFastestMock = name === 'fastest-a' || name === 'fastest-a-long' || name === 'fastest-b';
  const question = ['prepare', 'reading', 'reading-longest', 'question', 'question-long-name', 'question-longest', 'question-long-answer', 'question-clamp-text', 'reveal', 'reveal-clamp-text', 'fastest-a', 'fastest-a-long', 'fastest-b', 'paused'].includes(name);
  const longestPrompt = 'Trong Battle Royale, bạn đang đi cùng đồng đội, nhặt trang bị và theo dõi vùng an toàn đang thu hẹp. Mục tiêu tổng quát nào mô tả đúng điều cần đạt để thắng trận, thay vì chỉ hoàn thành một hành động phụ như nhặt đồ?';
  const squadPrompt = 'Trong giao tiếp của trò chơi, từ “squad” thường chỉ điều gì khi người chơi cùng nhau tham gia một trận?';
  const longestAnswer = 'Một nhóm vật phẩm được sắp xếp trong hành trang';
  const clampPrompt = firstGraphemes(
    'Trong Free Fire, đội chơi cần phối hợp di chuyển, thu thập trang bị, theo dõi vùng an toàn và chọn thời điểm giao tranh hợp lý để tăng cơ hội sống sót đến cuối trận. '.repeat(4),
    220,
  );
  const clampAnswer = firstGraphemes(
    'Phối hợp với đồng đội để di chuyển an toàn, thu thập trang bị phù hợp và lựa chọn thời điểm giao tranh có lợi trong suốt trận đấu Free Fire. '.repeat(2),
    80,
  );
  const longestAnswerOptions = [
    { id: 'A' as const, text: 'Một nhóm đồng đội phối hợp trong trận' },
    { id: 'B' as const, text: 'Một nhóm khán giả cùng theo dõi trận đấu' },
    { id: 'C' as const, text: longestAnswer },
    { id: 'D' as const, text: 'Một nhóm nhân vật được hiển thị trong bộ sưu tập' },
  ];
  const clampOptions = [
    { id: 'A' as const, text: 'Tách khỏi đội và giao tranh ngay khi vừa tiếp đất.' },
    { id: 'B' as const, text: clampAnswer },
    { id: 'C' as const, text: 'Chỉ thu thập trang bị mà không quan tâm đến vùng an toàn.' },
    { id: 'D' as const, text: 'Bỏ qua vùng an toàn để tiếp tục nhặt thêm trang bị.' },
  ];
  const optionsVisible = name !== 'prepare';
  const isReveal = name === 'reveal' || name === 'reveal-clamp-text' || isFastestMock;
  const visibleLeaderboard = name === 'question-long-name' || name === 'top10-long-name'
    ? leaderboard.map((entry, index) => index === 0
      ? { ...entry, displayName: name === 'top10-long-name' ? 'StormKingAlpha' : 'FFVN.Kelly · Nhà vô địch Bá Vương Đại Chiến' }
      : entry)
    : name === 'top10-xss'
      ? leaderboard.map((entry, index) => index === 2
        ? { ...entry, displayName: '<script>window.__xss=1</script>' }
        : index === 3
          ? { ...entry, displayName: '<img src=x onerror="window.__xss=1">' }
          : entry)
      : leaderboard;
  return {
    contractVersion: 1,
    sessionId: 'demo-session',
    stateVersion: 1,
    state: mapped.state,
    scene: mapped.scene,
    paused: name === 'paused',
    mode: 'MOCK',
    timer: {
      durationMs: name === 'reading' || name === 'reading-longest' ? 20_000 : 15_000,
      remainingMs: name === 'prepare' ? 3_000 : name === 'reading' || name === 'reading-longest' ? 19_000 : 12_000,
      running: name !== 'paused',
    },
    round: { roundNumber: 1, questionIndex: 4, questionCount: 15 },
    question: question ? {
      questionInstanceId: 'demo-question-5',
      index: 4,
      prompt: name === 'question-clamp-text' || name === 'reveal-clamp-text'
        ? clampPrompt
        : name === 'question-longest' || name === 'reading-longest'
        ? longestPrompt
        : name === 'question-long-answer'
          ? squadPrompt
          : 'Free Fire · Trong chế độ Clash Squad, mỗi đội có bao nhiêu người?',
      options: optionsVisible ? (name === 'question-clamp-text' || name === 'reveal-clamp-text' ? clampOptions : name === 'question-long-answer' ? longestAnswerOptions : options) : [],
      optionsVisible,
      isDemo: true,
    } : null,
    answerCount: name === 'prepare' || name === 'reading' ? 0 : 42,
    participantCount: short ? 3 : 57,
    reveal: isReveal ? {
      questionInstanceId: 'demo-question-5',
      correctOptionId: 'B',
      optionCounts: { A: 5, B: 19, C: 12, D: 6 },
      explanation: 'DEMO Free Fire: chế độ Clash Squad có 4 người trong mỗi đội.',
    } : null,
    leaderboard: question
      ? { kind: 'COMPACT', entries: visibleLeaderboard.slice(0, 10) }
      : ['top10', 'top10-short', 'top10-long-name', 'top10-xss', 'round-winner', 'victory', 'victory-tie'].includes(name)
        ? { kind: name === 'top10' || name === 'top10-short' || name === 'top10-long-name' || name === 'top10-xss' ? 'FULL' : 'COMPACT', entries: short ? visibleLeaderboard.slice(0, 3) : visibleLeaderboard.slice(0, name === 'round-winner' ? 3 : 10) }
        : null,
    podium: name === 'victory-name-test'
      ? victoryNameTestPodium()
      : name === 'victory' || name === 'victory-tie'
        ? podium(name === 'victory-tie')
        : null,
    connection: name === 'connection-lost' ? 'BLOCKED' : 'CONNECTED',
    mc: {
      state: name === 'prepare' || name === 'reading' || name === 'reading-longest' ? 'ask' : isReveal ? 'react' : 'idle',
      bubble: isReveal
        ? 'Chính xác! Đáp án B. Cùng xem bảng xếp hạng nhé!'
        : name === 'reading' || name === 'reading-longest'
          ? 'Cùng nghe câu hỏi và bốn đáp án nhé!'
        : name === 'prepare'
          ? 'Sẵn sàng nhé! Câu hỏi Free Fire sắp bắt đầu.'
          : 'Trả lời bằng cách\ncomment A, B, C hoặc D\nđể tham gia ngay!',
    },
    audience: ['lobby', 'prepare', 'reading', 'reading-longest', 'question', 'question-long-name', 'question-longest', 'question-long-answer', 'question-clamp-text', 'reveal', 'reveal-clamp-text', 'fastest-a', 'fastest-a-long', 'fastest-b', 'paused'].includes(name) ? mockAudience(isReveal) : null,
    safeZone: INITIAL_TEST_SAFE_ZONE,
    ...({ fastestCorrectAnswer: isFastestMock ? {
      questionInstanceId: 'demo-question-5',
      publicPlayerId: leaderboard[1]!.playerId,
      seatId: mockAudience(true).seats.find((seat) => seat.occupant?.displayName === 'StormKing')?.slotId ?? null,
      safeDisplayName: name === 'fastest-a-long' ? 'StormKingChampion123456' : 'StormKing',
      responseMs: name === 'fastest-a-long' ? 12_300 : 1_240,
    } : null }),
  } as PublicSnapshot;
}

export const MOCK_SCENES = Object.keys(sceneMap);
