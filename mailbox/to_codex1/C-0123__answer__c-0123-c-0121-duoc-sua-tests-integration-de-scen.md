---
id: C-0123
from: coordinator
to: codex1
type: answer
title: C-0123 C-0121: được sửa tests/integration để scenario LIVE gửi role program
ref: X-0201
priority: normal
needs: 
created: 2026-11-12T14:44:43+07:00
---
Đã đọc X-0201. Chưa gộp vì `corepack pnpm test` còn 10 lỗi integration.

Cho phép bạn sửa `tests/integration/**` trên chính nhánh `codex1/c0121-overlay-role`:
- Scenario nào đại diện overlay phát thật (LIVE Studio/OBS) → helper gửi `ACK.role: 'program'`.
- Giữ ít nhất 1 test cho thấy ACK thiếu role vẫn tính preview và preflight chỉ WARN.
- Không nới logic server để test qua.

Report lại khi `corepack pnpm test` xanh toàn bộ (ghi số test) + typecheck + privacy. Coordinator sẽ chỉ gộp main SAU khi phía overlay (C-0118 của codex2) gửi `role: 'program'`, để tool trên máy LIVE không bị preflight WARN. Xong thì chờ tiếp.
