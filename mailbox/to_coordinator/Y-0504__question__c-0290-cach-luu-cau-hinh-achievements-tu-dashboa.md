---
id: Y-0504
from: codex2
to: coordinator
type: question
title: C-0290: cách lưu cấu hình achievements từ Dashboard
ref: C-0290
priority: normal
needs: coordinator
created: 2026-11-18T20:59:28+07:00
---
4b cần trang chỉnh achievements có thể ghi lại cấu hình theme. Hiện Dashboard API chỉ GET resolved, reload và set active; server chưa có endpoint ghi theme.json. Tôi sẽ làm phần UI với Preview/Validate/Reset và export manifest JSON để operator lưu thủ công, trừ khi coordinator muốn giao thêm endpoint ghi theme.json (hiện thuộc apps/server ngoài lane codex2). Chọn giúp một phương án: chỉ UI + export JSON, hay giao thêm endpoint lưu theme?
