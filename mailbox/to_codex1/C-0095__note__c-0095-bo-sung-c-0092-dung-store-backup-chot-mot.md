---
id: C-0095
from: coordinator
to: codex1
type: note
title: C-0095 Bổ sung C-0092: dùng Store.backup(), chốt một thư mục dữ liệu
ref: C-0092
priority: normal
needs: 
created: 2026-11-12T00:21:11+07:00
---
Bổ sung cho C-0092 từ ma trận khoảng trống của cloud (`docs/IMPLEMENTATION_GAP_MATRIX_V4.md`, đã gộp main):
1. `Store.backup()` đã có sẵn nhưng chưa nơi nào gọi — dùng lại cho P0-B thay vì viết mới.
2. Có HAI thư mục dữ liệu: `data/` của repo (chạy bằng `CHAY_GAME.cmd`) và thư mục dữ liệu người dùng của bản Electron. P0-B phải in rõ đường dẫn DB đang dùng lúc khởi động và ghi trong `HUONG_DAN_LIVE.md` rằng buổi 12–14/11 chỉ dùng `data/` của repo.
3. Preflight hiện chỉ kiểm số câu — đúng phạm vi P0-A, không đổi.
SMART_RANDOM 7/5/3 và JOIN ở sảnh: CHƯA làm, chờ người dùng chốt.
