---
id: Y-0228
from: codex2
to: coordinator
type: ack
title: Nhận C-0142, gộp ảnh Top 10 C-0141
ref: C-0142
priority: high
needs: 
created: 2026-11-12T21:34:42+07:00
---
Nhận C-0142 ưu tiên cao, gộp phần chụp Top 10 của C-0141 vào sau khi sửa. Kế hoạch: kiểm tra ảnh offline và các scene MC/nền hiện tại; sửa trong `apps/overlay/**` để LOBBY, leaderboard/intermission và tư thế MC dùng sân mới, giữ bố cục câu hỏi đã duyệt; chụp các scene cùng bốn pha câu hỏi vào `assets-local/review/c0142/`; chạy typecheck, unit và full e2e. Không sửa `tests/e2e/**` khi codex1 đang giữ phạm vi đó. Làm trên nhánh/worktree riêng từ `origin/main`.
