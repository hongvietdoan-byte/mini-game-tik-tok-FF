import { useEffect, useRef, useState } from 'react';
import type { PublicSnapshot, WsMessage } from '@quiz/contracts';
import { selectNewestSnapshot, shouldAcceptSnapshotSeq } from '../overlayLogic';
import { makeMockSnapshot } from '../mock/snapshots';
import type { OverlayRole } from '../overlayRole';
import type { AudioEngineState } from '../audio/audio-engine';

export type SnapshotConnection = 'connecting' | 'connected' | 'reconnecting';

export function applySnapshot(
  current: PublicSnapshot | null,
  currentSeq: number | null,
  awaitingFreshSnapshot: boolean,
  message: WsMessage<'STATE_SNAPSHOT'>,
): { snapshot: PublicSnapshot | null; seq: number | null } {
  const sessionChanged = current !== null && message.sessionId !== current.sessionId;
  const resetSequence = awaitingFreshSnapshot || sessionChanged;
  if (!shouldAcceptSnapshotSeq(currentSeq, message.seq, resetSequence))
    return { snapshot: current, seq: currentSeq };

  return {
    snapshot: selectNewestSnapshot(current, message.payload, resetSequence),
    seq: message.seq,
  };
}

export function applyAnswerCounts(
  current: PublicSnapshot | null,
  currentSeq: number | null,
  awaitingFreshSnapshot: boolean,
  message: WsMessage<'ANSWER_COUNTS'>,
): { snapshot: PublicSnapshot | null; seq: number | null } {
  if (awaitingFreshSnapshot || !current || !shouldAcceptSnapshotSeq(currentSeq, message.seq))
    return { snapshot: current, seq: currentSeq };

  if (message.sessionId !== current.sessionId) return { snapshot: current, seq: currentSeq };

  // Nhận seq mới ngay cả khi qid đã cũ để frame snapshot đến trễ hơn không thể ghi lùi dữ liệu.
  const seq = message.seq;
  if (
    current.state !== 'ACCEPTING' ||
    current.stateVersion !== message.stateVersion ||
    current.question?.questionInstanceId !== message.payload.questionInstanceId
  ) return { snapshot: current, seq };

  // ANSWER_COUNTS chỉ mang tổng số người trả lời; phân bố A/B/C/D vẫn lấy từ snapshot REVEAL.
  return {
    snapshot: {
      ...current,
      answerCount: message.payload.answerCount,
      participantCount: message.payload.participantCount,
    },
    seq,
  };
}

export function useSnapshot(mockScene: string | null, overlayRole: OverlayRole, audioState: AudioEngineState) {
  const [snapshot, setSnapshot] = useState<PublicSnapshot | null>(null);
  const [connection, setConnection] = useState<SnapshotConnection>('connecting');
  const [serverTimeMs, setServerTimeMs] = useState(Date.now());
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const latest = useRef<PublicSnapshot | null>(null);
  const latestSeq = useRef<number | null>(null);
  const activeSocket = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (mockScene) {
      const mock = makeMockSnapshot(mockScene);
      activeSocket.current = null;
      latest.current = mock;
      latestSeq.current = null;
      setSnapshot(mock);
      setServerTimeMs(Date.now());
      setClockOffsetMs(0);
      setConnection('connected');
      return;
    }
    let socket: WebSocket | null = null;
    let retryTimer = 0;
    let delay = 500;
    let closed = false;

    const connect = () => {
      if (closed) return;
      const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const currentSocket = new WebSocket(`${scheme}//${location.host}/ws`);
      let awaitingFreshSnapshot = true;
      socket = currentSocket;
      activeSocket.current = currentSocket;
      currentSocket.onopen = () => {
        if (socket !== currentSocket) return;
        setConnection(delay > 500 ? 'reconnecting' : 'connected');
        currentSocket.send(JSON.stringify({ type: 'HELLO', role: 'overlay', lastStateVersion: latest.current?.stateVersion }));
      };
      currentSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as WsMessage;
          if (socket !== currentSocket || !Number.isSafeInteger(message.seq)) return;

          if (message.type === 'ANSWER_COUNTS') {
            const payload = message.payload;
            if (
              typeof message.sessionId !== 'string' ||
              !Number.isSafeInteger(message.stateVersion) ||
              typeof payload?.questionInstanceId !== 'string' ||
              !Number.isSafeInteger(payload.answerCount) || payload.answerCount < 0 ||
              !Number.isSafeInteger(payload.participantCount) || payload.participantCount < 0
            ) return;
            const next = applyAnswerCounts(latest.current, latestSeq.current, awaitingFreshSnapshot, message);
            if (next.seq !== latestSeq.current) latestSeq.current = next.seq;
            if (next.snapshot !== latest.current && next.snapshot) {
              latest.current = next.snapshot;
              setSnapshot(next.snapshot);
            }
            return;
          }

          if (message.type !== 'STATE_SNAPSHOT' || !message.payload || typeof message.seq !== 'number') return;
          const next = applySnapshot(latest.current, latestSeq.current, awaitingFreshSnapshot, message);
          if (next.snapshot === latest.current && next.seq === latestSeq.current) return;
          latestSeq.current = next.seq;
          awaitingFreshSnapshot = false;
          latest.current = next.snapshot;
          setSnapshot(next.snapshot);
          const serverTime = typeof message.serverTimeMs === 'number' ? message.serverTimeMs : Date.now();
          setServerTimeMs(serverTime);
          setClockOffsetMs(serverTime - Date.now());
          delay = 500;
          setConnection('connected');
        } catch {
          // Ignore malformed or unrelated WebSocket messages.
        }
      };
      currentSocket.onclose = () => {
        if (closed) return;
        if (socket !== currentSocket) return;
        activeSocket.current = null;
        setConnection('reconnecting');
        retryTimer = window.setTimeout(connect, delay);
        delay = Math.min(5_000, delay * 2);
      };
      currentSocket.onerror = () => currentSocket.close();
    };
    connect();
    return () => {
      closed = true;
      window.clearTimeout(retryTimer);
      if (activeSocket.current === socket) activeSocket.current = null;
      socket?.close();
    };
  }, [mockScene]);

  useEffect(() => {
    if (mockScene || !snapshot) return;
    const socket = activeSocket.current;
    if (socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: 'ACK', stateVersion: snapshot.stateVersion, role: overlayRole, audioState }));
  }, [mockScene, snapshot, overlayRole, audioState]);

  return { snapshot, connection, serverTimeMs, clockOffsetMs };
}
