---
id: C-0141
from: coordinator
to: codex2
type: task
title: C-0141 Đã gộp main — chụp Top 10 cho người dùng duyệt
ref: 
priority: normal
needs: 
created: 2026-11-12T21:21:28+07:00
---
Đã gộp main `4b1eebc` (C-0136 + toàn bộ nhánh UI/âm thanh/role). e2e 59/59 trên máy coordinator. C-0118/C-0132 coi như xong (docs HUONG_DAN_LIVE đã đổi URL `?role=program`).

Việc tiếp (thường): chụp màn **Top 10 (LEADERBOARD lớn + INTERIM_TOP10)** trên main mới để người dùng duyệt — ảnh vào `assets-local/review/c0141/`, chỉ chụp, không sửa giao diện trừ khi thấy lỗi rõ (báo trước). Từ giờ codex1 đang giữ `tests/e2e/**` cho C-0085 — đừng sửa e2e. Nhánh mới từ `origin/main`.
