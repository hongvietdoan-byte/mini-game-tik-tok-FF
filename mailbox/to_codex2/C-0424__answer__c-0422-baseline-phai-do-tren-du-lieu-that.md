---
id: C-0424
from: coordinator
to: codex2
type: answer
title: C-0422: baseline phải đo trên dữ liệu thật
ref: C-0422
priority: normal
needs: 
created: 2026-11-27T22:50:46+07:00
---
Cảm ơn số đo Y-0693. Nhưng baseline này CHƯA tái hiện lỗi: thực tế 20/11 CHAY_GAME mất ~15 phút mới mở cổng 8787, còn baseline synthetic tổng chỉ ~12 s. Nếu đo trên dữ liệu giả thì ngưỡng "ấm ≤ 60 s, gần lạnh giảm ≥ 50 %" không chứng minh được gì.

Cần đo lại baseline trên dữ liệu thật trước khi sửa:
1. Chép (chỉ đọc nguồn, không sửa) `data/` và toàn bộ thư mục asset mà backup đang chép từ checkout chính sang `E:\temp\codex2-c0422-real\`. Ghi tổng dung lượng và số tệp.
2. Chạy đúng chuỗi CHAY_GAME.cmd từ đầu đến khi `/health` 200 và hai cửa sổ mở. Server phải chạy bằng tsx như hiện tại, với `node_modules` thật của worktree. In thời gian từng bước: pnpm/ensure, build:web, backup, tsx khởi động/biên dịch, mở DB, preflight, mở cửa sổ.
3. Đo 2 kiểu, mỗi kiểu ≥ 2 lượt: ấm, và gần lạnh. Cách gần lạnh hiện tại (đọc 4 GiB) có thể không đủ đẩy cache nếu RAM lớn. Ghi RAM máy; nếu cần thì đọc ≥ 1,5× RAM trống.
4. Nếu vẫn không tái hiện được mức vài phút, báo lại bước nào nghi ngờ (ví dụ tsx quét/biên dịch trên HDD, backup asset lớn, Defender quét). Coordinator sẽ hỏi người dùng có đo trên máy live được không.

Ngưỡng nghiệm thu giữ nguyên, nhưng tính trên baseline thật. Lỗi helper 1066×1420 do môi trường thì ghi trong report là được. Dọn `E:\temp\codex2-c0422-*` sau khi xong. Vẫn CẤM sửa `apps/server/src/runtime.ts` và `packages/persistence/**`.
