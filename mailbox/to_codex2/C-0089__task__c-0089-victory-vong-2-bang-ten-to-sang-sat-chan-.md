---
id: C-0089
from: coordinator
to: codex2
type: task
title: C-0089 Victory vòng 2: bảng tên to sáng sát chân, nền tối hơn, cúp to hơn, ẩn MC
ref: Y-0135
priority: high
needs: 
created: 2026-11-11T23:36:18+07:00
---
Đã rà ảnh ghép `test-results/c0082-victory/victory-reference-comparison.png` (commit `b55fd4b`). Hướng dựng giờ ĐÚNG (cúp/bục/nền raster, chibi toàn thân trên bục). CHƯA gộp — theo BOARD #19 chờ người dùng duyệt ảnh. Trong lúc chờ, sửa vòng 2 các điểm lệch rõ so với `assets-local/ref/victory-ref.png` (xếp theo mức ảnh hưởng):

1. **Bảng tên (lệch nhiều nhất)**: đang nhỏ, nền tối, chữ bé, nằm tách xa chân (y≈72–77 %, có khoảng hở). Ref: bảng lục giác LỚN, sáng, viền neon dày phát sáng theo màu hạng (2 xanh lam · 1 vàng cam · 3 đỏ cam), nằm SÁT dưới chân (đỉnh bảng ≈ y 71 %), mỗi bảng rộng ≈ 27–30 % màn, ba bảng gần chạm nhau; tên chữ đậm nghiêng trắng cao ≈ 34–38 px, điểm "1.500 PTS" ≈ 28 px; vương miện nổi trên đỉnh giữa bảng, nguyệt quế hai bên; bóng phản chiếu điểm số mờ xuống sàn. Bỏ huy hiệu số hạng tròn ở góc trái (ref không có; màu + vương miện đã thể hiện hạng). Giữ badge streak nhưng nhỏ, không phá bố cục.
2. **Tông nền**: `bg.jpg` đang sáng/nhạt hơn ref. Phủ lớp gradient tối xanh-tím đậm ở 45 % trên (để logo + cúp nổi), tăng tương phản; thêm 2 tia sáng chéo trắng-tím toả từ sau cúp (ref thấy rõ) và quầng sáng tím sau cúp; sàn 1/4 dưới bóng tím có vệt phản chiếu dọc.
3. **Tỉ lệ cúp**: ref cúp cao từ y≈24 % tới ≈53 % và rộng ≈ 48 % màn; bản dựng cúp chỉ rộng ≈ 30 %. Phóng `trophy-stage.png` lên (≈ 1,35–1,5×, neo tâm ngang, cho hai cánh bục tràn ra ngoài mép) sao cho cúp đạt cỡ ref mà mặt bục trước vẫn ở y≈66–70 % để chibi đứng. Chibi giữ cỡ hiện tại (≈ 20 % cao), chân đặt trên mặt bục trước, không lơ lửng trước vách bục.
4. **MC Kelly góc trái dưới**: ref Victory KHÔNG có MC → ẩn MC ở scene Victory (nếu C-0080 cần MC "celebrate" thì để sau cờ tắt mặc định; coordinator sẽ hỏi người dùng).
5. **Confetti**: thêm mảnh vàng/tím lớn hơn, rải quanh cúp như ref (hiện gần như không thấy).
6. Nhãn "VÒNG 1" giữ nhỏ như hiện tại — ổn. Logo: dùng logo BVĐC hiện có, KHÔNG thêm chữ Free Fire (đã chốt ở C-0068 mục 5).

Chibi khác nhân vật ref và bg khác mây/sét: chấp nhận, không sửa.

Nghiệm thu: chụp lại `victory.png`, `victory-tie.png` + ảnh ghép cạnh ref như lần này (làm tốt, giữ cách này cho mọi scene). Commit tiếp trên cùng nhánh rồi report; không cần đợi phần còn lại của C-0080.
