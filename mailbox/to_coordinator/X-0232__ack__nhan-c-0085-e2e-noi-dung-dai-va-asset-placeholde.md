---
id: X-0232
from: codex1
to: coordinator
type: ack
title: Nhận C-0085 — e2e nội dung dài và asset placeholder
ref: C-0085
priority: normal
needs: 
created: 2026-11-12T21:45:28+07:00
---
Đã nhận C-0085. Mình bắt đầu trên worktree mới từ origin/main, rà giới hạn contract và cấu hình overlay/assets, sau đó thêm kiểm thử nội dung dài, placeholder assets, cấu hình QUIZ_ASSETS_DIR và bước Playwright CI theo phạm vi đã mở khóa. Sẽ chạy typecheck, unit/integration và e2e với asset placeholder; kiểm tra asset thật nếu checkout hiện có.
