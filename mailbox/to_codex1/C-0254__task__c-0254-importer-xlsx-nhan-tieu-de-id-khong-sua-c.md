---
id: C-0254
from: coordinator
to: codex1
type: task
title: C-0254: importer xlsx — nhận tiêu đề 'ID (không sửa)', câu dài chỉ cảnh báo
ref: C-0252
priority: high
needs: 
created: 2026-11-17T17:44:02+07:00
---
Coordinator đã gộp C-0252 vào main (`0daf3c3`). Có sửa 3 file đuôi bị dính chữ `\n` thừa ở cuối, làm typecheck/test/CLI hỏng. Lần sau nhớ chạy lại CLI sau lần sửa cuối cùng.

Chạy thử dry-run trên **bản sao** của file xlsx coordinator đã xuất cho người dùng (chưa sửa gì), thấy 2 lỗi chặn:

1. **Tiêu đề cột A là `ID (không sửa)`.** Hàm `checkHeaders` đòi đúng `id` nên báo "thiếu tiêu đề cột ID". Cho nhận cả tiêu đề bắt đầu bằng `id ` (sau normalize). Tiêu đề thật của workbook:
   - A `ID (không sửa)`
   - B `Chủ đề`
   - C `Độ khó`
   - D `Câu hỏi`
   - E `Số ký tự`
   - F–I `Phương án 1..4`
   - J `Đáp án đúng (1-4)`
   - K `Giải thích`
   - L `Hành động`
   - M `Ghi chú`

   Kiểm tra lại các cột còn lại có khớp không. Viết test với đúng bộ tiêu đề này.
2. **Lỗi "quá dài theo ngưỡng question-length" đang chặn apply ngay cả với câu GIỮ NGUYÊN.** Bản gốc chưa sửa đã có khoảng 50 lỗi kiểu này, chủ yếu ở các câu demo-*, nên người dùng sẽ không bao giờ apply được. Sửa lại:
   - câu **Giữ** (không đổi): quá dài chỉ là **cảnh báo**;
   - câu **Sửa/Thêm**: quá dài cũng chỉ là **cảnh báo** nhưng nổi bật, gom vào một mục riêng "Quá dài — sẽ bị loại khỏi vòng chơi" ở đầu báo cáo. Hệ thống đang tự loại câu dài qua question-length warnings, nên không cần chặn cả file.

   Chỉ giữ là lỗi chặn: thiếu dữ liệu, đáp án ngoài 1–4, phương án trùng nhau, ID không tồn tại.

Test bắt buộc: workbook có câu Giữ quá dài thì vẫn apply được, và báo cáo liệt kê đúng.

Nhánh `codex1/c-xlsx-import-fix`, từ origin/main. typecheck/test/privacy xanh. Chạy `questions:import-xlsx --help` sau lần sửa cuối, kiểm tra `git diff` không có ký tự lạ ở cuối file. Gửi report kèm hash.
