---
id: C-0003
from: coordinator
to: codex1
type: task
title: Unit test reducer engine.ts — mọi nhánh
ref: 
priority: high
needs: 
created: 2026-11-11T10:58:13+07:00
---
# Unit test reducer engine.ts — mọi nhánh

## Phạm vi file
- `packages/quiz-core/src/engine.test.ts` (chỉ file test). Lỗi mã nguồn → `it.fails` + `question` như C-0002.

## Cách dựng
- `createInitialState({ sessionId: 's1', mode: 'MOCK', timings: DEFAULT_TIMINGS, leaderboardInterval: 5, speedMultiplier: 1 })`, `now` là số cố định tự tăng.
- Helper `cmd(state, body, now, preparedRound?)` gói `{ kind: 'COMMAND', expectedStateVersion: state.stateVersion, command: body }`;
  helper `elapse(state)` gửi `TIMER_ELAPSED` đúng `timer.deadlineMs`.
- Nhớ gửi `CONNECTION_CHANGED ok:true` trước khi mở câu hỏi (nếu không, ACCEPTING bị đóng băng ngay — đó là hành vi đúng, cũng phải test).

## Phải phủ
1. Đường chính 15 câu, interval 5: IDLE→LOBBY→(START_ROUND)→PREPARE→ACCEPTING→REVEAL→PREPARE…; LEADERBOARD chỉ sau câu 5, 10, 15; sau câu 15: LEADERBOARD→ROUND_END→VICTORY→INTERMISSION→LOBBY;
   `completedRounds` +1; events đúng loại / thứ tự (`ROUND_STARTED`, `QUESTION_OPENED`×15, `QUESTION_CLOSED`×15, `ROUND_ENDED`, `VICTORY_STARTED`). Vòng 10 và 20 câu cũng đúng mốc.
2. `stateVersion` tăng đúng 1 mỗi transition thành công; thất bại không đổi gì và không mutate input (deep-freeze input).
3. `STALE_STATE_VERSION` cho COMMAND và TIMER_ELAPSED; TIMER_ELAPSED trước deadline / khi không có timer → ILLEGAL_TRANSITION.
4. `sceneFor` cho mọi state (PAUSED từ ACCEPTING → QUESTION; CONNECTION_INTERRUPTED / ERROR → CONNECTION_LOST).
5. PAUSE / RESUME: đóng băng `remainingMs` đúng lúc pause; resume đặt `deadlineMs = now + remaining`; resume ACCEPTING đặt lại `acceptOpenAtMs = now`;
   RESUME từ ACCEPTING khi mất kết nối → CONNECTION_NOT_READY. PAUSE ở IDLE → ILLEGAL.
6. Mất kết nối: ACCEPTING + `CONNECTION_CHANGED ok:false` → CONNECTION_INTERRUPTED; có mạng lại không tự chạy; RESUME rồi chạy tiếp;
   PREPARE→ACCEPTING khi mất kết nối → vào thẳng CONNECTION_INTERRUPTED; lặp lại cùng giá trị kết nối → `changed:false`.
7. SKIP / VOID trước reveal (đang chạy, PAUSED, CONNECTION_INTERRUPTED): event `QUESTION_VOIDED afterReveal:false`, tiến sang câu kế (hoặc LEADERBOARD nếu là mốc); nếu đang PAUSED thì sau đó vẫn PAUSED.
   VOID sau reveal (REVEAL, LEADERBOARD) → `afterReveal:true`, không đổi state; void lần hai cùng câu → ILLEGAL; SKIP sau reveal → ILLEGAL.
8. Recovery: `PROCESS_RESTARTED` từ ACCEPTING → PAUSED + `suspended.kind='RECOVERY'`, remaining theo `lastHeartbeatMs`, `connectionOk=false`, event `RECOVERY_REQUIRED`;
   lệnh khác ngoài RESOLVE_RECOVERY / STOP → RECOVERY_PENDING; RESOLVE RESUME (cần kết nối nếu từ ACCEPTING), VOID (chỉ khi từ PREPARE / ACCEPTING), STOP;
   PROCESS_RESTARTED ở IDLE / CLOSED / ERROR → không đổi.
9. FATAL → ERROR, lưu error, chỉ STOP được chấp nhận; FATAL lần hai không đổi.
10. STOP giữa vòng → `ROUND_ABORTED cause:'STOP'`, `SESSION_STOPPED`, sessionStatus CLOSED; mọi lệnh sau → SESSION_CLOSED.
11. RESTART_ROUND giữa vòng (kể cả PAUSED) → `ROUND_ABORTED cause:'RESTART'` + round mới; thiếu preparedRound → INSUFFICIENT_QUESTIONS; START_ROUND ngoài LOBBY → ILLEGAL.
12. SET_AUTO_MODE ở LOBBY bật / tắt timer lobby; LOBBY hết giờ → `AUTO_START_REQUESTED`. NEXT_ROUND từ VICTORY / INTERMISSION → LOBBY. MANUAL_NEXT từ ACCEPTING → ILLEGAL.
13. `speedMultiplier` 10 trong MOCK chia thời lượng; mode TIKTOK luôn 1.

## Tiêu chí xong
- Vitest xanh, typecheck sạch; report có bảng "nhánh reducer → tên test". Nhánh `codex1/c0003-engine-tests`.
