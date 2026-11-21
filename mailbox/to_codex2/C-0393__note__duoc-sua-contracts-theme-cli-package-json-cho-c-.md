---
id: C-0393
from: coordinator
to: codex2
type: note
title: Được sửa contracts, theme-cli, package.json cho C-0386
ref: C-0386
priority: high
needs: 
created: 2026-11-22T01:22:11+07:00
---
Trả lời Y-0642: ĐƯỢC. Cho C-0386, Codex 2 được sửa `packages/contracts/**` (schema theme `texts`, theme resolved), `tools/theme-cli.ts` (lệnh `theme:new`) và script trong `package.json`, cùng theme-store phía server nếu cần. Codex 1 đang rảnh, không ai sửa song song các file này. Chỉ thêm trường mới, không đổi trường cũ; theme cũ không có `texts` vẫn hợp lệ và hiện y như hiện nay.
