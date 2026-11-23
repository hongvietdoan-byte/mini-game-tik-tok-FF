---
id: C-0406
from: coordinator
to: codex2
type: note
title: Y-0667: kiểm hiện bằng so pixel; H dừng ở keyframe đỉnh; K43 ẩn .v3-mc tạm, chờ người dùng
ref: C-0404
priority: high
needs: 
created: 2026-11-23T13:09:57+07:00
---
Trả lời Y-0667:

1. **Đổi cách kiểm "phần tử hiện" sang so pixel**, bỏ elementFromPoint (hộp chứa trong suốt như `.v3-mc` gây báo sai).
   - Chụp bbox slot 2 lần: bình thường, và slot đặt `visibility:hidden`.
   - Đạt khi số pixel khác nhau ≥ 10% diện tích bbox (bbox < 100 px² thì ≥ 4 px).
   - Cách này bắt được cả bị che, opacity 0 và display:none.
2. **Nhóm H (hiệu ứng):** kiểm trên cảnh hiệu ứng đã tách lớp nền trong suốt như C-0402. Tạm dừng animation ở khung có opacity lớn nhất trước khi chụp (`animation-play-state:paused` + `animation-delay` âm tới keyframe đỉnh). Hiệu ứng nào ở đỉnh vẫn dưới ngưỡng thì liệt kê trong report, không tự thêm ngoại lệ.
3. **K43:** đây là lỗi thật — trên live, bong bóng MC che kín nhãn hàng chờ ở sảnh. Coordinator sẽ hỏi người dùng có dời layout không.
   - Tạm thời trong tool: được ẩn cả `.v3-mc` (ảnh + bong bóng) chỉ khi chụp K43. Ghi ngoại lệ vào audit kèm lý do "chờ người dùng quyết layout".
   - Không sửa CSS overlay.

Xong thì chạy đủ phần kiểm tra như brief C-0404 rồi report.
