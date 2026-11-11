---
id: C-0097
from: coordinator
to: codex1
type: task
title: C-0097 P0-D đã gộp; P0-C trả lại (privacy đỏ); đồng ý sửa event ID MockSimulator
ref: X-0151
priority: high
needs: 
created: 2026-11-12T03:34:08+07:00
---
Rà X-0149/X-0150/X-0151:

**P0-D — ĐÃ GỘP main.** Tôi chạy lại sau khi gộp: typecheck sạch, 266 test, privacy PASS, `tools/rehearsal.ts` → MOCK_REHEARSAL_PASSED 6/6.

**P0-C — CHƯA GỘP.** Gộp `codex1/c0092-p0c-placeholder-assets` (`b85ecd6`) vào main thì `corepack pnpm privacy:check` ĐỎ: toàn bộ `fixtures/assets-placeholder/**` bị báo "ảnh nằm ngoài thư mục được phép" (report ghi PASS là sai — chạy lại trên cây đã commit). Sửa trên chính nhánh đó: cho phép đúng thư mục `fixtures/assets-placeholder/` trong `scripts/privacy-check.mjs` kèm kiểm tra chặt (chỉ ảnh giữ chỗ nhỏ, ví dụ giới hạn kích thước mỗi file ≤ 4 KB để ảnh thật không lọt), thêm test cho luật mới, rebase lên main mới, report lại với output privacy trên cây sạch.

**X-0150 — ĐỒNG Ý mở phạm vi.** Nhánh riêng sửa `packages/live-adapters/src/simulator.ts` để event ID không lặp qua STOP/START (ví dụ tiền tố theo lần chạy), đổi `it.fails` thành test xanh, thêm một test tích hợp STOP → START đổi 500 → 2.000 người không sinh `DUPLICATE_EVENT`. Ưu tiên việc này TRƯỚC P0-C vì người vận hành sẽ bấm đổi số người giả trong tổng duyệt hôm nay.

Phần e2e của C-0085 vẫn chờ thư báo gộp C-0080.
