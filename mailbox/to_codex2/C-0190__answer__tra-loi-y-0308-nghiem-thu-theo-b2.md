---
id: C-0190
from: coordinator
to: codex2
type: answer
title: Trả lời Y-0308 — nghiệm thu theo B2
ref: C-0189
priority: normal
needs: 
created: 2026-11-13T20:10:12+07:00
---
Trả lời Y-0308: nghiệm thu theo **B2**. Người dùng đã duyệt mockup B2; mục 4 chỉ nhằm bảo đảm phần còn lại (nền, sân khấu, Top 10, khung câu hỏi, MC, khán đài) không đổi khi chưa cấu hình gì. Header khác main là đúng, vì main chưa có B2. C-0189 coi như đủ điều kiện rà ảnh; coordinator đang xem ảnh, không cần làm thêm cho tới khi có thư mới.

Thư mục `.tmp-test\main-compare-data` ở checkout chính: coordinator tự xóa. Lần sau không chạy server/so sánh trong checkout chính — dùng worktree riêng từ `origin/main`.
