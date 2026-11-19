---
id: C-0315
from: coordinator
to: codex2
type: task
title: C-0315: sửa tiếp BXH C-0307 — header lệch cột, lưới cột cố định, khung thẳng thẻ câu hỏi, Top 3 chặng loãng
ref: C-0314
priority: high
needs: 
created: 2026-11-19T13:28:52+07:00
---
Coordinator đã phóng to soi ảnh của C-0314 (nhánh `codex2/c-0314-reveal-rows`, 09705716). Số đo hàng/khoảng cách đã đạt, nhưng còn các lỗi sau. **Chưa gửi người dùng duyệt.** Sửa xong mới gửi lại.

## REVEAL — Top 3 nhanh nhất
1. **Tiêu đề cột lệch nội dung.** "NGƯỜI CHƠI" đang căn giữa trong khi tên căn trái. Header phải dùng đúng mép trái của cột tên; "HẠNG" căn giữa cột hạng; "GIÂY" căn phải đúng mép phải của số. Test: lệch giữa header và nội dung cột ≤ 1 px cho cả 3 cột.
2. **Cột nhảy theo độ dài tên.** Ảnh thường và ảnh tên dài có vị trí cột HẠNG khác nhau (khoảng 80 px so với 170 px trong ảnh zoom). Lưới cột phải cố định, không phụ thuộc dữ liệu. Test: x của 3 cột giống nhau giữa normal, long_name và tie.
3. **Bảng hẹp trong khung rộng.** Ở ảnh full, bảng chỉ chiếm khoảng 400/650 px chiều ngang khung, hai bên trống khoảng 120 px. Bảng phải dùng hết chiều rộng khung trừ padding 24 px.
4. **Khung lệch lưới.** Khung REVEAL thò sang phải quá mép phải thẻ câu hỏi (khoảng 1060 so với 1008). Mép trái và mép phải phải thẳng với thẻ câu hỏi phía trên. Test bbox: chênh ≤ 1 px.
5. **Tên dài sát số.** "Nguyễn Bảo Minh Tường Vi" chỉ cách "1,6" khoảng 10 px. Cần khoảng cách tối thiểu 24 px giữa tên và cột số; tên vượt quá thì cắt bằng "…". Thêm ca tên 32 grapheme.
6. **Đồng hạng 1.** Hai người cùng hạng 1 thì **cả hai hàng đều nhấn** (công bằng). Quy tắc "một hàng nhấn" áp dụng cho trường hợp không đồng hạng. Cập nhật test theo đó.

## Option B — Top 10 toàn trận
7. **Tiêu đề và header chạm mép vùng tối.** "TOP 10 TOÀN TRẬN" sát mép trái nền tối (x khoảng 35), "ĐIỂM" và "SAU CÂU 15" sát mép phải. Cần padding ngang ≥ 16 px.
8. **Cột hạng không thẳng.** Chấm màu trước số 2 và 3 đẩy chữ số lệch so với 1, 4–10. Số hạng phải thẳng một cột; nếu giữ huy hiệu thì đặt ở vị trí riêng, không làm lệch số. Test: tâm số hạng lệch ≤ 1 px giữa các hàng.
9. **"ĐIỂM" lệch số.** Header căn tới mép 838 trong khi số kết thúc ở 822. Phải thẳng mép phải số.
10. **Đáy trống khoảng 45 px.** Phân phối lại khoảng trống hoặc giảm chiều cao vùng bảng, đáy còn ≤ 24 px.

## Option B — Top 3 chặng
11. **Hàng phình 146 px với chữ 28 px.** Nhìn trống và loãng. Phải chọn một trong hai:
    - (a) tăng chữ tên/điểm lên khoảng 40–44 px để tỉ lệ hàng/chữ ≤ 2,5×;
    - (b) giữ hàng khoảng 64–72 px rồi căn cả khối giữa theo chiều dọc.
    Nên chọn (a). Header/padding sửa giống mục 7 và 9.

## Yêu cầu báo cáo
- Ảnh full và zoom cho REVEAL (normal/long/tie/tên 32 grapheme), Top 10 (normal/tie), Top 3 chặng (normal/tie). Chụp có `hud=1` để thấy không đè vùng bình luận TikTok.
- Số đo thật: x các cột theo từng ca, bbox khung so với thẻ câu hỏi, padding tiêu đề, khoảng trống đáy.
- Vẫn chỉ đổi trong phạm vi C-0307 và test của nó. Không commit ảnh.
