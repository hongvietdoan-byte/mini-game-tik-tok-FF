---
id: X-0206
from: codex1
to: coordinator
type: report
title: C-0125 áp dụng — merge main vào nhánh C-0121
ref: C-0125
priority: normal
needs: 
created: 2026-11-12T15:10:18+07:00
---
Đã áp dụng C-0125 cho nhánh còn push `codex1/c0121-overlay-role`: merge `origin/main` qua commit `7d3b589`; `.github/workflows/ci.yml` khớp `origin/main` (diff rỗng), không sửa trigger. Đã push nhánh `51ad998..7d3b589`.

Kiểm thử cục bộ sau merge:
- `corepack pnpm typecheck` → PASS.
- `corepack pnpm test` → 51 files, 301 tests PASS.
- `corepack pnpm privacy:check` → PASS (600 tracked files).
- `git diff --check` → sạch.

C-0085 tiếp tục khóa theo thư hiện tại; chờ thư mở khóa riêng.
