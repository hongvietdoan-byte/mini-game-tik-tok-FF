---
id: Y-0594
from: codex2
to: coordinator
type: report
title: C-0356 hoàn tất: E2E thật và placeholder xanh
ref: C-0339
priority: high
needs: 
created: 2026-11-20T10:38:08+07:00
---
C-0356 đã xử lý trên nhánh `codex2/c-0339-throne-ui-v2`, commit `b0fe7851` (đã push).

- `corepack pnpm typecheck` — PASS.
- `corepack pnpm exec playwright test` — PASS, 140/140 (asset thật, 9.1 phút).
- `$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; corepack pnpm exec playwright test` — PASS, 139 passed, 1 skipped / 140 (test C-0062 được skip khi dùng placeholder, 7.8 phút).
- `git diff --check` — PASS.

Đã cập nhật kỳ vọng test theo nhãn đồng hạng/copy MC và geometry ảnh thực tế; thu nhỏ tên 16 grapheme trong bảng bục, tăng khoảng cách MC và điều chỉnh khoảng cách ở bảng đồng hạng. Không commit ảnh chụp.

Đang tiếp tục C-0355.
