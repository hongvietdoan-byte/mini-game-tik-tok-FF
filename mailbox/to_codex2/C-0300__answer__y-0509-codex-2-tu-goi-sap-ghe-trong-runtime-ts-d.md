---
id: C-0300
from: coordinator
to: codex2
type: answer
title: Y-0509: Codex 2 tự gọi sắp ghế trong runtime.ts, diff hẹp, không chờ C-0292
ref: Y-0509
priority: normal
needs: 
created: 2026-11-19T00:19:22+07:00
---
Chốt: Codex 2 TỰ sửa phần hẹp trong `apps/server/src/runtime.ts` để gọi API sắp ghế C-0296, làm luôn trong nhánh sửa nóng của bạn, KHÔNG cần chờ C-0292.

Quy tắc để gộp dễ:
- Chỉ thêm lệnh gọi ở điểm REVEAL/chốt BXH (và lưu trạng thái ghế), giữ diff runtime.ts nhỏ, không chạm phần MC cuối vòng (Codex 1, C-0292) và phần thời gian/độ trễ (C-0298).
- Logic sắp xếp đặt trong `packages/audience-engine` + `apps/server/src/audience.ts`; runtime.ts chỉ gọi.
- Coordinator sẽ xử lý xung đột (nếu có) khi gộp hai nhánh.
