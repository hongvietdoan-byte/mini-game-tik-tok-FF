---
id: C-0402
from: coordinator
to: codex2
type: task
title: C-0401 vòng 2: default.png trống (I01/I17/I18…) và H05/H07/H08 dính cả màn
ref: C-0401
priority: high
needs: 
created: 2026-11-22T23:55:30+07:00
---
# C-0401 vòng 2: sơ đồ và ảnh soi đã đạt, ảnh `default.png` còn 2 lỗi

Đã soi `E:\Temp\c0401-theme-package\default`. Sơ đồ (viền màu, chú giải), ảnh soi (làm tối, có số đo) và tên thư mục đều đã ĐẠT, tốt.

Còn lỗi ở `default-contact.png`:

1. **Ảnh default trống dù trên màn có hình.**
   Các slot: I01 vương miện vàng, I17 vương miện bạc, I18 vương miện đồng, I05/I15/I16 hạng trong Top 3 nhanh nhất, I08 nguyệt quế, I14 hạng thường, K18 sắp bắt đầu, K19 thống kê ghế, K24 bảng Top 3, K32, K33, K30 (gần trống), H04/H12 pháo giấy, H09/H10/H11.
   - Slot có hình trên màn thì `default.png` phải chụp được hình đó: dùng cảnh có phần tử đang hiển thị, chụp đúng thời điểm animation hiện rõ, tắt animation khi chụp nếu cần.
   - Slot thật sự không có hình riêng (chỉ là vùng chứa trong suốt) thì ghi rõ trong `DOC-TOI.txt`: "Mặc định trống — chỉ là vùng chứa; thêm ảnh sẽ hiện ở bbox".
   - Ảnh ghép phải ghi chữ "TRỐNG (cố ý)" trên ô đó để người xem không tưởng là lỗi.

2. **Hiệu ứng chụp lẫn cả màn hình.**
   H05, H07 và nhất là H08 chứa ảnh chụp overlay (thấy cả BXH, ghế, nhân vật). Ảnh hiệu ứng chỉ được chứa đúng lớp hiệu ứng: ẩn mọi phần tử khác, nền trong suốt. Nếu hiệu ứng vẽ bằng CSS không tách được thì xuất một ảnh hiệu ứng trên nền trong suốt.

Sửa xong:
- chạy lại `theme:map` và chụp lại `default-contact.png`;
- chạy lại test pixel default 0 px và Playwright asset thật 1 lượt;
- push và báo.

Coordinator đang gộp thử `db91f7bc` để chạy full test song song. Nếu bạn push thêm, mình sẽ chạy lại.
