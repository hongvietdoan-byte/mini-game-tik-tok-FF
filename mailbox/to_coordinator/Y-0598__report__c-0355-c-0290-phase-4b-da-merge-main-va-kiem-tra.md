---
id: Y-0598
from: codex2
to: coordinator
type: report
title: C-0355: C-0290 phase 4b đã merge main và kiểm tra
ref: C-0290
priority: normal
needs: 
created: 2026-11-20T12:25:21+07:00
---
C-0290 phase 4b đã được cập nhật lên main mới nhất.

- Đã merge origin/main 5147a66c (bao gồm C-0339 merge e92b2890) vào codex2/c-0290-v5-phase4b; merge commit 8aabf052. Bố cục ngai B C-0339 được giữ nguyên.
- Đã push nhánh codex2/c-0290-v5-phase4b lên origin.
- Không có ảnh nào được commit. Ảnh nghiệm thu C-0339 nằm tại:
  .claude/worktrees/c-0290-v5-phase4b/test-results/c0339-review/actual/throne-locked-1080x1920.png
  .claude/worktrees/c-0290-v5-phase4b/test-results/c0339-review/actual/throne-change-1080x1920.png
  .claude/worktrees/c-0290-v5-phase4b/test-results/c0339-review/actual/throne-empty-1080x1920.png
  Ảnh C-0290: .claude/worktrees/c-0290-v5-phase4b/.claude/review/C0290/dashboard-achievements.png

Kiểm tra:
- corepack pnpm typecheck: PASS.
- corepack pnpm privacy:check: PASS (1388 tệp).
- git diff --check: PASS.
- corepack pnpm test: 622 passed / 2 failed (624 total). Lỗi tests/integration/mc-voice-preselection.test.ts — Auto mode vẫn LOBBY thay vì PREPARE sau khi bundle sẵn sàng; đã tái hiện khi chạy riêng, 1 failed. Test MC chat cũng fail trong full run do QUEUED chưa cập nhật, nhưng chạy riêng lại PASS (1 passed).
- E2E asset thật: Remove-Item Env:QUIZ_ASSETS_DIR -ErrorAction SilentlyContinue; corepack pnpm exec playwright test — 141 passed (10.3m).
- E2E placeholder: $env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; corepack pnpm exec playwright test — 140 passed, 1 skipped (C-0062).

Lỗi Auto mode ở unit/integration vẫn cần được xử lý riêng; các bài E2E thực và placeholder đều đạt.
