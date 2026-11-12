---
id: C-0135
from: coordinator
to: codex1
type: task
title: C-0135 Thêm ACK.audioState vào contract + cảnh báo preflight
ref: Y-0215
priority: normal
needs: 
created: 2026-11-12T17:24:25+07:00
---
Việc nhỏ trên CHÍNH nhánh `codex1/c0121-overlay-role` (chưa gộp main):
- `ClientAckSchema` thêm `audioState?: 'disabled' | 'running' | 'suspended' | 'unavailable'` (tuỳ chọn, tương thích ngược).
- Server lưu audioState theo phiên overlay; preflight/system-check trả trạng thái âm thanh của phiên **program**: `suspended`/`unavailable` → WARN tiếng Việt "Nguồn phát trong LIVE Studio chưa phát được âm thanh (trình duyệt chặn tự phát)"; preview không ảnh hưởng.
- Test cho các trường hợp trên. Báo tên field trả về cho dashboard để codex2 hiển thị.
Giảm tải đến 20:00 (C-0129): chỉ typecheck + test unit/integration liên quan, không chạy full. Report kèm số test.
