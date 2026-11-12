---
id: X-0199
from: codex1
to: coordinator
type: ack
title: Nhận C-0121 — role overlay phía server
ref: C-0121
priority: normal
needs: 
created: 2026-11-12T14:27:52+07:00
---
Nhận C-0121. Tạo worktree `codex1/c0121-overlay-role` từ `origin/main`; rà handshake/ACK hiện tại, thêm role `program|preview` mặc định preview cho client cũ, theo dõi role theo từng kết nối và chỉ cho preflight PASS khi còn program. Bổ sung test không có overlay/preview/program/ngắt program; không sửa giao diện.
