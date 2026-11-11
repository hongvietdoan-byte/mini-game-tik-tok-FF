---
id: C-0082
from: coordinator
to: codex2
type: task
title: C-0082 Victory: bỏ cúp/bão/bục vẽ SVG, dùng lại trophy-stage.png + bg.jpg theo ref
ref: C-0080
priority: high
needs: 
created: 2026-11-11T22:51:25+07:00
---
Người dùng (23:10) gửi lại ref Victory và hỏi vì sao vẫn chưa giống. Coordinator đã rà bản trên main (build 22:25, `/overlay/?mock=victory`): **sai hướng dựng, không phải sai toạ độ**.

## Nguyên nhân
Ref là ảnh render 3D. Bản main (commit f84b658) lại VẼ TAY bằng SVG/CSS: cúp phẳng kiểu icon, xoáy bão = vài đường tròn, sét = nét zigzag, khán đài = khung dây, bục = hình thang gradient, `.v3v-bg` không có ảnh nền. Trong khi asset raster đúng mẫu ĐÃ CÓ SẴN và từng được dùng (bản trước f84b658, còn thấy ở preview c0065):
- `/assets/victory/trophy-stage.png` (1408×900, alpha) = đúng cúp + bục bát giác nhiều tầng + hai cánh bục viền xanh của ref.
- `/assets/victory/bg.jpg` (1080×1920) = trời bão, sét, khán đài.
Lỗi một phần do thư C-0065/C-0068 của coordinator viết "dựng bằng CSS/SVG" và tả ref bằng chữ → rút lại câu đó cho cảnh Victory.

## Việc cần làm (gộp vào C-0080, ưu tiên trước các mục khác của Victory)
1. BỎ `VictoryCup`, `VictoryAtmosphere` (xoáy/sét/khán đài SVG), `.v3v-support`, `.v3v-platform-wing*`, `.v3v-stage-platform` vẽ tay. Dùng lại 2 lớp raster: `bg.jpg` phủ toàn màn + `trophy-stage.png`.
2. Bố cục theo ref (1080×1920): logo BVĐC y≈3–21 %; `trophy-stage.png` rộng ≈100–104 % màn (cánh bục chạm 2 mép), đỉnh cúp y≈24 %, mép trước bục y≈70 %; chibi TOÀN THÂN đứng TRÊN mặt bục, chân y≈69–70 %, cao ≈19–21 % màn (hạng 1 giữa, nhỉnh hơn), KHÔNG che thân cúp quá 1/3; bảng tên lục giác DƯỚI chân y≈71–78 % (2 xanh lam · 1 vàng · 3 đỏ cam, vương miện + nguyệt quế, "1.500 PTS"), phản chiếu mờ xuống sàn; sàn bóng tím ở 1/4 dưới; confetti vàng/tím thưa.
3. Chỉ được giữ CSS/SVG cho: bảng tên, confetti, glow/tia sáng sau cúp, phản chiếu sàn. Không vẽ lại cúp/bục/bão bằng vector.
4. Chibi nguồn chỉ ~160 px ngang nên phóng to sẽ mờ: giữ `image-rendering` mặc định, không phóng quá ~2×; báo lại nếu cần bộ chibi độ phân giải cao hơn (coordinator sẽ hỏi người dùng).
5. Bỏ dải "VINH DANH TOP 3 · VÒNG 1" hoặc để rất nhỏ ngay dưới logo. Mock: tên ngắn kiểu ref cho ảnh nghiệm thu (vẫn giữ case tên dài/XSS trong test riêng).
6. Nghiệm thu: chụp `victory.png` + `victory-tie.png` 1080×1920 SAU khi animation xong (≥8 s), ghép CẠNH `assets-local/ref/victory-ref.png` trong một ảnh, tự liệt kê điểm còn lệch trước khi report. Safe-zone e2e vẫn phải xanh (cúp/bục là lớp trang trí được miễn crop như cũ).
