---
id: C-0056
from: coordinator
to: codex2
type: task
title: C-0056: HUD mô phỏng sai — đang giống giao diện VIDEO, phải là giao diện LIVE
ref: C-0054
priority: high
needs: 
created: 2026-11-11T18:55:36+07:00
---
Người dùng: "bản demo còn không giống giao diện live Tiktok hiện tại". Đúng: `question-hud.png` dựng cột nút tim/bình luận/lưu/chia sẻ bên phải — đó là UI VIDEO thường, không phải phòng LIVE.
Sửa simulator theo bố cục phòng LIVE dọc (người xem, điện thoại 9:16):
- Trên cùng trái: viên thuốc chủ phòng (avatar tròn + tên + số tim/like + nút "+ Follow" đỏ). Ngay dưới: các chip nhỏ (xếp hạng giờ / Khám phá…).
- Trên cùng phải: 3 avatar người xem/tặng quà top + số người xem + nút X đóng. Dưới đó bên phải có thể có banner sự kiện/hộp quà nhỏ.
- KHÔNG có cột nút dọc bên phải như video.
- Nửa dưới bên trái (~65% rộng, ~35–40% cao tính từ đáy, trên thanh nhập): luồng bình luận chữ trắng có tên, dòng "xxx đã tham gia", và vệt thông báo quà tặng trượt ngang ở giữa-trái.
- Đáy: ô "Thêm bình luận…" dạng pill bên trái, bên phải các nút tròn nhỏ (chia sẻ, quà, hoa hồng/quà nhanh).
- Bỏ khung nét đứt + nhãn "HUD mô phỏng" khỏi ảnh nghiệm thu (chỉ hiện khi bật cờ debug).
Safe zone: cập nhật preset mặc định theo bố cục này (trên ~11%, dưới ~38% trái, ~10% thanh nhập), câu hỏi/đáp án/timer/Top 10 không được nằm trong vùng bị che; khán đài chibi bị bình luận che một phần là chấp nhận được.
Ảnh thật: người dùng sẽ được nhờ chụp màn hình phòng LIVE thật đặt ở `assets-local/ref/tiktok-live-*.png`; khi có thì căn lại theo ảnh thật (ưu tiên ảnh hơn mô tả này).
Làm trước C-0055 nếu C-0054 đang dở; report kèm question-hud.png mới.
