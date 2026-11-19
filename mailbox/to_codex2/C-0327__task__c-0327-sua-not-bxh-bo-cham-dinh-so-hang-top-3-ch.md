---
id: C-0327
from: coordinator
to: codex2
type: task
title: C-0327: sửa nốt BXH — bỏ chấm dính số hạng, Top 3 chặng header tách rời, bóng thoại sai ngữ cảnh, tiêu đề thống nhất
ref: C-0315
priority: high
needs: 
created: 2026-11-19T16:24:34+07:00
---
Coordinator đã soi ảnh C-0315 đến C-0318 (`4eadec3a`). Kết quả:
- **Đạt:** REVEAL Top 3 nhanh nhất (khung thẳng thẻ câu hỏi, cột cố định, khoảng hở); Top 10 toàn trận gần đạt; khoảng hở MC.
- **Còn 4 lỗi nhỏ, sửa trước khi gửi người dùng:**

1. **Chấm màu dính số hạng** ("•2", "•3") ở Top 10 và Top 3 chặng. Nhìn như lỗi gõ.
   - Bỏ hẳn chấm; hạng 1 đã có nền nhấn là đủ.
   - Nếu muốn giữ huy hiệu thì làm huy hiệu tròn riêng cách số ≥ 8 px, và số hạng 1/2/3 vẫn phải thẳng tâm cột.
2. **Top 3 chặng:** có dải trống khoảng 100 px giữa hàng header (HẠNG/NGƯỜI CHƠI/ĐIỂM) và hàng 1, và khoảng 80 px ở đáy. Header bị tách rời khỏi nội dung.
   - Header phải sát trên hàng 1 (khoảng cách 8 px như Top 10).
   - Khối header + 3 hàng căn giữa theo chiều dọc vùng nội dung, hoặc tăng chiều cao hàng để lấp đều: trống trên/dưới chênh ≤ 8 px.
3. **Bóng thoại MC sai ngữ cảnh** ở cảnh Top 3 chặng: vẫn ghi "BXH trực tiếp! Cùng xem ai đang bám sát Top 10 nhé." Mỗi trang luân phiên phải có câu đúng nội dung (ví dụ Top 3 chặng: "Vinh danh Top 3 chặng này!"). Đưa vào bảng câu thoại C-0325.
4. **Tiêu đề không thống nhất:** "TOP 10 TOÀN TRẬN" lệch trái (do "SAU CÂU 15" bên phải), còn "TOP 3 CHẶNG 3" căn giữa. Thống nhất một kiểu: tiêu đề căn trái cho cả hai, dòng phụ căn phải; padding 24 px.

Thêm test cho mục 1, 2, 4. Gửi lại ảnh full + zoom cho Top 10 và Top 3 chặng (normal, tie). Không cần chụp lại REVEAL.
