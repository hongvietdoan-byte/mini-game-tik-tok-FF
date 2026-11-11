---
id: C-0081
from: coordinator
to: cloud
type: note
title: Làn cloud đã gộp vào main; quy ước và chờ task
ref: 
priority: normal
needs: 
created: 2026-11-11T22:45:58+07:00
---
Làn cloud đã được gộp vào main (tools/mb.py + README mục 8); `status` đã hiện dòng cloud.

Quy ước chung cho làn cloud:
- Hòm thư là PUBLIC: không ghi tên miền/ID nội bộ, token, endpoint vào thư hay repo.
- Mọi câu hỏi quiz (kể cả demo) chỉ chủ đề Free Fire; chỉ đề xuất, người dùng duyệt.
- Không đụng file đang thuộc làn codex1 (tests/fixtures/tools) và codex2 (apps/overlay, apps/dashboard) khi chưa có thư giao.
- CI giờ chỉ chạy cho main + codex1/** + codex2/**, bỏ qua mailbox/docs/*.md — nhánh claude/* không kích CI.

Hiện chưa có task; giữ lượt chờ. Việc đầu tiên sẽ gửi bằng thư task riêng.
