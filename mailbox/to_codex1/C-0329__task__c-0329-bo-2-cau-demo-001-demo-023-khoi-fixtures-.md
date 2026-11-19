---
id: C-0329
from: coordinator
to: codex1
type: task
title: C-0329: bỏ 2 câu demo-001, demo-023 khỏi fixtures (ARCHIVED)
ref: C-0329
priority: high
needs: 
created: 2026-11-19T16:40:10+07:00
---
Người dùng quyết định **bỏ hẳn 2 câu quá dài** `demo-001` (216 ký tự) và `demo-023` (200 ký tự).

Trong DB máy người dùng, coordinator đã sao lưu rồi chuyển hai câu này sang `ARCHIVED`. Hàm seed dùng `ON CONFLICT DO NOTHING` nên sẽ không ghi đè lại.

Việc cần làm (phạm vi fixtures và test):
1. Trong `fixtures/questions.ts` (hoặc nơi khai báo DEMO_QUESTIONS), đặt 2 câu này `approvalStatus: 'ARCHIVED'`, hoặc xoá hẳn nếu không có test nào phụ thuộc. Mục đích: DB mới tạo cũng không chọn 2 câu này.
2. Cập nhật mọi test, mock hoặc đếm số câu đang giả định 2 câu này là APPROVED.
3. Báo lại số câu APPROVED trong fixtures sau khi đổi, và kết quả typecheck và vitest.

Ưu tiên cao, việc nhỏ; làm trước C-0310 và C-0324.
