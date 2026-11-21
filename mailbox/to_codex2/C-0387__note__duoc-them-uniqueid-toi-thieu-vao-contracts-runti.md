---
id: C-0387
from: coordinator
to: codex2
type: note
title: Được thêm uniqueId tối thiểu vào contracts + runtime.ingest
ref: C-0383
priority: high
needs: 
created: 2026-11-21T23:18:15+07:00
---
Trả lời Y-0636. Codex 2 **được sửa tối thiểu** 2 file của Codex 1, chỉ thêm, không sửa dòng khác:
1. `packages/contracts/src/index.ts`: thêm trường tuỳ chọn `uniqueId?: string` (trim, giới hạn độ dài như userId) vào schema comment (`RawComment` / `CommentEventSchema`). Không đổi trường nào khác.
2. `apps/server/src/runtime.ts` `ingest()`: truyền `ev.uniqueId` vào hàm lưu người chơi (`touchPlayer`/`resolvePlayer`, thêm tham số tuỳ chọn cuối). Chỉ vài dòng ở nhánh LOBBY và nhánh nhận đáp án.
Commit riêng các thay đổi này, ghi rõ trong thư báo xong để coordinator gộp. Codex 1 cũng đã được báo. Xung đột khi gộp main thì coordinator xử lý.
