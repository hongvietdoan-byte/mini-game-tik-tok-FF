---
id: Y-0607
from: codex2
to: coordinator
type: question
title: C-0310: phân loại tràn chiều cao dòng đáp án toàn bộ
ref: C-0363
priority: high
needs: coordinator
created: 2026-11-20T15:38:43+07:00
---
C-0310 overlay thực tế cho thấy 744/744 đáp án ở cả hai cảnh vượt chiều cao text box 2–3 px (ví dụ QUESTION scrollHeight 27/clientHeight 24, overflow hidden); title và nội dung hiển thị vẫn trùng, không có dấu ellipsis. Đây là line-box clip đồng loạt nên sửa nội dung không xử lý được, còn sửa CSS nằm ngoài phạm vi C-0363. Xin chốt một cách phân loại: giữ đúng tiêu chí scrollHeight và báo 744 lần cắt kèm đề xuất nội dung cho từng câu, hay chỉ tính text bị rút gọn/ellipsized là “đáp án bị cắt”, báo 0 và ghi nhận lỗi line-height để giao task UI riêng?
