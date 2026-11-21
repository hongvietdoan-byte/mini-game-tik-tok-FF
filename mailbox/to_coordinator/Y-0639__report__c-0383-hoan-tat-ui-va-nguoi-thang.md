---
id: Y-0639
from: codex2
to: coordinator
type: report
title: C-0383 hoàn tất: UI và người thắng
ref: C-0383
priority: high
needs: 
created: 2026-11-22T00:17:13+07:00
---
# Báo cáo hoàn tất C-0383

Đã hoàn tất A–D trên nhánh `codex2/c-sau-live-ui` và push thành công lên origin. Đã gộp origin/main mới nhất (merge `fa19d79e`).

## Commit theo phần

- A — `19791968` `Fix dashboard lobby seat capacity display`: sức chứa lấy từ số ghế trong snapshot; Dashboard hiện `24/30` và `Đã đủ ghế` khi đủ 30. `apps/dashboard/src/main.tsx:534,686`.
- B — `a11a86d7` + `e62ef410`: căn giữa an toàn, tự co chữ nhưng giữ sàn 24 px; giữ lề cân bằng cho prompt dài. `apps/overlay/src/v3/arena.css:2180`, đo E2E tại `tests/e2e/c0383-question-centering.spec.ts:12`, báo cáo tại `tools/report-question-length.ts`. Báo cáo DB thật: 186 câu APPROVED, 186 đạt căn giữa, 0 không đạt; không ghi DB. Đo bbox: demo-004 top/bottom 42/42 px; demo-006 16.3/16.3 px; tràn 0.
- C — `0e0c943c` `Keep question Top 3 times fully visible`: cột thời gian 68 px; 10,3 / 15,0 / 19,9 giây hiển thị đủ, tên 24 ký tự xuống tối đa 2 dòng, các ô không tràn. `apps/overlay/src/v3/arena.css:2648`, `apps/overlay/src/v3/ArenaStage.tsx:206`, `tests/e2e/c0383-top3-times.spec.ts:85`.
- D — `2260a11d` + `44be04d7`: truyền/lưu @handle và trang Dashboard Người thắng qua endpoint admin có token; fallback TikTok userId; không đưa handle vào public snapshot/overlay. `packages/contracts/src/index.ts:306`, `apps/server/src/runtime.ts:2213,2274`, `apps/server/src/app.ts:350`, `apps/dashboard/src/WinnersPage.tsx:34`, `packages/persistence/src/index.ts:582`.

## Kiểm tra

- `corepack pnpm typecheck` — đạt.
- `corepack pnpm privacy:check` — đạt, kiểm tra 1.477 tệp.
- `vitest run --project unit` — 80 tệp / 563 test đạt.
- `vitest run --project integration` — 19 tệp / 92 test đạt.
- `PLAYWRIGHT_SERVER_PORT=18890 PLAYWRIGHT_OVERLAY_PORT=15180 corepack pnpm exec playwright test --reporter=line` (asset thật) — 171 đạt, 0 lỗi.
- `PLAYWRIGHT_SERVER_PORT=18891 PLAYWRIGHT_OVERLAY_PORT=15181 QUIZ_ASSETS_DIR=fixtures/assets-placeholder corepack pnpm exec playwright test --reporter=line` — 170 đạt, 1 bỏ qua, 0 lỗi.

Ảnh duyệt (không commit): `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-sau-live-ui\assets-local\review\c-sau-live-ui\` (A–D, gồm full/close-up theo yêu cầu).

C-0386 đã ACK và yêu cầu tạo nhánh sau khi C-0383 được gộp vào origin/main. Nhờ coordinator gộp nhánh này; sau khi merge, tôi sẽ bắt đầu C-0386 từ origin/main mới nhất.
