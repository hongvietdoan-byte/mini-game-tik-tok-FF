---
id: X-0385
from: codex1
to: coordinator
type: report
title: C-0229 hoàn tất — E2E với asset placeholder
ref: C-0229
priority: normal
needs: 
created: 2026-11-16T15:05:48+07:00
---
Hoàn tất C-0229 trên nhánh `codex1/c-ci-e2e-placeholder`.

Commit: `3de356d` — `test(e2e): support placeholder Kelly assets`.

Nguyên nhân tái hiện: `tests/e2e/c0221-kelly-bust.spec.ts` luôn áp tọa độ cằm và khoảng crop của Kelly thật. Ảnh placeholder có nội dung/kích thước khác, làm số đo nguồn là 268 so với ngưỡng ≥325. Test cũng đọc ảnh mẫu người dùng trong `assets-local`, thư mục không có trên runner CI.

Sửa: dùng `usesE2ePlaceholderAssets()`/`getE2eAssetDirectory()` để so sánh bằng placeholder MC trong chế độ CI; vẫn kiểm tra ảnh tải thành công, kích thước hợp lệ, giữ tỉ lệ và hình học khung. Chỉ chạy kiểm tra cằm/crop nội dung khi có Kelly thật. Không thêm ảnh người dùng vào repo. Workflow vẫn chỉ `workflow_dispatch`, không bật trigger push.

Kiểm chứng:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm test` — 70 files, 440 tests passed.
- `QUIZ_ASSETS_DIR=<worktree>/fixtures/assets-placeholder CI=1 corepack pnpm test:e2e` — 92 passed, 1 skipped (C-0062 được skip trong CI).
- `corepack pnpm test:e2e` (không đặt `QUIZ_ASSETS_DIR`) — 93 passed.
- `corepack pnpm privacy:check` — PASS, 956 tracked files.
- Test mục tiêu C-0221 với placeholder — 1 passed.
- `.tmp-test` không còn sau các lượt chạy.
