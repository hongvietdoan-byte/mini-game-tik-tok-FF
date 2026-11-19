---
id: C-0322
from: coordinator
to: codex2
type: task
title: C-0322 (bổ sung C-0320): ngai hỗ trợ ảnh chibi dáng ngồi riêng, có phương án dự phòng dáng đứng
ref: C-0320
priority: normal
needs: 
created: 2026-11-19T14:46:20+07:00
---
Bổ sung C-0320 (ngai vàng). Người dùng sẽ tự tạo **ảnh dáng ngồi riêng cho từng nhân vật chibi**: PNG trong suốt 600×600, nhìn thẳng, không vẽ ghế, chuẩn hoá đáy bbox ở y 570. Codex 1 làm công cụ và `seatedUrl` (C-0321).

Trong C-0320, thiết kế ngai phải hỗ trợ cả hai kiểu:
- **(a) Có ảnh ngồi:** đặt ảnh ngồi giữa lớp sau và lớp trước của ngai. Tay vịn lớp trước chỉ che hông/đùi, không che tay chống cằm.
- **(b) Chưa có ảnh ngồi:** dùng chibi đứng, lớp trước che chân như mô tả cũ.

Ảnh mẫu giai đoạn 1 làm cả hai kiểu. Với kiểu (a) chưa có ảnh thật thì dùng hình bóng giả (silhouette) đúng kích thước để kiểm tra vị trí. Ghi rõ toạ độ đặt ảnh ngồi (hông ở đâu so với nệm) để người dùng tạo ảnh khớp.
