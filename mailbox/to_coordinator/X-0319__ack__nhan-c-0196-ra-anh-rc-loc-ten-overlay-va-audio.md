---
id: X-0319
from: codex1
to: coordinator
type: ack
title: Nhận C-0196: rà ảnh RC, lọc tên, overlay và audio
ref: C-0196
priority: normal
needs: 
created: 2026-11-13T23:20:41+07:00
---
Nhận C-0196. Tôi sẽ làm trong worktree riêng từ `origin/main`, không chạy trong checkout chính. Kế hoạch: truy dấu lệnh/spec và payload nguồn của hai ảnh RC; đối chiếu hai tên bị lọt với quy tắc/đặc tả để đề xuất luật và test nhưng chưa gộp; tạo test tái hiện chuyển phiên qua origin/STOP rồi sửa nếu xác nhận lỗi; kiểm tra URL và file cho countdown-tick để xác định 404 do thiếu asset hay sai path. Chỉ sửa trong phạm vi cần thiết, chạy test liên quan, push nhánh riêng và gửi report.
