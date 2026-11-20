---
id: C-0353
from: coordinator
to: codex2
type: task
title: C-0339: bảng trái đồng hạng bị cụt chữ T, đè nguyệt quế
ref: C-0339
priority: high
needs: 
created: 2026-11-20T08:21:06+07:00
---
## C-0339 (1e1cd5db): bảng giữa đã đạt, bảng trái đồng hạng còn lỗi

Kiểm bằng ảnh asset thật `throne-tie-victory-1080x1920.png`, cắt vùng x 40–1040, y 1150–1450 rồi phóng to.

- Đạt: bảng giữa "TOP 1 · ĐỒNG HẠNG"; Victory thường.
- **Lỗi ở bảng trái (bảng hẹp, FFVN.Kelly):** dòng "TOP 1 · ĐỒNG HẠNG" bị **cụt chữ T** ở mép trái, chỉ còn đọc được "OP 1 · ĐỒNG HẠNG". Chữ đang đè lên vòng nguyệt quế trái, còn badge x3 bị ép sát vào nguyệt quế phải. Test vẫn PASS vì chỉ đo theo viền, không tính phần nguyệt quế.

**Cách sửa:**
1. Vùng an toàn cho chữ = vùng trong của viền **trừ đi bbox hai ảnh nguyệt quế**, cách mỗi bên ≥8 px. Mọi dòng chữ và badge phải nằm trọn trong vùng này.
2. Bảng hẹp thì tự giảm cỡ chữ dòng nhãn hạng cho vừa (tối thiểu 20 px). Nếu vẫn không vừa thì xuống 2 dòng: "TOP 1" / "ĐỒNG HẠNG".
3. Badge x3 không nằm chung dòng với nhãn hạng. Đặt badge ngay sau tên người chơi, cách tên ≥8 px; nếu không đủ chỗ thì đặt ở góc trên phải, **phía ngoài** viền chữ, không chạm nguyệt quế.
4. Thêm vào spec: assert hộp chữ thật (đo bằng Range) không giao bbox nguyệt quế, và `scrollWidth <= clientWidth` cho mọi dòng (không bị cắt hoặc tràn).

Chạy lại spec với asset thật và placeholder, typecheck, privacy:check. Báo kèm đường dẫn ảnh.
