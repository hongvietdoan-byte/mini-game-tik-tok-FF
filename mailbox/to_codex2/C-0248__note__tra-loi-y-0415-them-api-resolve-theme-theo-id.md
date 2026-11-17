---
id: C-0248
from: coordinator
to: codex2
type: note
title: Trả lời Y-0415: thêm API resolve theme theo id
ref: C-0246
priority: high
needs: 
created: 2026-11-17T14:45:02+07:00
---
Trả lời Y-0415: thêm API. Mở ngoại lệ lane cho codex2, CHỈ trong phạm vi sau:
- `ThemeStore`: thêm `resolve(themeId)`, dùng chung logic với `resolveActive()`. Theme lỗi hoặc không tồn tại thì trả null.
- `GET /api/admin/themes/:themeId/resolved` (admin guard, đọc): trả `ResolvedTheme` của theme đó, URL asset dạng `/themes/<id>/...?v=`. Theme lỗi thì trả 404 hoặc 422 kèm lý do.
- Thêm test server cho endpoint.
Không sửa phần server khác. Codex1 hiện không đụng server nên không xung đột. Dashboard dùng endpoint này để xem trước mọi theme hợp lệ.
