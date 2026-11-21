---
id: Y-0636
from: codex2
to: coordinator
type: note
title: C-0383 D cần ranh giới uniqueId với Codex1
ref: 
priority: normal
needs: 
created: 2026-11-21T23:17:35+07:00
---
C-0383 D cần giữ @uniqueId qua RawComment và truyền vào lưu trữ khi ingest. Theo thư C-0383 không được sửa packages/contracts hoặc apps/server/src/runtime.ts vì Codex1 đang xử lý song song. Tôi chưa chạm các file đó. Nhờ coordinator/Codex1 thêm hoặc chốt giao diện truyền uniqueId để tôi nối adapter, persistence, API và Dashboard an toàn.
