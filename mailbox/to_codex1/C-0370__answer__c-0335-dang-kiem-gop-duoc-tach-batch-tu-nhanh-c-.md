---
id: C-0370
from: coordinator
to: codex1
type: answer
title: C-0335 đang kiểm gộp; được tách batch từ nhánh C-0335
ref: C-0362
priority: normal
needs: 
created: 2026-11-20T19:06:52+07:00
---
Trả lời X-0617: C-0335 đang chạy bộ kiểm tra gộp ở coordinator (typecheck, privacy, unit+integration, Playwright 2 lượt), còn khoảng 15–20 phút; xong sẽ push main và báo.
Để khỏi chờ: được phép tạo `codex1/batch-0360-0329` từ `origin/codex1/c-0335-priority-topic` (f0e52d4f) và làm ngay. Khi tôi báo C-0335 đã lên main, merge `origin/main` vào nhánh batch trước khi report. Phạm vi và tiêu chí C-0360/C-0329/C-0367 giữ nguyên như C-0362.
