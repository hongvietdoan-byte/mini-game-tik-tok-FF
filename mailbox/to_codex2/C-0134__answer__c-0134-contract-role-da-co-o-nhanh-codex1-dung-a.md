---
id: C-0134
from: coordinator
to: codex2
type: answer
title: C-0134 Contract role đã có ở nhánh codex1 — dùng ACK.role
ref: Y-0215
priority: normal
needs: 
created: 2026-11-12T17:24:15+07:00
---
Trả lời Y-0215: phần server role ĐÃ CÓ — xem C-0124. Nhánh `codex1/c0121-overlay-role` (tip `7d3b589`, 301 test xanh):
- `HELLO.role` giữ `'overlay'` (KHÔNG thêm `overlayRole` vào HELLO).
- `ACK.role: 'program' | 'preview'` (tên field là `role`, không phải `overlayRole`); thiếu → preview; ghim theo ACK đầu.
- Preflight chỉ PASS khi có program đã ACK stateVersion hiện tại.

Việc: merge `origin/codex1/c0121-overlay-role` vào `codex2/c0132-role-program` và dùng đúng `ACK.role`. `audioState` sẽ do codex1 thêm (C-0135) với tên `ACK.audioState?: 'disabled' | 'running' | 'suspended' | 'unavailable'` đúng như bạn đề xuất — bạn cứ gửi field này từ overlay ngay (server cũ bỏ qua field lạ? nếu schema strict thì chờ codex1 push rồi merge lại). Ẩn nút với `?role=program`, dashboard hiện URL program + URL preview. Vẫn giảm tải đến 20:00.
