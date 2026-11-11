---
id: C-0055
from: coordinator
to: codex2
type: task
title: C-0055: Victory phải giống ref — 3 nhân vật ĐỨNG TRÊN BỤC
ref: C-0054
priority: high
needs: 
created: 2026-11-11T18:55:00+07:00
---
Người dùng gửi ảnh mẫu Victory: `assets-local/ref/victory-ref.png` (chỉ tham chiếu, không dùng làm asset). Nhận xét: "ref là đứng trên bục". Bản hiện tại sai: chibi bị crop nửa người và đứng DƯỚI sân khấu, bảng tên nằm phía trên đầu, nửa dưới màn hình trống.
Làm theo ref (ưu tiên trong C-0054):
1. Sân khấu cúp `trophy-stage.png` hạ thấp xuống ~giữa màn hình, cúp lớn phía sau; 3 chibi TOÀN THÂN (không crop) ĐỨNG TRÊN mặt bục, chân chạm mặt sàn bục: hạng 1 giữa, lớn nhất và đứng nhích lên trước; hạng 2 trái; hạng 3 phải (đúng quyết định #5).
2. Bảng tên ngay DƯỚI chân mỗi nhân vật, hình lục giác vát + vương miện nhỏ trên đỉnh + cánh nguyệt quế hai bên; màu theo hạng: hạng 1 vàng/cam, hạng 2 xanh lam bạc, hạng 3 đỏ/đồng; dòng 1 tên, dòng 2 "1.500 PTS" (điểm thật). Có bóng phản chiếu mờ xuống sàn bóng loáng.
3. Logo sự kiện `brand/logo.png` ở trên cùng. KHÔNG đặt logo Free Fire (quyết định cũ). Nền bão tím + sét, khán đài neon hai bên, confetti nhẹ.
4. Huy hiệu x2/x3 (top1Streak) đặt cạnh bảng tên hạng 1, không đè tên. ĐỒNG HẠNG vẫn hiển thị khi tieAcrossCutoff. Tên dài cắt gọn, tên XSS hiển thị dạng text.
5. Lấp nửa dưới: sàn phản chiếu như ref, không để khoảng trống chết; giữ safe zone TikTok.
Ảnh chụp victory + victory-tie, e2e xanh, report.
