import { describe, expect, it, vi } from 'vitest';
import { McVoicePlaybackController, getMcVoiceOverlayInstanceId } from './mcVoicePlayback';
import type { McVoicePlaybackPorts, McVoicePlayEnvelope } from './mcVoicePlayback';

const INSTANCE = 'c7b7a3bc-5d67-4e85-a4bf-2d46b747c01a';
const QUESTION = 'question-instance-1';
const TOKEN = `lease-${'x'.repeat(40)}`;

function envelope(): McVoicePlayEnvelope {
  return {
    sessionId: 'session-1',
    stateVersion: 9,
    serverTimeMs: 1_000,
    payload: {
      questionInstanceId: QUESTION,
      lines: [
        { lineId: 'prompt', assetId: 'a'.repeat(64), text: 'Câu hỏi đang đọc.', durationMs: 1_000 },
        ...(['A', 'B', 'C', 'D'] as const).map((option, index) => ({
          lineId: `option-${option}` as const,
          assetId: String(index + 1).repeat(64),
          text: `Đáp án ${option}.`,
          durationMs: 1_000,
        })),
      ],
      totalDurationMs: 5_000,
      deadlineAtMs: 10_000,
    },
  };
}

function setup(overrides: Partial<McVoicePlaybackPorts> = {}) {
  const played: string[] = [];
  const bubbles: Array<string | null> = [];
  const completed: Array<{ body: unknown; token: string }> = [];
  const ports: McVoicePlaybackPorts = {
    fetchAudio: vi.fn(async (assetId) => new Blob([assetId])),
    playAudio: vi.fn(async (audio) => { played.push(await audio.text()); }),
    complete: vi.fn(async (body, token) => { completed.push({ body, token }); }),
    setBubble: (text) => bubbles.push(text),
    now: () => 1_000,
    ...overrides,
  };
  const controller = new McVoicePlaybackController(ports);
  controller.updateSnapshot({ sessionId: 'session-1', state: 'READING', stateVersion: 9, questionInstanceId: QUESTION }, 1_000);
  controller.updateLease({ status: 'GRANTED', overlayInstanceId: INSTANCE, leaseToken: TOKEN });
  return { controller, ports, played, bubbles, completed };
}

describe('McVoicePlaybackController', () => {
  it('tải và phát tuần tự 5 câu, bubble luôn theo dòng hiện hành rồi gửi ACK hoàn tất', async () => {
    const h = setup();
    await h.controller.play(envelope());

    expect(h.ports.fetchAudio).toHaveBeenCalledTimes(5);
    expect(h.played).toEqual([
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ...['1', '2', '3', '4'].map((n) => n.repeat(64)),
    ]);
    expect(h.bubbles.filter((text) => text !== null)).toEqual(['Câu hỏi đang đọc.', 'Đáp án A.', 'Đáp án B.', 'Đáp án C.', 'Đáp án D.']);
    expect(h.bubbles.at(-1)).toBeNull();
    expect(h.completed).toEqual([{
      token: TOKEN,
      body: { questionInstanceId: QUESTION, expectedStateVersion: 9, result: 'FINISHED' },
    }]);
  });

  it('trả fallback khi tải hoặc phát lỗi; không làm kẹt phiên READING', async () => {
    const h = setup({ fetchAudio: vi.fn(async () => { throw new Error('URL/token nhạy cảm'); }) });
    await h.controller.play(envelope());
    expect(h.completed).toHaveLength(1);
    expect(h.completed[0]?.body).toMatchObject({ result: 'FALLBACK', fallbackReason: 'PLAYBACK_ERROR' });
  });

  it('dừng audio khi snapshot rời câu và không gửi ACK/fallback cho trạng thái cũ', async () => {
    let aborted = false;
    const h = setup({
      playAudio: vi.fn((_audio, signal) => new Promise<void>((_resolve, reject) => {
        signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }, { once: true });
      })),
    });
    const running = h.controller.play(envelope());
    await Promise.resolve();
    await Promise.resolve();
    h.controller.updateSnapshot({ sessionId: 'session-1', state: 'ACCEPTING', stateVersion: 10, questionInstanceId: QUESTION }, 1_001);
    await running;
    expect(aborted).toBe(true);
    expect(h.completed).toHaveLength(0);
    expect(h.bubbles.at(-1)).toBeNull();
  });

  it('fallback trước khi phát nếu không đủ thời gian còn lại', async () => {
    let now = 1_000;
    const h = setup({ now: () => now });
    now = 5_000;
    await h.controller.play(envelope());
    expect(h.ports.playAudio).not.toHaveBeenCalled();
    expect(h.completed[0]?.body).toMatchObject({ result: 'FALLBACK', fallbackReason: 'PLAYBACK_ERROR' });
  });

  it('ID overlay giữ ổn định qua reload trong sessionStorage của tab', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
    const first = getMcVoiceOverlayInstanceId(storage, () => INSTANCE);
    const second = getMcVoiceOverlayInstanceId(storage, () => '4f541bc0-1f98-4b18-bc42-9e193f719a8b');
    expect(first).toBe(INSTANCE);
    expect(second).toBe(first);
  });
});
