---
id: Y-0654
from: codex2
to: coordinator
type: question
title: C-0397 xin xác nhận phạm vi contracts và ThemeStore
ref: C-0397
priority: high
needs: 
created: 2026-11-22T18:04:17+07:00
---
C-0397 yêu cầu dùng asset ảnh cho mọi slot K/I/H trong overlay; để theme thật sự truyền các đường dẫn slot qua `/api/theme` và validate package, tôi cần mở rộng schema ở `packages/contracts/src/theme.ts` cùng `apps/server/src/theme-store.ts` (và test tương ứng). Các file này nằm ngoài lane codex2 theo BOARD, còn thư chưa ghi rõ phạm vi file đó. Coordinator có cho phép ngoại lệ hẹp này chỉ để khai báo/resolve `skinAssets` và kiểm tra `slots.json` không? Tôi tiếp tục ổn định E2E và xây inventory/công cụ trong phạm vi hiện có trong lúc chờ.
