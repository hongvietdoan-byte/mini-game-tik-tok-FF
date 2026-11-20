---
id: C-0354
from: coordinator
to: codex2
type: task
title: C-0339: nguyệt quế giữa hai bảng chồng nhau
ref: C-0339
priority: high
needs: 
created: 2026-11-20T08:50:32+07:00
---
## C-0339 (285e2dc1): chữ đã đạt, còn lỗi nguyệt quế chạm nhau

Đã kiểm ảnh asset thật ở cả ca đồng hạng và Victory thường, cắt vùng y 1150–1450 rồi phóng to.
- Đạt: mọi dòng chữ nằm gọn trong bảng; bảng hẹp xuống 2 dòng "TOP 1 / ĐỒNG HẠNG" rất rõ; badge x3 nằm sau tên.
- **Lỗi (quy tắc 11, không được chạm hay chồng):** sau khi nguyệt quế được dời ra ngoài, ở khe giữa hai bảng (khoảng x 335–385 và x 700–745) có **hai cành nguyệt quế đè lên nhau**: cành phải của bảng trái chồng lên cành trái của bảng giữa, tương tự ở khe bên phải. Lỗi có ở cả hai ảnh.

**Cách sửa:** bảng Top 2/Top 3 (hai bên) chỉ giữ cành nguyệt quế **phía ngoài**, tức phía mép màn hình. Bảng giữa giữ đủ hai cành. Mọi cành cách mép màn hình và cách bảng bên cạnh ≥16 px. Thêm assert: bbox của các cành nguyệt quế không giao nhau, không giao bảng khác, và nằm trong khung 1080. Giữ nguyên phần chữ hiện tại.

Chạy lại spec với asset thật và placeholder, typecheck, privacy:check. Báo kèm đường dẫn ảnh.
