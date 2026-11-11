import {
  INITIAL_TEST_SAFE_ZONE,
  SessionConfigSchema,
  type AdminSnapshot,
  type CommandBody,
  type CommandEnvelope,
  type CommandResult,
  type CreateSessionRequest,
  type GameState,
  type LeaderboardEntry,
  type PublicQuestion,
  type PublicSnapshot,
  type RejectReason,
  type SimulatorRequest,
} from '@quiz/contracts';
import type { CommandResponse, DashboardClient, SocketStatus } from './client';

const rejectReasons: RejectReason[] = [
  'INVALID_EVENT', 'NOT_AN_ANSWER', 'NOT_ACCEPTING', 'EARLY', 'LATE',
  'DUPLICATE_EVENT', 'DUPLICATE_ANSWER', 'STALE_SOURCE_TIMESTAMP',
];

const demoQuestion: PublicQuestion = {
  questionInstanceId: 'mock-question-1',
  index: 0,
  prompt: 'DEMO Free Fire: Trong chế độ Clash Squad, mỗi đội có bao nhiêu người?',
  options: [
    { id: 'A', text: '2 người' }, { id: 'B', text: '4 người' },
    { id: 'C', text: '3 người' }, { id: 'D', text: '5 người' },
  ],
  isDemo: true,
};

function makeLeaderboard(): LeaderboardEntry[] {
  return [
    { rank: 1, tied: false, playerId: 'demo-01', displayName: 'Chiến binh DEMO 01', score: 900, correctCount: 8 },
    { rank: 2, tied: false, playerId: 'demo-02', displayName: 'Chiến binh DEMO 02', score: 700, correctCount: 7 },
    { rank: 3, tied: false, playerId: 'demo-03', displayName: 'Chiến binh DEMO 03', score: 600, correctCount: 6 },
  ];
}

class MockDashboardClient implements DashboardClient {
  private config = SessionConfigSchema.parse({ mode: 'MOCK', allowDemoQuestions: true });
  private sessionId: string | null = null;
  private state: GameState = 'IDLE';
  private suspendedFrom: GameState | null = null;
  private stateVersion = 0;
  private questionIndex = 0;
  private roundNumber = 1;
  private autoMode = false;
  private simulator: { running: boolean; players: number } | null = null;
  private connection: 'CONNECTED' | 'BLOCKED' = 'CONNECTED';
  private answerCount = 0;
  private participantCount = 34;
  private optionCounts = { A: 4, B: 14, C: 3, D: 2 };
  private recentRejections: { atMs: number; reason: RejectReason }[] = [];
  private listeners = new Set<(snapshot: AdminSnapshot, serverTimeMs: number) => void>();
  private statusListeners = new Set<(status: SocketStatus) => void>();
  private commandResults = new Map<string, CommandResponse>();

  async currentSession() {
    return this.sessionId && this.snapshot().sessionStatus === 'OPEN' ? this.sessionId : null;
  }

  async createSession(_token: string, request: CreateSessionRequest) {
    if (!this.sessionId || this.snapshot().sessionStatus === 'CLOSED') {
      this.sessionId = `mock-session-${Date.now()}`;
      this.config = SessionConfigSchema.parse(request.config);
      this.state = 'IDLE';
      this.suspendedFrom = null;
      this.stateVersion = 0;
      this.questionIndex = 0;
      this.roundNumber = 1;
      this.answerCount = 0;
      this.participantCount = 34;
      this.optionCounts = { A: 4, B: 14, C: 3, D: 2 };
    }
    const snapshot = this.snapshot();
    this.emit();
    return { sessionId: this.sessionId!, snapshot };
  }

  async getState(_token: string, sessionId: string) {
    this.assertSession(sessionId);
    return this.snapshot();
  }

  async sendCommand(_token: string, sessionId: string, envelope: CommandEnvelope): Promise<CommandResponse> {
    this.assertSession(sessionId);
    const duplicate = this.commandResults.get(envelope.commandId);
    if (duplicate) return { status: duplicate.status, result: { ...duplicate.result, duplicate: true } };
    if (envelope.expectedStateVersion !== this.stateVersion) {
      return {
        status: 409,
        result: { ok: false, code: 'STALE_STATE_VERSION', message: 'Trạng thái đã thay đổi.', stateVersion: this.stateVersion, duplicate: false },
      };
    }
    if (this.isDangerous(envelope.command) && (envelope.command.reason?.trim().length ?? 0) < 3) {
      return {
        status: 422,
        result: { ok: false, code: 'VALIDATION_FAILED', message: 'Bắt buộc nêu lý do (≥ 3 ký tự)', stateVersion: this.stateVersion, duplicate: false },
      };
    }

    this.applyCommand(envelope.command);
    this.stateVersion += 1;
    const result: CommandResult = { ok: true, stateVersion: this.stateVersion, state: this.state, duplicate: false };
    const response = { status: 200, result };
    this.commandResults.set(envelope.commandId, response);
    this.emit();
    return response;
  }

  async controlSimulator(_token: string, sessionId: string, request: SimulatorRequest) {
    this.assertSession(sessionId);
    this.simulator = request.action === 'START' ? { running: true, players: request.players } : null;
    this.emit();
    return { ok: true, running: !!this.simulator, players: this.simulator?.players ?? 0 };
  }

  async controlConnection(_token: string, sessionId: string, action: 'LOSE' | 'RESTORE') {
    this.assertSession(sessionId);
    if (action === 'LOSE') {
      this.connection = 'BLOCKED';
      if (this.state === 'ACCEPTING') {
        this.suspendedFrom = this.state;
        this.state = 'CONNECTION_INTERRUPTED';
      }
    } else {
      this.connection = 'CONNECTED';
      // Có mạng lại không tự tiếp tục câu hỏi đang nhận đáp án.
    }
    this.stateVersion += 1;
    this.emit();
    return { ok: true, status: this.connection };
  }

  async sendComment(_token: string, sessionId: string, comment: { userId: string; displayName: string; text: string }) {
    this.assertSession(sessionId);
    if (this.state === 'ACCEPTING' && comment.text.trim().toUpperCase() in this.optionCounts) {
      const answer = comment.text.trim().toUpperCase() as keyof typeof this.optionCounts;
      this.optionCounts[answer] += 1;
      this.answerCount += 1;
      this.participantCount += 1;
    } else {
      this.recentRejections = [{ atMs: Date.now(), reason: 'NOT_ACCEPTING' as RejectReason }, ...this.recentRejections].slice(0, 20);
    }
    this.stateVersion += 1;
    this.emit();
    return { ok: true };
  }

  subscribe(_token: string, onSnapshot: (snapshot: AdminSnapshot, serverTimeMs: number) => void, onStatus: (status: SocketStatus) => void) {
    this.listeners.add(onSnapshot);
    this.statusListeners.add(onStatus);
    onStatus('connected');
    if (this.sessionId) onSnapshot(this.snapshot(), Date.now());
    return () => {
      this.listeners.delete(onSnapshot);
      this.statusListeners.delete(onStatus);
      onStatus('disconnected');
    };
  }

  private assertSession(sessionId: string) {
    if (!this.sessionId || sessionId !== this.sessionId) throw new Error('Không có phiên MOCK đang mở.');
  }

  private isDangerous(command: CommandBody) {
    return ['SKIP_QUESTION', 'VOID_QUESTION', 'RESTART_ROUND', 'STOP', 'RESOLVE_RECOVERY'].includes(command.type);
  }

  private applyCommand(command: CommandBody) {
    switch (command.type) {
      case 'OPEN_LOBBY': this.state = 'LOBBY'; break;
      case 'START_ROUND': this.questionIndex = 0; this.state = 'PREPARE'; break;
      case 'PAUSE': this.suspendedFrom = this.state; this.state = 'PAUSED'; break;
      case 'RESUME': this.state = this.suspendedFrom ?? 'PREPARE'; this.suspendedFrom = null; break;
      case 'MANUAL_NEXT': this.advance(); break;
      case 'NEXT_ROUND': this.roundNumber += 1; this.questionIndex = 0; this.state = 'PREPARE'; break;
      case 'SET_AUTO_MODE': this.autoMode = command.enabled; break;
      case 'SKIP_QUESTION': this.advanceQuestion(); break;
      case 'VOID_QUESTION': this.state = 'LEADERBOARD'; break;
      case 'RESTART_ROUND': this.questionIndex = 0; this.state = 'PREPARE'; break;
      case 'STOP': this.state = 'IDLE'; this.suspendedFrom = null; this.simulator = null; break;
      case 'RESOLVE_RECOVERY': this.applyRecovery(command.decision); break;
    }
  }

  private applyRecovery(decision: 'RESUME' | 'VOID' | 'STOP') {
    if (decision === 'RESUME') this.state = this.suspendedFrom ?? 'PREPARE';
    else if (decision === 'VOID') this.state = 'LEADERBOARD';
    else this.state = 'IDLE';
    this.suspendedFrom = null;
  }

  private advance() {
    if (this.state === 'PREPARE') this.state = 'ACCEPTING';
    else if (this.state === 'ACCEPTING') this.state = 'REVEAL';
    else if (this.state === 'REVEAL') this.state = this.questionIndex + 1 >= this.config.questionsPerRound ? 'ROUND_END' : 'LEADERBOARD';
    else if (this.state === 'LEADERBOARD') this.advanceQuestion();
  }

  private advanceQuestion() {
    this.questionIndex = Math.min(this.config.questionsPerRound - 1, this.questionIndex + 1);
    this.answerCount = 0;
    this.optionCounts = { A: 0, B: 0, C: 0, D: 0 };
    this.state = 'PREPARE';
  }

  private snapshot(): AdminSnapshot {
    const effectiveState = this.state === 'PAUSED' || this.state === 'CONNECTION_INTERRUPTED'
      ? this.suspendedFrom ?? this.state
      : this.state;
    const scene = this.state === 'CONNECTION_INTERRUPTED' ? 'CONNECTION_LOST' : this.sceneFor(effectiveState);
    const questionVisible = effectiveState === 'ACCEPTING' || effectiveState === 'REVEAL';
    const leaderboardEntries = makeLeaderboard();
    const questionState = effectiveState === 'PREPARE' || effectiveState === 'ACCEPTING';
    const publicSnapshot: PublicSnapshot = {
      contractVersion: 1,
      sessionId: this.sessionId ?? 'mock-session',
      stateVersion: this.stateVersion,
      state: this.state,
      scene,
      paused: this.state === 'PAUSED',
      mode: 'MOCK',
      timer: questionState || effectiveState === 'INTERMISSION'
        ? { durationMs: effectiveState === 'PREPARE' ? 3_000 : 15_000, remainingMs: effectiveState === 'PREPARE' ? 3_000 : 11_000, running: this.state !== 'PAUSED' && this.state !== 'CONNECTION_INTERRUPTED' }
        : null,
      round: { roundNumber: this.roundNumber, questionIndex: this.questionIndex, questionCount: this.config.questionsPerRound },
      question: questionVisible ? demoQuestion : null,
      answerCount: this.answerCount,
      participantCount: this.participantCount,
      reveal: effectiveState === 'REVEAL' ? {
        questionInstanceId: demoQuestion.questionInstanceId,
        correctOptionId: 'B',
        optionCounts: { ...this.optionCounts },
        explanation: 'Đây là câu hỏi DEMO; mỗi đội Clash Squad gồm 4 người.',
      } : null,
      leaderboard: effectiveState === 'REVEAL'
        ? { kind: 'COMPACT', entries: leaderboardEntries.slice(0, 3) }
        : ['LEADERBOARD', 'ROUND_END', 'VICTORY', 'INTERMISSION'].includes(effectiveState)
          ? { kind: 'FULL', entries: leaderboardEntries }
          : null,
      podium: ['ROUND_END', 'VICTORY'].includes(effectiveState) ? {
        slots: [
          { place: 2, rank: 2, tied: false, entries: [leaderboardEntries[1]!] },
          { place: 1, rank: 1, tied: false, entries: [leaderboardEntries[0]!] },
          { place: 3, rank: 3, tied: false, entries: [leaderboardEntries[2]!] },
        ],
        tieAcrossCutoff: false,
      } : null,
      connection: this.connection,
      safeZone: INITIAL_TEST_SAFE_ZONE,
    };
    return {
      public: publicSnapshot,
      sessionStatus: this.state === 'IDLE' && this.stateVersion > 0 ? 'CLOSED' : 'OPEN',
      autoMode: this.autoMode,
      recoveryPending: false,
      suspendedFrom: this.suspendedFrom,
      config: this.config,
      current: questionVisible || effectiveState === 'PREPARE' ? {
        questionInstanceId: demoQuestion.questionInstanceId,
        correctOptionId: 'B',
        optionCounts: { ...this.optionCounts },
        voided: false,
      } : null,
      metrics: {
        received: this.answerCount,
        accepted: this.answerCount,
        rejected: Object.fromEntries(rejectReasons.map((reason) => [reason, this.recentRejections.filter((item) => item.reason === reason).length])) as AdminSnapshot['metrics']['rejected'],
      },
      recentRejections: [...this.recentRejections],
      pool: { eligible: 36, unusedInSession: 36, requiredNextRound: this.config.questionsPerRound, lowPoolWarning: false },
      simulator: this.simulator,
      error: null,
    };
  }

  private sceneFor(state: GameState): PublicSnapshot['scene'] {
    switch (state) {
      case 'IDLE':
      case 'LOBBY': return 'LOBBY';
      case 'PREPARE':
      case 'ACCEPTING': return 'QUESTION';
      case 'REVEAL': return 'REVEAL';
      case 'LEADERBOARD': return 'INTERIM_TOP10';
      case 'ROUND_END': return 'ROUND_WINNER';
      case 'VICTORY': return 'VICTORY';
      case 'INTERMISSION': return 'INTERMISSION';
      case 'CONNECTION_INTERRUPTED':
      case 'ERROR': return 'CONNECTION_LOST';
      case 'PAUSED': return 'QUESTION';
    }
  }

  private emit() {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot, Date.now());
  }
}

export const mockClient = new MockDashboardClient();
