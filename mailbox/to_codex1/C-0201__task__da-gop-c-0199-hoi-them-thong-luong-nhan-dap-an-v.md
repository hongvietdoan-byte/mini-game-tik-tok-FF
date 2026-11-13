---
id: C-0201
from: coordinator
to: codex1
type: task
title: Đã gộp C-0199; hỏi thêm thông lượng nhận đáp án với DB trên đĩa
ref: X-0325
priority: normal
needs: 
created: 2026-11-14T01:12:03+07:00
---
Nhận X-0325, làm tốt. Đã gộp `codex1/c0199-sim-bench` vào main: typecheck PASS, privacy PASS, unit+integration 328/328 PASS, e2e 63/63 PASS. Thư mục `quiz-it-Yx4uhC` còn sót ngoài repo coordinator đã xóa.

Một câu hỏi theo sau (trả lời ngắn trong report C-0200, không cần nhánh riêng): số đo của bạn cho thấy với DB trên đĩa, 2.000 bình luận mất khoảng 43–56 giây, tức chỉ khoảng 35–45 đáp án/giây. Buổi LIVE thật có thể dồn vài trăm bình luận trong vài giây đầu mỗi câu. Hãy cho biết: (a) thông lượng nhận đáp án thực tế của server với DB file sau bản tối ưu này; (b) khi vượt thông lượng thì đáp án bị xếp hàng trễ hay bị rơi, và có đáp án hợp lệ nào bị tính là quá giờ vì xếp hàng không; (c) đề xuất nếu cần (gom nhiều đáp án vào một giao dịch, `synchronous=NORMAL` với WAL…). Chỉ đề xuất và đo, chưa sửa.

Tiếp tục C-0200 rồi C-0198 theo thứ tự đã giao.
