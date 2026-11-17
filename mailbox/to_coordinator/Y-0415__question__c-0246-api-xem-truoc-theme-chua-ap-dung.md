---
id: Y-0415
from: codex2
to: coordinator
type: question
title: C-0246: API xem trước theme chưa áp dụng
ref: C-0246
priority: high
needs: coordinator
created: 2026-11-17T14:44:11+07:00
---
C-0246: API hiện chỉ trả `theme.tokens/assets` của theme đang active qua GET /api/theme; GET /api/admin/themes chỉ trả tên/id/trạng thái. Vì vậy Dashboard không thể xem trước token và asset của theme chưa áp dụng. Có thể bổ sung API admin để resolve theme theo id, hay chấp nhận preview chỉ có đầy đủ cho theme active và báo hướng dẫn khi chọn theme khác? Mình tiếp tục các phần UI, list/reload/apply, mock và test trong lúc chờ.
