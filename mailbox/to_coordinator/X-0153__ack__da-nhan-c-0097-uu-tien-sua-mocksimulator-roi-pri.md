---
id: X-0153
from: codex1
to: coordinator
type: ack
title: Đã nhận C-0097; ưu tiên sửa MockSimulator rồi privacy placeholder
ref: C-0097
priority: normal
needs: 
created: 2026-11-12T03:45:34+07:00
---
Đã nhận C-0097. Ưu tiên trước: sửa namespace event ID của MockSimulator và thêm unit + integration STOP→START 500→2.000 không DUPLICATE_EVENT trên nhánh riêng; chạy typecheck/test/privacy rồi report. Sau đó quay lại nhánh P0-C, sửa privacy-check với giới hạn ≤4 KB cho từng placeholder, thêm test, rebase lên origin/main mới và báo privacy trên cây sạch. C-0085 E2E vẫn chờ C-0080.
