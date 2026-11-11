---
id: C-0032
from: coordinator
to: codex2
type: task
title: C-0032 thiết kế lại overlay V3 giống ảnh mẫu + tối ưu hiệu năng (ngay sau C-0024)
ref: 
priority: high
needs: 
created: 2026-11-11T15:39:06+07:00
---
# C-0032 — Thiết kế lại overlay V3 cho GIỐNG ẢNH MẪU người dùng duyệt + tối ưu hiệu năng (ưu tiên CAO, làm ngay sau C-0024)

Người dùng yêu cầu: "giao diện giao codex thiết kế cho giống mẫu ref và tối ưu lại".
Ảnh mẫu: người dùng sẽ đặt ở `assets-local/ref/storm-arena-ref.png` (ngoài git — KHÔNG commit). Nếu chưa có file, dùng mô tả bên dưới + ảnh hiện trạng do bạn tự chụp (`/overlay/?mock=question`).
Code hiện tại: `apps/overlay/src/v3/ArenaStage.tsx`, `Victory.tsx`, `arena.css`, `arenaLogic.ts` (coordinator dựng nhanh — bạn được viết lại toàn bộ phần trình bày trong `apps/overlay/src/v3/**`).
Asset cục bộ phục vụ ở `/assets/` (thư mục `assets-local/`, ngoài git): `mc/kelly.png`, `chibi/<id>.png` + `chibi/manifest.json` (66 nhân vật, đang được tách nền lại sạch hơn), `victory/bg.jpg`, `victory/trophy-stage.png`.

## Ảnh mẫu (mô tả chi tiết, khung 1080×1920)
- **Nền:** bầu trời bão tím xoáy ở giữa trên, tia sét hai bên, đèn sân vận động hai mép ~ y 700–1000, cờ treo hình khiên có vương miện ở hai mép ~ y 830–1000. Dải đèn chấm sáng chéo hai bên đỉnh.
- **Header (y ~60–240):** trái: logo "STORM ARENA" chữ trắng nghiêng đậm, viền neon tím trong khung vát; giữa: biểu tượng vương miện neon + "BÁ VƯƠNG ĐẠI CHIẾN" 2 dòng chữ trắng-tím, viền ánh kim, dưới là ruy-băng "ĐẤU TRƯỜNG BÃO TỐ"; phải: khung vát "VÒNG 3 / 10" + icon người "1.248 Đang chơi".
- **Top 10 (x ~15–265, y ~250–760):** khung bo, viền neon tím; tiêu đề "BXH TRỰC TIẾP / TOP 10"; hạng 1–3 có huy hiệu hình khiên vàng/bạc/đồng, hàng nền sáng hơn; tên trái, điểm phải (dấu chấm nghìn).
- **Khung câu hỏi (x ~275–1060):** tab "CÂU HỎI 3" vát góc trái trên có vạch sét vàng; **đồng hồ tròn lớn viền vàng phát sáng** góc phải trên (đè lên mép khung); hộp câu hỏi viền neon; 4 đáp án 2×2 dạng **lục giác dẹt**, chữ cái lớn A–D bên trái; đáp án được chọn/đúng **viền vàng phát sáng**.
- **MC (y ~730–1060):** Kelly nửa người bên trái đè lên mép dưới khung câu hỏi, khung tên "♛ MC KELLY" vát; bong bóng lời thoại bên phải có **tia sét hồng** ở góc, chữ nghiêng đậm 3 dòng, **A, B, C, D tô vàng**.
- **Khán giả (y ~1100–1920):** khán đài bậc thang 7 hàng, **mép mỗi bậc là vạch neon tím**, phối cảnh hội tụ (hàng sau hẹp hơn, nhỏ hơn); mỗi ghế: **bảng tên trắng bo tròn trên đầu**, nhân vật chibi (mẫu là quay lưng — kho hiện là nhìn thẳng, dùng nửa người trên), **lưng ghế tím có huy hiệu vương miện**.

## Yêu cầu
1. Bám sát ảnh mẫu về bố cục, tỉ lệ, màu, độ sáng neon; ưu tiên dễ đọc (V3: câu hỏi > đáp án > đồng hồ > BXH > MC > khán giả > trang trí). Chỉ CSS/SVG/ảnh asset có sẵn — không tạo logo Free Fire, không dùng ảnh poster có người thật.
2. **Huy hiệu Top 1 liên tiếp (người dùng yêu cầu):** server sẽ gửi `LeaderboardEntry.top1Streak` (số lần liên tiếp đứng hạng 1, ≥ 2 mới hiện). Hiển thị **huy hiệu vàng "x2", "x3"…** cạnh tên trong Top 10, BXH lớn và popup Top 3. Coordinator đang làm phần server — thư riêng khi xong.
3. Điểm chuyển sang kiểu Kahoot (500–1000/câu + thưởng chuỗi tới +500) → số điểm lớn hơn nhiều (tới ~21.000): Top 10 và bảng tên phải đủ chỗ cho 6 chữ số có dấu chấm.
4. **Tối ưu hiệu năng** (mục tiêu ≥ 30 fps ổn định trên máy phát, V3 §16): không `filter: drop-shadow`/`box-shadow` động trên 35 ghế (dùng ảnh/glow tĩnh hoặc 1 lớp); không animation vô hạn trên mọi dòng; `contain: layout paint` cho các khối; ảnh chibi `loading="lazy"`/`decoding="async"`, kích thước đúng (đang 360 px cao); chỉ re-render ghế đổi người (memo theo slotId+occupant). Đo bằng Playwright (Edge) `requestAnimationFrame` 10 s ở cảnh question với 35 ghế → báo fps trung bình/p5 trong report.
5. Làm lại luôn 3 cảnh còn lại cùng phong cách (BXH lớn mỗi 5 câu, nghỉ giữa vòng, mất kết nối) — gộp DP7.
6. Giữ `data-testid` hiện có + vùng an toàn (`SafeZonePreset.rightFromY`); e2e 17 test phải xanh; thêm e2e: 35 ghế không chồng tên lên câu hỏi/đáp án, huy hiệu x2 hiện đúng.
Tiêu chí: build + typecheck + test + e2e xanh; ảnh 1080×1920 các cảnh đặt cạnh ảnh mẫu (local, không commit); nhánh `codex2/c0032-v3-redesign`.
