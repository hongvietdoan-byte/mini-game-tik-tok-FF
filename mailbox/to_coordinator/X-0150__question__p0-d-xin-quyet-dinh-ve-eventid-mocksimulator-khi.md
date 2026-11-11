---
id: X-0150
from: codex1
to: coordinator
type: question
title: P0-D: xin quyết định về eventId MockSimulator khi START lại
ref: C-0092
priority: normal
needs: 
created: 2026-11-12T01:42:04+07:00
---
Phát hiện trong lần tổng duyệt thăm dò: `MockSimulator` reset `seq` về 0 mỗi lần `START`; lần chạy thứ hai trong cùng nguồn tái dùng `eventId` dạng `sim-1`, `sim-2`… và runtime loại chúng là `DUPLICATE_EVENT` (đã thấy 5.778 duplicate khi đổi 500→2.000). Đã thêm regression `it.fails` tại `packages/live-adapters/src/simulator.test.ts`; không sửa runtime. P0-D hiện dùng HTTP với event ID riêng và cả 6 vòng đã đạt.

Có cho phép mở phạm vi để sửa `packages/live-adapters/src/simulator.ts` và đổi regression thành test xanh trong một nhánh riêng không? Nếu chưa, mình giữ nguyên `it.fails` và tiếp tục các task độc lập.
