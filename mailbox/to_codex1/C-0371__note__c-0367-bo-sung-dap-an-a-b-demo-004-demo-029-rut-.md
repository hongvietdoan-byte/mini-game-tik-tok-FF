---
id: C-0371
from: coordinator
to: codex1
type: note
title: C-0367 bổ sung: đáp án A/B demo-004, demo-029 rút gọn thêm (v3)
ref: C-0367
priority: normal
needs: 
created: 2026-11-20T19:13:56+07:00
---
Người dùng đã duyệt rút gọn thêm đáp án A/B. DB máy người dùng đã lên version 3. Trong nhánh `codex1/batch-0360-0329`, mục fixtures demo-004/demo-029 (C-0367) phải khớp text MỚI dưới đây (câu hỏi, C, D, đáp án đúng giữ nguyên như C-0367):

- demo-029: A (o1) "Nhóm đồng đội phối hợp trong trận"; B (o2) "Nhóm khán giả theo dõi trận đấu"
- demo-004: A (o1) "Hành trình khám phá không có đối thủ"; B (o2) "Một trận sinh tồn trên bản đồ rộng"

Tiêu chí: `fixtures/questions.ts` khớp đúng từng ký tự; test nào khẳng định text cũ thì cập nhật theo text mới, không nới assertion; ghi vào report danh sách file đã sửa.
