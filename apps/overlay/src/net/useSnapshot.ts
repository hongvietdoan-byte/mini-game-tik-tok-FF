import { useEffect, useRef, useState } from 'react';
import type { PublicSnapshot } from '@quiz/contracts';
import { selectNewestSnapshot } from '../overlayLogic';
import { makeMockSnapshot } from '../mock/snapshots';

export type SnapshotConnection = 'connecting' | 'connected' | 'reconnecting';

export function useSnapshot(mockScene: string | null) {
  const [snapshot, setSnapshot] = useState<PublicSnapshot | null>(null);
  const [connection, setConnection] = useState<SnapshotConnection>('connecting');
  const [serverTimeMs, setServerTimeMs] = useState(Date.now());
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const latest = useRef<PublicSnapshot | null>(null);

  useEffect(() => {
    if (mockScene) {
      const mock = makeMockSnapshot(mockScene);
      latest.current = mock;
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
      socket = new WebSocket(`${scheme}//${location.host}/ws`);
      socket.onopen = () => {
        setConnection(delay > 500 ? 'reconnecting' : 'connected');
        socket?.send(JSON.stringify({ type: 'HELLO', role: 'overlay', lastStateVersion: latest.current?.stateVersion }));
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as {
            type?: string; payload?: PublicSnapshot; stateVersion?: number; serverTimeMs?: number;
          };
          if (message.type !== 'STATE_SNAPSHOT' || !message.payload) return;
          const incoming = message.payload;
          const next = selectNewestSnapshot(latest.current, incoming);
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
      socket.onclose = () => {
        if (closed) return;
        setConnection('reconnecting');
        retryTimer = window.setTimeout(connect, delay);
        delay = Math.min(5_000, delay * 2);
      };
      socket.onerror = () => socket?.close();
    };
    connect();
    return () => {
      closed = true;
      window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [mockScene]);

  return { snapshot, connection, serverTimeMs, clockOffsetMs };
}
