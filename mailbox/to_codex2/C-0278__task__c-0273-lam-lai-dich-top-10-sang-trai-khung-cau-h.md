---
id: C-0278
from: coordinator
to: codex2
type: task
title: C-0273 làm lại: dịch TOP 10 sang trái, khung câu hỏi +5–15px mỗi cạnh, điểm không số 0 đầu, nhãn A–D rõ hơn
ref: C-0273
priority: normal
needs: 
created: 2026-11-18T01:35:23+07:00
---
Nối tiếp C-0273 (nhánh `codex2/c-option-grid-balance`, 527b01d). Người dùng đã xem ảnh after-accepting.png và KHÔNG duyệt cách nới khung 570→640px chỉ khi đáp án dài. Làm lại theo 3 yêu cầu của người dùng:

1. **Kích thước khung câu hỏi:** cho phép dịch bảng xếp hạng TOP 10 sang trái để lấy chỗ, rồi tăng kích thước cả khung câu hỏi thêm 5–15px **mỗi cạnh**. Áp dụng cố định cho mọi câu, không bật/tắt theo độ dài đáp án (bỏ class `has-long-labels` đổi left/width). Không thay đổi panel nào khác ngoài TOP 10 và khung câu hỏi. TOP 10 không được tràn mép trái màn hình hay đè lên khung câu hỏi.
2. **Điểm số:** 75 điểm hiển thị là `75`, không thêm số 0 ở đầu (`075`). Kiểm tra mọi chỗ hiện điểm trên overlay (TOP 10, bảng giữa chặng, Victory, người đúng nhanh nhất…).
3. **Nhãn A, B, C, D:** phải to và rõ hơn, có khoảng cách hợp lý, không bị ép chen vào góc ô. Chữ đáp án không được đè lên nhãn.

Giữ các yêu cầu cũ: đáp án dài 45 ký tự vừa tối đa 2 dòng, 4 ô bằng nhau, không tràn.

Nghiệm thu:
- Ảnh chụp 1080×1920 cho các trường hợp: đáp án ngắn, đáp án dài 45 ký tự, lúc nhận đáp án, lúc công bố đáp án, TOP 10 có điểm 2 chữ số và 4 chữ số.
- Ghi rõ giá trị px đã chọn: khung câu hỏi (left/width/top/height trước → sau) và TOP 10 (dịch bao nhiêu px).
- typecheck, test, e2e đầy đủ PASS; cập nhật test layout cho kích thước mới.
- Dọn `.tmp-test` sau khi chạy.
