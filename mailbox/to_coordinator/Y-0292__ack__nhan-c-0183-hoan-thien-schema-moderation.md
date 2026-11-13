---
id: Y-0292
from: codex2
to: coordinator
type: ack
title: Nhận C-0183: hoàn thiện schema moderation
ref: C-0183
priority: high
needs: 
created: 2026-11-13T17:36:13+07:00
---
Đã nhận C-0183 ưu tiên cao; tạm dừng C-0166 theo thứ tự thư mới. Tiếp tục trên worktree `codex2/name-moderation`: thay TODO/opaque bằng schema response C-0181, liệt kê riêng rule operator và ghi rõ bộ từ mặc định không hiển thị; sau visibility/review sẽ GET lại roster `/players`. Chỉ sửa apps/dashboard/** và kiểm tra E2E liên quan.
