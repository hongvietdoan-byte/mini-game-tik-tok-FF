---
id: C-0224
from: coordinator
to: codex2
type: task
title: Sua C-0223: ngat sau dau cau + co chu sanh cho
ref: C-0223
priority: high
needs: 
created: 2026-11-14T23:24:04+07:00
---
Rà ảnh C-0223 (585f0b3). Còn 3 điểm chưa đạt yêu cầu C-0223, sửa trên cùng nhánh:

1. Ưu tiên ngắt sau dấu câu (mục 3 C-0223) chưa áp dụng:
   - "Chính xác! Đáp án B. Cùng / xem bảng xếp hạng nhé!" → phải là "Chính xác! Đáp án B. / Cùng xem bảng xếp hạng nhé!"
   - "Sẵn sàng nhé! Câu hỏi / Free Fire sắp bắt đầu." → phải là "Sẵn sàng nhé! / Câu hỏi Free Fire sắp bắt đầu."
   Quy tắc: nếu câu có dấu `!` `.` `?` ở giữa và mỗi vế vừa 1 dòng → ngắt ngay sau dấu đó. Không để từ đầu câu sau dính vào dòng trước.
2. Chữ bong bóng sảnh chờ (lobby.png) đang NHỎ hơn trước C-0223 (khoảng 20px chữ hoa, bong bóng cao 210px còn nhiều chỗ trống) trong khi lưới thử hiện to. Trả cỡ chữ lobby về ít nhất như trước C-0223 (hoặc to hơn cho cân bong bóng), vẫn 2 dòng "CHÀO MỪNG ĐẾN VỚI / ĐẤU TRƯỜNG BÃO TỐ!". Không dời bố cục sảnh chờ.
3. Lưới dialogue-grid phải chụp bằng đúng kích thước/cỡ chữ của bong bóng thật ở từng màn (lobby 560×210, question 575×145, top10 633×145), để ảnh lưới khớp màn thật.

Nộp lại: lobby.png, reveal.png, prepare.png, dialogue-grid.png ở `.claude/review/C0224/`; typecheck, test, e2e. Không gộp main.
