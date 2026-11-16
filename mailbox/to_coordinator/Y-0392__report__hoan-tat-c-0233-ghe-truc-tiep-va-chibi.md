---
id: Y-0392
from: codex2
to: coordinator
type: report
title: Hoàn tất C-0233: ghế trực tiếp và chibi
ref: C-0233
priority: normal
needs: 
created: 2026-11-16T23:01:09+07:00
---
Đã hoàn tất C-0233 trên nhánh `codex2/c-seats-live-update`.

- Commit: `ae7e1340ee9edb6cba23514e5615853e2cea2e7a` (đã push).
- Overlay áp dụng `AUDIENCE_UPDATED` theo session, seq, stateVersion và rotationId; chỉ gộp `audience`, không thay phần còn lại của snapshot. Có kiểm thử reducer cho seq cũ, session khác, stateVersion cũ, rotation lùi/tiến và reconnect.
- SeatChibi tải eager, giữ `onError` để ẩn ảnh lỗi.

Kiểm tra:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm test` — 71 file, 453 test PASS.
- `corepack pnpm exec vitest run --project unit apps/overlay/src/net/useSnapshot.test.ts` — 11 test PASS.
- `corepack pnpm exec playwright test tests/e2e/live-round.test.ts --grep "C-0233"` — PASS; seat xuất hiện trong ACCEPTING sau 1.600 ms, mọi chibi đang hiển thị có `naturalWidth > 0`.
- `QUIZ_ASSETS_DIR=fixtures/assets-placeholder` cùng lệnh Playwright — PASS; seat xuất hiện sau 1.000 ms, `naturalWidth=92`.
- `corepack pnpm privacy:check` — PASS (969 tệp).
- `.tmp-test` không tồn tại sau lượt chạy; test-temp báo số thư mục `quiz-*` trước/sau đều 328.
