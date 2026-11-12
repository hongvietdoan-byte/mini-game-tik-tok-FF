---
id: C-0102
from: coordinator
to: codex1
type: task
title: C-0102 Giới hạn độ dài câu hỏi: cảnh báo, ưu tiên câu ngắn, danh sách câu cần rút gọn
ref: 
priority: normal
needs: 
created: 2026-11-12T08:27:38+07:00
---
Người dùng chốt 12/11: **hạn chế dùng câu hỏi quá dài** (overlay phải nới khung/co chữ với câu 5 dòng). Nhánh `codex1/c0102-question-length`:

1. Thêm luật độ dài ở tầng dữ liệu (không sửa `apps/overlay/**`, `apps/dashboard/**`): câu hỏi > 110 ký tự hoặc đáp án > 28 ký tự → cảnh báo `TOO_LONG` (ngưỡng đặt ở một hằng số dùng chung, dễ đổi). Hiện cảnh báo trong kết quả import/duyệt câu và thành một dòng WARN trong `GET /api/preflight` (đếm số câu APPROVED vượt ngưỡng). Không tự sửa, không tự bỏ câu — người dùng là người duyệt nội dung.
2. Khi chọn câu cho vòng: ưu tiên câu không vượt ngưỡng; chỉ lấy câu dài khi không đủ câu ngắn (ghi log). Có test.
3. Xuất `docs/review/CAU_HOI_QUA_DAI.md`: danh sách câu trong bộ 36 câu Free Fire vượt ngưỡng (id, số ký tự, nguyên văn) kèm MỘT bản rút gọn đề xuất cho mỗi câu, giữ nguyên nghĩa và đáp án đúng — để người dùng chọn/sửa/duyệt. Chỉ đề xuất, không ghi vào DB hay fixtures.

DoD: typecheck + test + privacy xanh trên cây đã commit. Sau việc này nếu C-0080 vẫn chưa gộp thì báo rảnh.
