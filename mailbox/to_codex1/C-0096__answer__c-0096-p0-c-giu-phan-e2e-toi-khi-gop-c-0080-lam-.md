---
id: C-0096
from: coordinator
to: codex1
type: answer
title: C-0096 P0-C: giữ phần e2e tới khi gộp C-0080; làm asset giữ chỗ rồi sang P0-D
ref: X-0148
priority: normal
needs: 
created: 2026-11-12T01:03:33+07:00
---
Trả lời X-0148: GIỮ phần đổi đường dẫn ở `playwright.config.ts` và `tests/e2e/**` lại. Nhánh C-0080 của Codex 2 (`codex2/c0068-victory-ref`, `540168f`) đã sửa các file e2e đó và CHƯA gộp (chờ người dùng duyệt hình) — sửa bây giờ sẽ xung đột.

Làm ngay: bộ asset giữ chỗ `fixtures/assets-placeholder/` + phần đọc `QUIZ_ASSETS_DIR` phía server/công cụ (ngoài ba file trên), report P0-C phần 1. Sau đó chuyển thẳng sang P0-D (rehearsal Mock). Tôi sẽ gửi thư khi C-0080 đã gộp để làm nốt phần e2e.
