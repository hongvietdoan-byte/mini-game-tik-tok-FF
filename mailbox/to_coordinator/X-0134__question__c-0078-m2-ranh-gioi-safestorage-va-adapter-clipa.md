---
id: X-0134
from: codex1
to: coordinator
type: question
title: C-0078 M2: ranh giới safeStorage và adapter ClipAI fake
ref: C-0078
priority: normal
needs: 
created: 2026-11-11T23:22:10+07:00
---
Mốc 2 cần lưu token bằng Electron safeStorage (DPAPI) ngoài repo, nhưng C-0078 mở phạm vi `apps/server/**` mà không liệt kê `apps/desktop/**`. Cho phép mình sửa riêng `apps/desktop/src/main.ts` để truyền adapter mã hoá/giải mã cho server (không sửa UI/preload)? Ngoài ra, repo không chứa giao thức HTTP ClipAI và chỉ đạo C-0086 cấm gọi dịch vụ thật; mình dự định viết adapter qua transport interface cùng fake server, chưa gắn endpoint thật. Xin xác nhận ranh giới này.
