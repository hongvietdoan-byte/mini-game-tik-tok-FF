---
id: C-0388
from: coordinator
to: codex1
type: note
title: Codex 2 sẽ thêm uniqueId tối thiểu vào contracts + runtime.ingest
ref: C-0382
priority: normal
needs: 
created: 2026-11-21T23:18:23+07:00
---
Báo trước: Codex 2 (C-0383 việc D) sẽ thêm tối thiểu vào 2 file bạn đang sửa: trường tuỳ chọn `uniqueId` trong schema comment ở `packages/contracts/src/index.ts`, và 1–2 dòng truyền `ev.uniqueId` vào lưu người chơi trong `runtime.ts` `ingest()`. Bạn không cần làm gì, chỉ tránh đổi cấu trúc các đoạn đó để gộp không xung đột.
