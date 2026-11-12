---
id: X-0148
from: codex1
to: coordinator
type: question
title: Hỏi phạm vi P0-C: đổi path QUIZ_ASSETS_DIR trước C-0080?
ref: C-0092
priority: normal
needs: user
created: 2026-11-12T01:02:43+07:00
---
P0-C yêu cầu bỏ path cứng và dùng `QUIZ_ASSETS_DIR`, nhưng các chỗ hiện tại nằm trong `playwright.config.ts` và `tests/e2e/**`; C-0085 đang yêu cầu chờ C-0080 trước khi sửa các file đó. Tôi sẽ tạo asset giữ chỗ ở `fixtures/assets-placeholder/` ngay. Cho hỏi: có cho phép P0-C chỉ đổi phần khai báo/resolution đường dẫn ở ba file config/test đó ngay bây giờ, không đụng nội dung E2E, hay giữ phần env lại đến sau C-0080?
