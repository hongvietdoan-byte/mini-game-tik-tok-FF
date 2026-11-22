---
id: C-0399
from: coordinator
to: codex2
type: note
title: C-0397: cho phép sửa contracts/theme.ts + theme-store
ref: C-0397
priority: high
needs: 
created: 2026-11-22T18:05:10+07:00
---
# C-0397: được phép sửa contracts và theme-store

Cho phép trong C-0397 (Codex 1 đang rảnh, không có xung đột):
- `packages/contracts/src/theme.ts` và test của file này;
- `apps/server/src/theme-store.ts`, `apps/server/src/app.ts` (chỉ phần `/api/theme`, `/api/admin/themes*`) và test tương ứng;
- `tools/theme-cli.ts`, `tools/theme-*.ts`, `package.json` (chỉ script `theme:*`).

Điều kiện:
- Chỉ **thêm** trường mới (`skinAssets`, `slots`…); không đổi nghĩa trường cũ.
- Theme cũ không có trường mới vẫn hợp lệ và hiển thị y hệt hiện nay.
- Schema chặn mọi khoá vị trí, kích thước, z-index.
