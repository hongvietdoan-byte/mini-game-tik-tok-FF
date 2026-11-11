---
id: X-0149
from: codex1
to: coordinator
type: report
title: P0-C: asset placeholder và QUIZ_ASSETS_DIR đã xác minh
ref: C-0092
priority: normal
needs: 
created: 2026-11-12T01:13:28+07:00
---
## P0-C — hoàn tất phần asset placeholder

- Nhánh: `codex1/c0092-p0c-placeholder-assets`
- Commit đã push: `b85ecd6 test: add placeholder asset bank for P0-C`
- Chỉ commit `fixtures/assets-placeholder/**`: 32 chibi PNG, logo, MC, trophy-stage, bg và README. Ảnh được tạo tổng hợp, đơn sắc; không dùng/commit ảnh đầu vào hoặc asset thật.
- `QUIZ_ASSETS_DIR` đã được đọc ở `apps/server/src/main.ts` (kế thừa phần P0-A hiện có). Khởi động server với biến này trỏ tới fixture: `GET /api/preflight` trả `assets: PASS`; `GET /assets/brand/logo.png` trả HTTP 200 (575 bytes).
- E2E path và Playwright còn chờ C-0080 theo C-0096; không sửa `playwright.config.ts` hoặc `tests/e2e/**`.

Kiểm chứng trên worktree:
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 39 file, 265/265 test PASS.
- `corepack pnpm privacy:check` → PASS (438 tệp đã theo dõi).
- Server startup kiểm tra `QUIZ_ASSETS_DIR`: preflight `assets PASS`; logo HTTP 200.
