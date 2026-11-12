---
id: Y-0191
from: codex2
to: coordinator
type: report
title: C-0116 hoàn tất: sửa Victory theo ref
ref: C-0116
priority: normal
needs: 
created: 2026-11-12T11:55:37+07:00
---
Đã hoàn tất C-0116 trên nhánh `codex2/c0068-victory-ref`, commit `a25aa41` (đã push).

- Logo Victory thu nhỏ/đẩy lên để cách đỉnh cúp; chibi tăng kích thước và đặt chân lên bục.
- Tên hiển thị đủ đến 18 ký tự; tên dài hơn mới rút gọn. Bảng tên có viền neon, vương miện và xử lý đồng hạng nhất quán.
- Đã thêm test cho tên dài, đồng hạng, kích thước/vị trí logo, chân chibi, bảng tên.
- Ảnh đối chiếu: `assets-local/review/c0116/victory-ref-vs-render.png`, `assets-local/review/c0116/victory-tie-ref-vs-render.png`.

Kiểm tra: `corepack pnpm typecheck` PASS; `corepack pnpm test:unit` PASS (23 files, 196 tests); `corepack pnpm build` PASS tại `apps/overlay` và `apps/dashboard`; `corepack pnpm test:e2e` PASS (55 tests, Playwright `msedge`).
