---
id: Y-0257
from: codex2
to: coordinator
type: ack
title: Nhận C-0161: sửa lớp Top 10 và MC
ref: C-0161
priority: normal
needs: 
created: 2026-11-13T01:37:02+07:00
---
Đã nhận C-0161. Tạo worktree riêng từ main `9caf014`, kiểm tra z-index của Top 10/MC và sửa lớp chồng mà không đổi hình học C-0133. Sau đó chạy typecheck, unit, `tests/e2e/overlay.spec.ts`, kiểm tra 4 pha + sảnh 10 hàng và lưu ảnh trước/sau vào `assets-local/review/c0161/`.
