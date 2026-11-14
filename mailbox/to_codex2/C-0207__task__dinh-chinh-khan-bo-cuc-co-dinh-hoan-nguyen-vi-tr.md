---
id: C-0207
from: coordinator
to: codex2
type: task
title: ĐÍNH CHÍNH KHẨN: bố cục cố định — hoàn nguyên vị trí khung Top 10/câu hỏi, chỉ bỏ lớp che nền cờ
ref: C-0205
priority: high
needs: 
created: 2026-11-14T11:56:33+07:00
---
ĐÍNH CHÍNH KHẨN — lỗi của coordinator, không phải của bạn. Thay thế C-0197 mục A, C-0202 mục 3 và C-0205.

Người dùng nhắc lại quy định đã có từ trước (C-0127): VỊ TRÍ khung BXH Top 10 và khung câu hỏi là CỐ ĐỊNH, không được di chuyển; hai khung này ĐƯỢC PHÉP đè lên nền có cờ. Yêu cầu "dời khung xuống dưới dải cờ" trong C-0197-A là coordinator hiểu sai — hủy bỏ.

Việc cần làm (dừng C-0205 đang làm):
1. Hoàn nguyên toàn bộ việc dời bố cục: khung Top 10, khung câu hỏi, đồng hồ, bong bóng MC, MC Kelly và khán đài 35 ghế trở về ĐÚNG vị trí/kích thước như trên `origin/main` hiện tại (sai lệch ≤ 1px, thêm e2e so số đo với main). Bỏ luôn "MC bán thân + dời ghế" vì vấn đề MC che ghế chỉ phát sinh do việc dời bố cục.
2. Phần nền: giữ thay đổi duy nhất là BỎ lớp `v3-question-banner-mask` để nền `bg-question-user.jpg` (có 8 cờ) hiện nguyên vẹn phía sau; các khung đè lên cờ là đúng ý người dùng. Không co kéo/đổi tỉ lệ nền.
3. Header A/B: chỉ thay đổi trong phạm vi ô tên sự kiện + ô vòng/số người chơi + pill (theo B2 đã duyệt), KHÔNG kéo theo bất kỳ khung nào khác. Nếu cỡ B2 không đạt safe-zone khi các khung giữ nguyên vị trí thì báo số đo cụ thể, không tự dời khung.
4. Thẻ "NHANH NHẤT" A/B: đặt trong vùng bong bóng MC hiện có (vị trí cố định), không làm xê dịch khung/ghế nào.
5. Áp dụng cho các nhánh `codex2/c0168-header-size`, `codex2/hud-settings`, `codex2/c0197-fastest-correct` (và nhánh khác nếu đã nhiễm thay đổi bố cục). Chụp lại: question, reveal, fastest A, fastest B, Top 10 giữa vòng — với header A và B. Chạy đủ e2e. Report kèm bảng số đo "main · nhánh" cho từng khung.

Quy tắc từ nay: mọi thư giao việc UI mặc định "không di chuyển khung đã duyệt"; nếu thư của coordinator mâu thuẫn với quy định bố cục cố định, hãy hỏi lại trước khi làm.
