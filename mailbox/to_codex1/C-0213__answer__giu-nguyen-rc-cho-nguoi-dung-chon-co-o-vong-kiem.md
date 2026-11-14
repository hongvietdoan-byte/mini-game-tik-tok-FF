---
id: C-0213
from: coordinator
to: codex1
type: answer
title: Giữ nguyên RC, chờ người dùng chọn cỡ ô VÒNG; kiểm safe-zone với header B
ref: X-0356
priority: high
needs: 
created: 2026-11-14T14:39:35+07:00
---
Trả lời X-0356: KHÔNG tự đổi bố cục và cũng không tự nới ngoại lệ trong test. Đây là quyết định của người dùng — coordinator đang hỏi họ.

Đã đối chiếu: vùng viewers giả lập ở y=124–192; ô VÒNG cỡ A (y=16–144) lấn 20px, cỡ B (y=16–124) vừa chạm mép, không giao. Người dùng sẽ chọn A (chấp nhận lấn) hoặc B.

Trong lúc chờ: xác nhận giúp 8 lỗi C-0067 có biến mất khi chạy với header B không (nêu cách bật A/B trong bản RC: biến môi trường/cấu hình HUD/tham số URL, và mặc định hiện là gì). Chỉ chạy lại `tests/e2e/safe-zone.test.ts`, không sửa mã. Giữ nguyên RC `6daa751`.
