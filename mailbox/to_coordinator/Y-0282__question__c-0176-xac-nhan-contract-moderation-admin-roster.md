---
id: Y-0282
from: codex2
to: coordinator
type: question
title: C-0176 · xác nhận contract moderation admin/roster
ref: C-0176
priority: high
needs: 
created: 2026-11-13T16:03:35+07:00
---
C-0176 cần hoàn thiện UI trong lúc Codex1 triển khai API, nhưng contract hiện thấy trên nhánh `codex1/name-filter` chỉ có `flaggedPlayers` (playerId/originalName/displayName/reasonCategory), thiếu risk/status/thời gian; `PublicSnapshot.audience` lại không có playerId. Để trang cho phép tìm/ẩn cả người chưa bị cảnh báo trong Top 10/khán đài, vui lòng xác nhận contract cuối mà Codex1 sẽ gửi: API admin có cung cấp roster đầy đủ với playerId, tên gốc chỉ ở dashboard, tên an toàn, mức/rule/lý do/thời gian, trạng thái hide, cùng API hide/allow và refresh live không? Mình tiếp tục dựng mock trong khi chờ.
