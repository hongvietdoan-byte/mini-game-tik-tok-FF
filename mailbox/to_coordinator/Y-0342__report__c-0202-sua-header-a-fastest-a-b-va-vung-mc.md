---
id: Y-0342
from: codex2
to: coordinator
type: report
title: C-0202: sửa header A, fastest A/B và vùng MC
ref: C-0202
priority: normal
needs: 
created: 2026-11-14T11:42:44+07:00
---
Đã xử lý C-0202 trên hai worktree riêng, không gộp vào main.

## C0168 — header A
- Ô vòng giữ cỡ chữ 36/52/24px, tăng chiều cao từ 99 lên 108px và phân khoảng cách ba dòng; thêm e2e kiểm tra các dòng không giao nhau và card vẫn trong safe-zone y=15..124.
- Nhánh `codex2/c0168-header-size`, commit `4a81e6c` — đã push.
- Kiểm tra: `corepack pnpm typecheck` PASS; `corepack pnpm build:web` PASS; `corepack pnpm test` PASS (55 files, 332 tests); `corepack pnpm test:e2e` PASS (67/67, gồm safe-zone; FPS avg 120, p5 117.6).
- Ảnh trước: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0168-header-size\.claude\review\C0202\before-header-a.png`
- Ảnh sau: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0168-header-size\.claude\review\C0202\option-a-question.png`

## C0197 — fastest A/B và MC
- Fastest A có thêm khoảng dọc; kịch bản tên 24 ký tự + `12,3 giây` kiểm tra ellipsis và nội dung nằm trọn trong card. MC thu thành bán thân và chỉ áp dụng khi có thẻ fastest; dời vùng 35 ghế để không chồng MC/thẻ. E2E đo tên, lưng ghế, chibi cho cả A/B.
- Nhánh `codex2/c0197-fastest-correct`, commit `ff9317b` — đã push.
- Kiểm tra: `corepack pnpm typecheck` PASS; `corepack pnpm build:web` PASS; `corepack pnpm test` PASS (57 files, 340 tests); `corepack pnpm test:e2e` PASS (74/74, FPS avg 120, p5 116.3).
- Ảnh trước: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0197-fastest-correct\.claude\review\C0202\before-fastest-a.png`, `before-fastest-b.png`
- Ảnh sau: `...\.claude\review\C0202\after-fastest-a.png`, `after-fastest-a-long.png`, `after-fastest-b.png`, `after-mc-a.png`, `after-mc-b.png` (trong worktree C0197 ở trên).

## Dọn thư mục tạm
Hệ thống tự động chặn các lệnh xóa `.tmp-test` dù đã xác minh đường dẫn nằm dưới worktree C0168. Không né cơ chế chặn; thư mục chưa được dọn và không có file nào trong đó được stage/commit. Cần dọn thủ手 công sau khi xem xét.

Chờ người dùng chọn header A/B và fastest A/B.
