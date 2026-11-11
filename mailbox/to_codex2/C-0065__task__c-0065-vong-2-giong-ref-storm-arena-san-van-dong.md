---
id: C-0065
from: coordinator
to: codex2
type: task
title: C-0065: vòng 2 giống ref storm-arena — sân vận động, khán đài bậc 3D, đèn, cờ (làm ngay sau C-0056)
ref: C-0060
priority: high
needs: 
created: 2026-11-11T20:26:35+07:00
---
Đã gộp C-0060/C-0063 (main 67b1ebc). Cảm ơn. So `assets-local/ref/storm-arena-ref.png` với `question.png` mới, còn lệch rõ — người dùng yêu cầu "HUD, PHONG CÁCH, BACKGROUND giống mẫu". Làm ngay sau C-0056 (nếu C-0056 còn lâu thì làm C-0065 trước).

Dựng bằng CSS/SVG/canvas (được phép, không cần asset mới; giữ `victory/bg.jpg` làm lớp xa nếu hợp):
1. **Nền trên**: xoáy bão tím/xanh phía trên logo (radial/conic gradient + tia sét), tia sét hai bên.
2. **Sân vận động**: 2 dàn đèn pha ô vuông sáng hai bên (ngang ~y 42–48 %), hàng đèn chấm chạy vòng cung sau header, khán đài mờ xa phía sau MC/bong bóng.
3. **Cờ/banner**: 2 cờ treo tím có biểu tượng vương miện ở hai mép (thay 2 khối khung hiện tại), trong vùng x 2–9 % được phép bị crop.
4. **Khán đài người chơi**: bậc thang 3D phối cảnh (mặt bậc tím sáng viền neon, các hàng hẹp dần lên trên, hai thành bên vát), ghế có tấm lưng ghế khắc vương miện; tên trong pill trắng chữ đen như ref. Hiện ghế/chibi nằm phẳng trên nền tối — cần ra cảm giác sân khấu bậc.
5. **Khung câu hỏi**: khung neon viền đôi có góc vát + chi tiết kỹ thuật như ref; nhãn "CÂU HỎI N" dạng tab tím góc vát; đáp án là nút lục giác dẹt viền sáng (đáp án đang chọn/đúng viền vàng). Bỏ ký tự sét lạc sau số câu ("CÂU HỎI 5⚡").
6. **Top 10**: huy hiệu 1/2/3 dạng khiên vàng/bạc/đồng; hàng bớt ô nền, giống ref.
7. **Bong bóng MC**: bong bóng thoại có đuôi chỉ về MC, chữ nghiêng 3 dòng ("Trả lời bằng cách / comment A, B, C hoặc D / để tham gia ngay!"), A/B/C/D vàng.
8. Giữ: logo chính thức (đã bỏ ruy-băng theo C-0063), safe zone (y ≥ 14 %, x 9–91 % cho nội dung quan trọng), ≥ 55 FPS với 35 ghế.

Chibi nhìn từ sau lưng như ref: chưa có asset — giữ chibi hiện tại, đã hỏi người dùng.
Nộp nhánh `codex2/c0065-arena-v2`, report kèm ảnh `question.png`, typecheck + test + e2e.
