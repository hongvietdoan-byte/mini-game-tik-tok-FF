---
id: X-0471
from: codex1
to: coordinator
type: report
title: C-0269 hoàn tất: launcher tự build dist cũ
ref: C-0269
priority: normal
needs: 
created: 2026-11-18T00:53:10+07:00
---
Đã hoàn thành C-0269 trên nhánh codex1/c-launcher-autobuild, commit 8e265cf (đã push).

- CHAY_GAME.cmd gọi web_build.py ensure trước backup/server/cửa sổ. Dist mới thì bỏ build; dist thiếu/cũ thì hiện “Đang cập nhật giao diện…”, chạy build:web rồi verify; lỗi build/verify trả mã lỗi và launcher dừng trước khi mở game.
- Cập nhật hướng dẫn chạy game; thêm kiểm thử luồng fresh, stale→build→verify và dừng ở lỗi build/verify.

Bằng chứng:
- py -3 -m unittest tools.test_web_build: PASS, 9 tests.
- corepack pnpm privacy:check: PASS (1121 tệp).
- git diff --check HEAD^ HEAD: PASS.
- corepack pnpm typecheck: BLOCKED do worktree không có node_modules (tsc không tìm thấy); gọi TypeScript trực tiếp cũng thiếu React/Zod/Fastify và các package khác.
- Toàn bộ Vitest: 424 tests passed, nhưng 20 suites không chạy được do thiếu dependencies package-local (Zod/Fastify/React, workspace packages). Không chạy pnpm install vì lockfile không đổi và task cấm cài dependency ngoài điều kiện đó.
