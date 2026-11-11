---
id: C-0058
from: coordinator
to: codex2
type: task
title: C-0056 bổ sung: số đo từ 3 ảnh chụp phòng LIVE thật (iPhone, 11/11 19:02)
ref: C-0056
priority: high
needs: 
created: 2026-11-11T19:08:43+07:00
---
Người dùng gửi 3 ảnh chụp phòng LIVE thật (iPhone 921×2000 ≈ 9:19.5). Người dùng sẽ lưu vào `assets-local/ref/tiktok-live-1..3.png`; trong lúc chờ, dùng số đo sau (tính theo % chiều cao/rộng MÀN HÌNH ĐIỆN THOẠI):
- 0–5%: thanh trạng thái iOS.
- 6.5–10%: trái = viên chủ phòng (avatar, tên, ♥ số tim, nút "+ Follow" đỏ) rộng ~0–46%; phải = 2 avatar top + số người xem (6.5K) + nút thu gọn + X, từ ~64% rộng.
- 11–13.5%: chip "🎮 Bảng xếp hạng chơi game" trái (~0–43% rộng); có thể có chip giữa (x40); phải = banner sự kiện "LIVE FEST 2026…" ~73–97% rộng, cao tới ~18%.
- Đáy: thanh nhập 92.5–96.5% (icon game, ô "Nhập…" + emoji, nút ghép đôi/khách mời, hoa hồng, quà, chia sẻ có số).
- Bình luận: cột trái ~0–70% rộng, mỗi bình luận 2 dòng (avatar tròn, tên mờ, nội dung đậm trắng), có huy hiệu cấp ▲9; dòng "xxx đã tham gia"; vùng ~73–92% cao với stream dọc (stream ngang thì dâng lên tới ~45%). Vệt quà "đã gửi … x1" ở ~64–68% bên trái. Tim bay cột phải ~88–97% rộng, 72–92% cao; nút chia sẻ nổi phải ~72–76%. Có thể có thẻ quảng cáo trắng lớn ~82–92% che ngang.
- KHÔNG có cột nút dọc kiểu video.
Hệ quả thiết kế (quan trọng):
1. Stream 1080×1920 (9:16) trên màn 9:19.5 bị phóng lấp chiều cao → CẮT HAI BÊN ~9% mỗi bên. Mọi nội dung quan trọng (Top 10, câu hỏi, đáp án, timer, bảng tên) phải nằm trong x 9%–91% của canvas. Top 10 hiện bắt đầu ~2% → sẽ mất mép trái.
2. Trên cùng ~14% canvas bị chủ phòng/người xem/chip che; góc phải trên tới ~19% bị banner sự kiện. Logo + "VÒNG 1/đang chơi" hiện ở 0–12% sẽ bị che → hạ logo xuống hoặc chấp nhận chỉ trang trí; thông tin vòng/timer không đặt ở đây.
3. Vùng an toàn cho UI chính: y 14%–62% (toàn chiều ngang trong 9–91%). y 62–92% chỉ còn mép phải ~70–88% rộng (dưới nút chia sẻ/tim thì tránh). Khán đài chibi nằm dưới bị bình luận che là chấp nhận được.
4. Simulator HUD dựng đúng các khối trên (tỉ lệ theo màn 9:19.5, mô phỏng cả phần bị cắt hai bên), có bật/tắt; ảnh nghiệm thu `question-hud.png` phải cho thấy câu hỏi/đáp án/timer/Top 10 không bị che.
Tham khảo (không bắt buộc): ảnh 3 là một game LIVE khác đặt bảng "VÒNG 7/10 + 00:24", "Dẫn đầu vòng", "Top người chơi" gọn ở cột phải 63–99% rộng, y 12–37%, và hộp "ĐỐ VUI" nhỏ góc phải dưới — cách bố trí gọn, chừa giữa màn hình.
