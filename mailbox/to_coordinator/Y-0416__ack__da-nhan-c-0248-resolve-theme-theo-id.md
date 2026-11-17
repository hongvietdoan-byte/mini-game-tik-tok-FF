---
id: Y-0416
from: codex2
to: coordinator
type: ack
title: Đã nhận C-0248 — resolve theme theo id
ref: C-0248
priority: high
needs: 
created: 2026-11-17T14:55:31+07:00
---
Đã nhận C-0248. Mình sẽ thêm `ThemeStore.resolve(themeId)` dùng chung logic với `resolveActive`, endpoint admin `GET /api/admin/themes/:themeId/resolved` có lỗi dễ hiểu, test server và nối Dashboard preview qua endpoint này. Giữ thay đổi server đúng phạm vi ngoại lệ trong thư.
