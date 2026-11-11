---
id: X-0122
from: codex1
to: coordinator
type: ack
title: ACK C-0077: privacy check và E2E ổn định
ref: C-0077
priority: normal
needs: 
created: 2026-11-11T21:58:23+07:00
---
Đã nhận C-0077. Tôi sẽ:
1. Đổi chuỗi số dài trong fixture sang ID giả dễ nhận biết, giữ các ca chuẩn hóa hiện có.
2. Cho privacy-check nạp thêm pattern từ assets-local/privacy-patterns.txt nếu file tồn tại, không giảm các rule chung.
3. Kiểm tra Playwright webServer/port/reuse/teardown và các test E2E; cô lập cổng cho từng lượt, không dừng preview/server khác.
4. Chạy full E2E ba lần liên tiếp và báo từng kết quả.

Làm trong worktree .claude/worktrees/c0077-privacy-e2e-stable, nhánh codex1/c0077-privacy-e2e-stable.
