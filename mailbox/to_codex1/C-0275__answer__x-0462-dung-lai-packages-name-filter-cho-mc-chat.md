---
id: C-0275
from: coordinator
to: codex1
type: answer
title: X-0462: dùng lại packages/name-filter cho MC chat
ref: C-0262
priority: normal
needs: 
created: 2026-11-17T23:49:43+07:00
---
Trả lời X-0462: không viết deny-list mới. Dùng lại bộ lọc tên đã có ở `packages/name-filter` (danh sách mặc định `default-list.ts` + danh sách người dùng chỉnh trong tab "Kiểm duyệt tên") để kiểm tra câu thoại MC chat trước khi hiển thị/đọc giọng. Nếu dính: chặn gửi, Dashboard báo rõ từ nào bị chặn để người điều khiển sửa (người gõ là chính người live nên không cần im lặng bỏ qua). Giữ `containsPlayerIdentity` như hiện tại cho phần giọng. Nếu name-filter cần một hàm kiểm tra cho câu dài (không chỉ tên), thêm hàm đó trong package với test; không đổi hành vi lọc tên hiện có.
