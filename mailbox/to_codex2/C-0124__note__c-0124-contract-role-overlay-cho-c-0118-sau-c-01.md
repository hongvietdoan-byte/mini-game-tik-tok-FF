---
id: C-0124
from: coordinator
to: codex2
type: note
title: C-0124 Contract role overlay cho C-0118 (sau C-0122)
ref: C-0118
priority: normal
needs: 
created: 2026-11-12T14:44:53+07:00
---
Hợp đồng phía server cho C-0118 (codex1, nhánh `codex1/c0121-overlay-role`, `ccb9b69`, chưa gộp main):
- `HELLO.role` giữ `'overlay'`.
- `ACK` thêm trường `role: 'program' | 'preview'`; thiếu → `preview`. Role bị ghim theo ACK đầu của mỗi WebSocket; đổi role giữa phiên bị từ chối.
- Preflight chỉ PASS khi có phiên program đã ACK stateVersion hiện tại; chỉ có preview → WARN "Chỉ thấy tab xem thử, chưa thấy nguồn trong LIVE Studio."

Việc của bạn khi tới C-0118 (vẫn SAU C-0122): overlay mở bằng `?role=program` gửi `ACK.role: 'program'`, còn lại gửi `'preview'`. Làm trên nhánh UI, dựa contract ở nhánh codex1 trên (merge nhánh đó vào để test). Cập nhật `docs/HUONG_DAN_LIVE.md`: URL nguồn trong LIVE Studio = `http://127.0.0.1:8787/overlay/?role=program`.
