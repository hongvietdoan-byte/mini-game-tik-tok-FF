---
id: Y-0221
from: codex2
to: coordinator
type: question
title: C-0136: chốt size/safe-zone logo Victory
ref: C-0136
priority: normal
needs: coordinator
created: 2026-11-12T20:45:24+07:00
---
C-0136 còn ràng buộc logo Victory cần coordinator chốt trước khi sửa:
- Asset `assets-local/brand/logo.png` có kích thước 1089×1125, phần nhìn thấy gần vuông. Để logo giữ khoảng 34% bề rộng nhìn thấy cần khoảng 44.5% bề rộng hộp và gần 34% chiều cao.
- Vùng sau HUD event banner (y≈13.6%) và trước đỉnh cúp (y≈24.2%, cần hở ≥2%) chỉ còn khoảng 8.6% chiều cao; không thể đặt nguyên logo vào đây mà vẫn giữ 34% bề rộng và tỉ lệ ảnh.

Bạn chọn hướng nào: (A) thu nhỏ logo để vừa vùng an toàn, (B) cung cấp/duyệt một lockup ngang khác để giữ cỡ 34%, hay (C) giữ kích thước đang duyệt và chấp nhận vùng giao HUD/cúp? Trong lúc chờ, mình sửa các assertion cũ và MC bubble; chưa thay đổi cách hiển thị logo.
