import { describe, expect, it } from 'vitest';
import { buildReplaySchedule, parseReplayArgs, parseReplayEvents } from './replay-events';

describe('parseReplayEvents', () => {
  it('đọc JSONL hư cấu, bỏ dòng trống và giữ eventId tùy chọn', () => {
    expect(parseReplayEvents([
      '{"atMs":0,"userId":"demo-1","displayName":"Khán giả Mẫu 01","text":"A","eventId":"demo-event-1"}',
      '',
      '{"atMs":250,"userId":"demo-2","displayName":"Khán giả Mẫu 02","text":"B"}',
    ].join('\n'))).toEqual([
      { atMs: 0, userId: 'demo-1', displayName: 'Khán giả Mẫu 01', text: 'A', eventId: 'demo-event-1' },
      { atMs: 250, userId: 'demo-2', displayName: 'Khán giả Mẫu 02', text: 'B' },
    ]);
  });

  it('báo dòng JSON lỗi và từ chối field ngoài giới hạn API', () => {
    expect(() => parseReplayEvents('{not-json}')).toThrow('dòng 1');
    expect(() => parseReplayEvents('{"atMs":-1,"userId":"u","displayName":"n","text":"A"}'))
      .toThrow('atMs');
    expect(() => parseReplayEvents('{"atMs":0,"userId":"","displayName":"n","text":"A"}'))
      .toThrow('userId');
  });
});

describe('buildReplaySchedule', () => {
  const events = parseReplayEvents([
    '{"atMs":1000,"userId":"late","displayName":"Muộn","text":"C"}',
    '{"atMs":0,"userId":"first","displayName":"Đầu","text":"A"}',
    '{"atMs":1000,"userId":"same-time","displayName":"Cùng giờ","text":"B"}',
  ].join('\n'));

  it('sắp theo thời gian, giữ thứ tự input nếu cùng mốc và scale theo speed', () => {
    expect(buildReplaySchedule(events, 2).map(({ userId, delayMs, elapsedMs }) => ({ userId, delayMs, elapsedMs })))
      .toEqual([
        { userId: 'first', delayMs: 0, elapsedMs: 0 },
        { userId: 'late', delayMs: 500, elapsedMs: 500 },
        { userId: 'same-time', delayMs: 0, elapsedMs: 500 },
      ]);
  });

  it('từ chối speed không dương hoặc không hữu hạn', () => {
    expect(() => buildReplaySchedule(events, 0)).toThrow(RangeError);
    expect(() => buildReplaySchedule(events, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('parseReplayArgs', () => {
  it('có token file mặc định, có thể đổi tốc độ và token file', () => {
    const options = parseReplayArgs([
      'fixtures/replay/demo-round.json', '--session-id', 'session-1', '--speed', '2',
      '--token-file', 'data/mock-token.txt',
    ]);
    expect(options).toMatchObject({ sessionId: 'session-1', speed: 2 });
    expect(options.inputFile).toContain('demo-round.json');
    expect(options.tokenFile).toContain('mock-token.txt');
  });

  it('yêu cầu file và session id, từ chối tham số lạ', () => {
    expect(() => parseReplayArgs([])).toThrow('--session-id');
    expect(() => parseReplayArgs(['input.jsonl', '--session-id', 's', '--unknown', 'x']))
      .toThrow('không hỗ trợ');
  });
});
