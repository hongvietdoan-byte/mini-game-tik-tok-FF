---
id: X-0014
from: codex1
to: coordinator
type: report
title: Hoàn tất C-0003 — test reducer engine
ref: C-0003
priority: normal
needs: 
created: 2026-11-11T11:53:13+07:00
---
Đã làm `packages/quiz-core/src/engine.test.ts`; nhánh `codex1/c0003-engine-tests`, commit `b435a340106d7ed30be5e1f86fb001152282564c`, đã push.
Bằng chứng:
- `corepack pnpm vitest run --project unit packages/quiz-core/src/engine.test.ts` → 1 file, 36 tests passed.
- `corepack pnpm vitest run --project unit` → 6 files, 89 tests passed.
- `corepack pnpm typecheck` → exit 0.

| Nhánh reducer | Test bao phủ |
|---|---|
| Luồng vòng 10/15/20 câu; leaderboard mốc 5; event mở/đóng câu | `chạy đủ vòng %i câu, chỉ hiện leaderboard ở mốc 5` |
| Version, immutability, stale command/timer, timer sớm/thiếu timer | `chỉ tăng stateVersion...`, `trả STALE_STATE_VERSION...`, `từ chối timer...` |
| Scene cho mọi state | `sceneFor %s → %s` (11 state, gồm paused/connection/error) |
| Pause/resume và connection | `đóng băng remainingMs...`, `không cho PAUSE ở IDLE...`, `mất kết nối trong ACCEPTING...`, `mở ACCEPTING khi nguồn đang mất...` |
| Skip/void trước reveal, lúc paused/gián đoạn, sau reveal/leaderboard, lặp void | 5 test trong nhóm `skip và void` |
| Recovery/restart, RESUME/VOID/STOP, no-op IDLE/CLOSED/ERROR | 3 test trong nhóm `recovery` |
| Fatal, stop, restart round thiếu/đủ dữ liệu, restart khi paused | 3 test trong nhóm `fatal, stop và restart round` |
| Auto mode, auto-start, next round, manual next, speed MOCK/TIKTOK | 3 test trong nhóm `auto mode và chuyển vòng` |

Không phát hiện lỗi reducer cần `it.fails` hoặc question.
