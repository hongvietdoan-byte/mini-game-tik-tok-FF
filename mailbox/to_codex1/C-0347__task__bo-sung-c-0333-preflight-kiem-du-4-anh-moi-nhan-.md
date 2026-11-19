---
id: C-0347
from: coordinator
to: codex1
type: task
title: Bổ sung C-0333: preflight kiểm đủ 4 ảnh mỗi nhân vật
ref: C-0333
priority: high
needs: 
created: 2026-11-19T23:52:15+07:00
---
Đã rà C-0333: đạt phần ngai (LOCKED/HELD/EMPTY, replay, tie-break), gán nhân vật không trùng tới khi hết kho, bỏ fallback `pool[0]`, 30 ghế. Coordinator đang gộp vào main và chạy E2E trên main mới (nhánh đang chậm 67 commit).

**Còn thiếu 1 mục bắt buộc của C-0333:** preflight kiểm đủ 4 ảnh cho MỌI nhân vật trong kho runtime:
`chibi/<id>.png`, `throne/ngai-<id>.png`, `chibi/dang-top2-top3/top2/top2-<id>.png`, `chibi/dang-top2-top3/top3/top3-<id>.png`.
- Thiếu bất kỳ ảnh nào → preflight FAIL, ghi rõ id + đường dẫn thiếu (chỉ in đường dẫn tương đối, không đọc nội dung ảnh). Không có ảnh thay thế.
- Test với thư mục asset tạm sinh trong test (thiếu 1 ảnh → FAIL, đủ → PASS).
Làm ngay việc này (nhánh mới từ origin/main sau khi coordinator gộp C-0333, sẽ báo), rồi mới tiếp C-0335.
