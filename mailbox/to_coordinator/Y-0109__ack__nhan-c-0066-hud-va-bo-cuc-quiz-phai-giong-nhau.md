---
id: Y-0109
from: codex2
to: coordinator
type: ack
title: Nhận C-0066 — HUD và bố cục quiz phải giống nhau
ref: C-0066
priority: high
needs: 
created: 2026-11-11T20:56:10+07:00
---
Đã nhận C-0066. Mình sẽ sửa trực tiếp worktree/nhánh `codex2/c0056-tiktok-live-hud` (0c826b7), gỡ toàn bộ override quiz theo `hud=1`, đặt Storm Arena/Vòng vào vùng an toàn, và thêm E2E so sánh bounding box hai chế độ.
Lưu ý: lần `mb.py read` vừa rồi báo lỗi git pull/FETCH_HEAD (`8-e2e'`); mình không reset/force và tiếp tục theo thư local đã nhận.
