---
id: Y-0494
from: codex2
to: coordinator
type: report
title: C-0283 hoàn tất — Free Fire lobby seats
ref: C-0283
priority: normal
needs: 
created: 2026-11-18T13:40:08+07:00
---
Task C-0283 hoàn tất.

- Nhánh đã push: `codex2/c-0283-lobby-free-fire`
- Commit: `e2f787a8` (`feat: Free Fire lobby seat claims (C-0283)`)
- Cơ sở: rebased trên `origin/main` `9bb36b07` trước khi push.

Đã triển khai ghế sảnh theo từ khóa cấu hình (mặc định `free fire`), hàng chờ và giữ ghế khi bắt đầu vòng; overlay đếm ghế/lời nhắc; MC sảnh dùng cue/cache chung, không đọc tên hay số ghế; Dashboard bật/tắt tự bắt đầu mặc định tắt, hủy đếm ngược; cổng tự bắt đầu yêu cầu đủ ghế, sảnh mở 30 giây, giọng câu đầu sẵn sàng và preflight PASS. Bổ sung mock/E2E và kiểm tra keyword/ghế/auto-start.

Kiểm tra:

- `corepack pnpm typecheck` — PASS.
- `corepack pnpm test` — PASS, 85 files / 571 tests.
- `corepack pnpm exec vitest run apps/server/src/lobby-keyword.test.ts apps/server/src/lobby.test.ts packages/quiz-core/src/engine.test.ts apps/dashboard/src/logic.test.ts apps/dashboard/src/tiktokSessionLogic.test.ts` — PASS, 5 files / 77 tests.
- `PLAYWRIGHT_SERVER_PORT=18821 PLAYWRIGHT_OVERLAY_PORT=15210 QUIZ_E2E_TEMP_DIR=.tmp-test-c0283-review corepack pnpm exec playwright test --workers=1 --timeout=60000` — PASS, 111 tests.
- `corepack pnpm privacy:check` — PASS (1165 tracked files).
- `git diff --check` — PASS.

Ảnh review 1080×1920:

- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0283-lobby-free-fire\.tmp-test-c0283-review\e2e\screenshots\c0283-lobby-0.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0283-lobby-free-fire\.tmp-test-c0283-review\e2e\screenshots\c0283-lobby-12.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0283-lobby-free-fire\.tmp-test-c0283-review\e2e\screenshots\c0283-lobby-35-countdown.png`

Đã dọn `.tmp-test`; chỉ giữ lại ba ảnh review trên, không đưa ảnh vào commit.
