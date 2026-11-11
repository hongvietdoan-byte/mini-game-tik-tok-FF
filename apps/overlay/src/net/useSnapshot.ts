import { useEffect, useRef, useState } from 'react';
import type { PublicSnapshot } from '@quiz/contracts';
import { selectNewestSnapshot, shouldAcceptSnapshotSeq } from '../overlayLogic';
import { makeMockSnapshot } from '../mock/snapshots';

export type SnapshotConnection = 'connecting' | 'connected' | 'reconnecting';

export function useSnapshot(mockScene: string | null) {
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
          const message = JSON.parse(String(event.data)) as {
            type?: string; seq?: number; payload?: PublicSnapshot; serverTimeMs?: number;
          };
          if (socket !== currentSocket || message.type !== 'STATE_SNAPSHOT' || !message.payload || typeof message.seq !== 'number') return;
          if (!shouldAcceptSnapshotSeq(latestSeq.current, message.seq, awaitingFreshSnapshot)) return;
          const incoming = message.payload;
          const next = selectNewestSnapshot(latest.current, incoming, awaitingFreshSnapshot);
          latestSeq.current = message.seq;
          awaitingFreshSnapshot = false;
          latest.current = next;
          setSnapshot(next);
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
    socket.send(JSON.stringify({ type: 'ACK', stateVersion: snapshot.stateVersion }));
  }, [mockScene, snapshot]);

  return { snapshot, connection, serverTimeMs, clockOffsetMs };
}
