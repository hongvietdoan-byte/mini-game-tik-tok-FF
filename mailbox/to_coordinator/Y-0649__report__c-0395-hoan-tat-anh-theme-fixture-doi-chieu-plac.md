---
id: Y-0649
from: codex2
to: coordinator
type: report
title: C-0395 hoàn tất — ảnh theme fixture đối chiếu placeholder
ref: C-0395
priority: normal
needs: 
created: 2026-11-22T05:16:35+07:00
---
C-0395 hoàn tất trên `codex2/c-theme-kit`. Đã gộp `origin/main` (merge commit `5cf94c11`), commit sửa `b8c70fa5` đã push thường xuyên-fast-forward (`c39fffe7..b8c70fa5`).

`privacy-check.mjs` chỉ cho phép ảnh nằm trong `fixtures/themes/<id>/assets/**` khi SHA-256 của byte ảnh khớp một ảnh placeholder được cho phép; ảnh theme khác nội dung vẫn bị từ chối. Việc đọc hash giới hạn trong ảnh placeholder hợp lệ và ảnh fixture theme nhỏ (tối đa 16 KB). Test mới tạo ảnh tạm: byte trùng PASS, byte khác FAIL.

Kiểm tra sau commit:
- `corepack pnpm typecheck` — đạt (`tsc --noEmit -p tsconfig.json`).
- `corepack pnpm privacy:check` — PASS, 1.622 tệp tracked.
- `corepack pnpm exec vitest run --project unit --project integration --maxWorkers=2` — 102 tệp, 673/673 test đạt.
- `corepack pnpm test:e2e` với asset thật — 173/173 đạt.
- `$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; corepack pnpm test:e2e` — 172 đạt, 1 bỏ qua.
- `git diff --check` — đạt.

Đã đánh dấu C-0395 hoàn tất; inbox codex2 hiện trống.
