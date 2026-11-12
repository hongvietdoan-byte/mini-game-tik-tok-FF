import type { OverlayAudioState } from '@quiz/contracts';

export type OverlayRole = 'program' | 'preview';
export type OverlaySession = {
  role: OverlayRole;
  roleLocked: boolean;
  ack: { stateVersion: number; atMs: number } | null;
  audioState: OverlayAudioState | null;
};

/** Đăng ký client mới ở preview cho tới ACK đầu tiên khai báo role. */
export function registerOverlaySession<Client>(sessions: Map<Client, OverlaySession>, client: Client) {
  sessions.set(client, { role: 'preview', roleLocked: false, ack: null, audioState: null });
}

/** Ghim role theo ACK đầu tiên; ACK sau phải giữ đúng role của kết nối. */
export function recordOverlayAck<Client>(
  sessions: Map<Client, OverlaySession>,
  client: Client,
  ack: { role: OverlayRole; stateVersion: number; audioState?: OverlayAudioState },
  atMs: number,
) {
  const session = sessions.get(client);
  if (!session || (session.roleLocked && session.role !== ack.role)) return false;
  if (!session.roleLocked) {
    session.role = ack.role;
    session.roleLocked = true;
  }
  if (!session.ack || ack.stateVersion >= session.ack.stateVersion) {
    session.ack = { stateVersion: ack.stateVersion, atMs };
    if (ack.audioState !== undefined) session.audioState = ack.audioState;
  }
  return true;
}

export function removeOverlaySession<Client>(sessions: Map<Client, OverlaySession>, client: Client) {
  sessions.delete(client);
}

export function summarizeOverlaySessions<Client>(sessions: Map<Client, OverlaySession>) {
  const programs = [...sessions.values()].filter((session) => session.roleLocked && session.role === 'program');
  const acknowledgedPrograms = programs.flatMap((session) => session.ack ? [session.ack.stateVersion] : []);
  const programAudioStates = programs.flatMap((session) => session.audioState ? [session.audioState] : []);
  const audioStatePriority: OverlayAudioState[] = ['unavailable', 'suspended', 'running', 'disabled'];
  return {
    clients: sessions.size,
    programClients: programs.length,
    programAckStateVersion: acknowledgedPrograms.length > 0
      ? acknowledgedPrograms.reduce((highest, version) => Math.max(highest, version), 0)
      : null,
    programAudioState: audioStatePriority.find((state) => programAudioStates.includes(state)) ?? null,
  };
}
