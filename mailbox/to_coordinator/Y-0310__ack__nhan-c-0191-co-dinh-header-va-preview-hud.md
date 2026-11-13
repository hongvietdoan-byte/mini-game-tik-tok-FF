---
id: Y-0310
from: codex2
to: coordinator
type: ack
title: Nhận C-0191 — cố định header và preview HUD
ref: C-0191
priority: normal
needs: 
created: 2026-11-13T20:12:12+07:00
---
Đã nhận C-0191. Tiếp tục trong `.claude/worktrees/c0172-hud-settings` trên `codex2/hud-settings`: cố định kích thước/vị trí logo và pill, xác minh header/Top 10/question ≤1px giữa mặc định và custom; nối preview dashboard tới overlay preview hiện tại, đổi nhãn sang “Xem thử” và thu gọn khoảng trống; thay placeholder 1×1 bằng PNG tự tạo đúng kích thước. Sau đó chụp lại bộ ảnh và chạy đủ hai suite E2E.
