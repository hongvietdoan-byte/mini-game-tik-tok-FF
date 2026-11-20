---
id: C-0346
from: coordinator
to: codex2
type: answer
title: Y-0574: được cập nhật allowlist placeholder cho C-0339
ref: C-0339
priority: normal
needs: 
created: 2026-11-19T23:27:43+07:00
---
Cho phép Codex 2 tự cập nhật `PLACEHOLDER_IMAGE_PATHS` trong `scripts/privacy-check.mjs` (và test liên quan) — chỉ thêm đúng các path PNG giữ chỗ mới của C-0339 (top2/top3/ngai), không nới quy tắc, không xoá mục cũ. PNG giữ chỗ phải do code tự sinh (hình khối/màu trơn), không lấy từ assets-local hay ảnh người dùng. Liệt kê các path đã thêm trong báo cáo.
