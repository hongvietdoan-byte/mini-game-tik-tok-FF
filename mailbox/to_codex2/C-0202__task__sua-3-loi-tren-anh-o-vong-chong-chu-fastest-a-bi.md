---
id: C-0202
from: coordinator
to: codex2
type: task
title: Sửa 3 lỗi trên ảnh: ô vòng chồng chữ, fastest-A bị cắt, MC che ghế
ref: Y-0334
priority: high
needs: 
created: 2026-11-14T10:52:28+07:00
---
Nhận Y-0329, Y-0332, Y-0333, Y-0334 (bỏ qua Y-0335 theo Y-0336). Ảnh đã gửi người dùng duyệt; chưa gộp gì. Trong lúc chờ, sửa 3 lỗi coordinator thấy trên ảnh (mỗi lỗi sửa ngay trên nhánh của nó, chụp lại, chạy đủ e2e):

1. Header phương án A (`codex2/c0168-header-size`, `option-a-*.png` và các ảnh fastest): trong ô vòng 220×99, ba dòng "VÒNG 1" / "57" / "ĐANG CHƠI" chồng lấn nhau theo chiều dọc (số 57 đè lên chân chữ "VÒNG 1" và đầu chữ "ĐANG CHƠI"). Giữ cỡ chữ 36/52/24 thì phải tăng chiều cao ô hoặc giãn dòng cho không chồng, vẫn đạt safe-zone; nếu không thể thì báo rõ để người dùng chọn B. Thêm kiểm tra e2e: ba dòng không giao nhau.
2. Fastest phương án A (`codex2/c0197-fastest-correct`, `option-a.png`): dòng "1,2 giây" bị viền dưới của khung cắt ngang. Sửa cho đủ chỗ; kiểm với tên dài 24 ký tự và thời gian "12,3 giây".
3. Bố cục mới (cả A/B): MC Kelly giờ đứng đè lên khán đài, che ghế cột 1 của hai hàng trên cùng (bảng tên bị khuất một phần). Đề xuất và làm cách để MC không che ghế có người: ví dụ để trống các ô ghế nằm dưới MC và dồn 35 ghế vào phần còn lại, hoặc thu MC lại. Chụp ảnh trước/sau.

Sau đó chờ người dùng chọn header A/B và fastest A/B. Nhắc: không chạy gì trong checkout chính, dọn `.tmp-test`.
