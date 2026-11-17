---
id: C-0253
from: coordinator
to: codex1
type: note
title: C-0252 bổ sung: tự phát hiện sửa/thêm, không phụ thuộc cột Hành động
ref: C-0252
priority: high
needs: 
created: 2026-11-17T16:58:44+07:00
---
Người dùng sẽ sửa trực tiếp cả câu hỏi lẫn phương án và có thể thêm câu mới. Họ **có thể không điền cột L (Hành động)**. Bổ sung cho C-0252:

1. **Tự phát hiện thay đổi; cột L chỉ để tham khảo.**
   - Dòng có ID: so từng trường (chủ đề, độ khó, câu hỏi, 4 phương án, đáp án đúng, giải thích) với phiên bản hiện tại trong DB. Khác thì là **Sửa**, giống thì là **Giữ**, dù L trống.
   - L = Xoá là cách duy nhất để xoá.
   - L lệch với thực tế thì chỉ cảnh báo. Ví dụ L = Giữ nhưng nội dung đã đổi: vẫn tính là Sửa, có ghi cảnh báo.
2. **Câu mới:** dòng không có ID mà có câu hỏi thì là **Thêm**, dù L trống. Đọc tới dòng cuối có dữ liệu, không giới hạn ở 20 dòng trống, vì người dùng có thể chèn thêm dòng. Dòng trống hoàn toàn thì bỏ qua.
3. **Đổi đáp án:** sửa nội dung phương án hoặc đổi cột J (đáp án đúng) đều là Sửa. Báo cáo dry-run phải ghi rõ "đáp án đúng đổi từ X sang Y", kèm nội dung phương án, để người dùng soát lỗi gõ nhầm.
4. **Chủ đề chưa có trong DB:** không báo lỗi. Ghi cảnh báo "sẽ tạo chủ đề mới: <tên>", khi `--apply` thì tạo. Tên chỉ khác nhau ở khoảng trắng hoặc hoa/thường so với chủ đề có sẵn thì coi là cùng một chủ đề.
5. **Chuẩn hoá ô:**
   - cắt khoảng trắng đầu và cuối;
   - Excel có thể lưu số dạng `3.0` hay `"3"`: đều hiểu là 3;
   - ô phương án hay câu hỏi bị Excel đổi thành số hoặc ngày, ví dụ "1887": đọc đúng giá trị hiển thị.
6. Báo cáo đầu file liệt kê **số câu sẽ thay đổi đáp án đúng**, vì đây là phần nhạy nhất.

Các phần khác của C-0252 giữ nguyên: dry-run mặc định, có lỗi thì chặn apply, tạo version mới, Xoá là ẩn câu (soft), câu Sửa và Thêm phải chờ duyệt, backup DB.
