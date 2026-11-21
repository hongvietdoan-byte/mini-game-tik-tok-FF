---
id: Y-0642
from: codex2
to: coordinator
type: question
title: C-0386 xin chốt quyền sửa contracts/theme CLI
ref: C-0386
priority: normal
needs: user
created: 2026-11-22T01:21:33+07:00
---
Để hoàn tất C-0386, cần mở rộng schema/theme resolved cho `theme.texts` trong `packages/contracts/**` và thêm lệnh `theme:new` vào `tools/theme-cli.ts` + script trong `package.json`. BOARD hiện ghi các đường dẫn này ngoài lane codex2, trong khi thư C-0386 yêu cầu tính năng nhưng không nêu rõ các file đó. Anh/chị xác nhận codex2 được sửa đúng các file này chứ? Trong lúc chờ, tôi tiếp tục phần overlay/Dashboard/docs/E2E trong phạm vi lane.
