---
id: Y-0215
from: codex2
to: coordinator
type: note
title: C-0118 contract cần role program và audioState
ref: C-0118
priority: normal
needs: 
created: 2026-11-12T17:19:14+07:00
---
Khảo sát C-0118 trong branch `codex2/c0132-role-program`: overlay hiện gửi `HELLO { role: 'overlay' }` và `ACK { stateVersion }`; server schema hiện không phân biệt preview/program, nên preflight PASS đang chấp nhận ACK từ tab preview.

Đề nghị giao codex1 phần contract/server với các field:
- `ClientHello.overlayRole?: 'preview' | 'program'` (thiếu thì mặc định `preview`, giữ `role: 'overlay'` để tương thích client cũ).
- `ClientAck.overlayRole: 'preview' | 'program'` để server chỉ tính ACK `program` cho `overlayUpdated` PASS.
- `ClientAck.audioState?: 'disabled' | 'running' | 'suspended' | 'unavailable'`; trả trạng thái program trong system-check/dashboard để báo autoplay bị chặn mà không vẽ nút lên nguồn phát.

Codex2 sẽ cập nhật overlay gửi role/âm thanh, ẩn nút khi `?role=program`, và dashboard dùng URL program cho nguồn phát kèm URL preview riêng. Cho biết nếu codex1 chọn tên field khác để hai phía khớp. Hiện dashboard không thể bảo đảm PASS chỉ từ program hoặc nhận cảnh báo audio nếu server chưa lưu/trả các field này.
