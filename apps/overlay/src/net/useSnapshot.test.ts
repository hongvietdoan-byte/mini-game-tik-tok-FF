import { describe, expect, it } from 'vitest';
import type { AudienceView, PublicSnapshot, WsMessage } from '@quiz/contracts';
import { applyAnswerCounts, applyAudienceUpdated, applySnapshot } from './useSnapshot';

function snapshot(overrides: Partial<PublicSnapshot> = {}) {
  return {
    sessionId: 'session-1',
    state: 'ACCEPTING',
    stateVersion: 7,
    question: { questionInstanceId: 'round-1-question-1' },
    answerCount: 0,
    participantCount: 0,
    ...overrides,
  } as PublicSnapshot;
}

function countsMessage(overrides: Partial<WsMessage<'ANSWER_COUNTS'>> = {}): WsMessage<'ANSWER_COUNTS'> {
  return {
    v: 1,
    type: 'ANSWER_COUNTS',
    seq: 12,
    sessionId: 'session-1',
    stateVersion: 7,
    serverTimeMs: 1_800_000_000_000,
    payload: {
      questionInstanceId: 'round-1-question-1',
      answerCount: 35,
      participantCount: 35,
    },
    ...overrides,
  };
}

function snapshotMessage(overrides: Partial<WsMessage<'STATE_SNAPSHOT'>> = {}): WsMessage<'STATE_SNAPSHOT'> {
  return {
    v: 1,
    type: 'STATE_SNAPSHOT',
    seq: 12,
    sessionId: 'session-1',
    stateVersion: 7,
    serverTimeMs: 1_800_000_000_000,
    payload: snapshot(),
    ...overrides,
  };
}

function audience(rotationId = 0, safeDisplayName = 'StormKing'): AudienceView {
  return {
    rotationId,
    seats: [{
      slotId: 'seat-1', rowIndex: 0, seatIndex: 0, x: 50, y: 100, scale: 1, depth: 0,
      occupant: { safeDisplayName, characterId: 'chibi-01', pinned: false, result: null },
    }],
    queued: 0,
    total: 1,
  };
}

function audienceMessage(overrides: Partial<WsMessage<'AUDIENCE_UPDATED'>> = {}): WsMessage<'AUDIENCE_UPDATED'> {
  return {
    v: 1,
    type: 'AUDIENCE_UPDATED',
    seq: 12,
    sessionId: 'session-1',
    stateVersion: 7,
    serverTimeMs: 1_800_000_000_000,
    payload: audience(),
    ...overrides,
  };
}

describe('overlay STATE_SNAPSHOT', () => {
  it('accepts a new session snapshot even when its sequence and state version restart', () => {
    const current = snapshot({ stateVersion: 50 });
    const incoming = snapshot({ sessionId: 'session-2', stateVersion: 1, state: 'IDLE' });
    const result = applySnapshot(current, 900, false, snapshotMessage({
      seq: 1,
      sessionId: 'session-2',
      stateVersion: 1,
      payload: incoming,
    }));

    expect(result).toEqual({ snapshot: incoming, seq: 1 });
  });

  it('rejects an old sequence from the same session', () => {
    const current = snapshot();
    expect(applySnapshot(current, 12, false, snapshotMessage({ seq: 11 })))
      .toEqual({ snapshot: current, seq: 12 });
  });
});

describe('overlay ANSWER_COUNTS', () => {
  it('updates the current question total and participants from a newer frame', () => {
    const current = snapshot();
    const result = applyAnswerCounts(current, 11, false, countsMessage());

    expect(result.seq).toBe(12);
    expect(result.snapshot).toMatchObject({
      state: 'ACCEPTING',
      stateVersion: 7,
      question: { questionInstanceId: 'round-1-question-1' },
      answerCount: 35,
      participantCount: 35,
    });
    expect(result.snapshot).not.toBe(current);
    expect(current.answerCount).toBe(0);
  });

  it('ignores an old or duplicate seq without changing the snapshot', () => {
    const current = snapshot();
    const result = applyAnswerCounts(current, 12, false, countsMessage({ seq: 12 }));

    expect(result).toEqual({ snapshot: current, seq: 12 });
  });

  it('ignores another question while consuming its newer seq', () => {
    const current = snapshot();
    const result = applyAnswerCounts(current, 11, false, countsMessage({
      payload: { questionInstanceId: 'round-1-question-2', answerCount: 2, participantCount: 2 },
    }));

    expect(result).toEqual({ snapshot: current, seq: 12 });
  });

  it('ignores another session, another state version, and counts before a fresh snapshot', () => {
    const current = snapshot();
    expect(applyAnswerCounts(current, 11, false, countsMessage({ sessionId: 'session-2' })))
      .toEqual({ snapshot: current, seq: 11 });
    expect(applyAnswerCounts(current, 11, false, countsMessage({ stateVersion: 6 })))
      .toEqual({ snapshot: current, seq: 12 });
    expect(applyAnswerCounts(current, 11, true, countsMessage()))
      .toEqual({ snapshot: current, seq: 11 });
  });
});

describe('overlay AUDIENCE_UPDATED', () => {
  it('merges live seats without replacing the other snapshot fields', () => {
    const current = snapshot({ timer: { remainingMs: 12_000, running: true } as PublicSnapshot['timer'], audience: { ...audience(), seats: [] } });
    const incoming = audience(0, 'StormKing');
    const result = applyAudienceUpdated(current, 11, false, audienceMessage({ payload: incoming }));

    expect(result).toEqual({ snapshot: { ...current, audience: incoming }, seq: 12 });
    expect(result.snapshot).not.toBe(current);
    expect(result.snapshot?.timer).toBe(current.timer);
    expect(current.audience?.seats).toEqual([]);
  });

  it('rejects old or duplicate sequence numbers', () => {
    const current = snapshot({ audience: audience(2) });
    expect(applyAudienceUpdated(current, 12, false, audienceMessage({ seq: 11 })))
      .toEqual({ snapshot: current, seq: 12 });
  });

  it('accepts a newer rotation while keeping the current game state', () => {
    const current = snapshot({ audience: audience(2) });
    const incoming = audience(3, 'Mira');
    const result = applyAudienceUpdated(current, 11, false, audienceMessage({ payload: incoming }));

    expect(result).toEqual({ snapshot: { ...current, audience: incoming }, seq: 12 });
    expect(result.snapshot?.state).toBe(current.state);
    expect(result.snapshot?.stateVersion).toBe(current.stateVersion);
  });

  it('does not apply a previous rotation or state version but consumes its newer sequence', () => {
    const current = snapshot({ audience: audience(3) });
    expect(applyAudienceUpdated(current, 11, false, audienceMessage({ payload: audience(2) })))
      .toEqual({ snapshot: current, seq: 12 });
    expect(applyAudienceUpdated(current, 11, false, audienceMessage({ stateVersion: 6 })))
      .toEqual({ snapshot: current, seq: 12 });
  });

  it('ignores another session and updates received before the fresh reconnect snapshot', () => {
    const current = snapshot({ audience: audience() });
    expect(applyAudienceUpdated(current, 11, false, audienceMessage({ sessionId: 'session-2' })))
      .toEqual({ snapshot: current, seq: 11 });
    expect(applyAudienceUpdated(current, 11, true, audienceMessage()))
      .toEqual({ snapshot: current, seq: 11 });
  });
});
