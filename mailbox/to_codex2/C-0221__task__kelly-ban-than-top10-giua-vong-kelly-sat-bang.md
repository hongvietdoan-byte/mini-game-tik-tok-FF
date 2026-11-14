---
id: C-0221
from: coordinator
to: codex2
type: task
title: Kelly ban than + Top10 giua vong Kelly sat bang
ref: C-0214
priority: high
needs: 
created: 2026-11-14T19:54:42+07:00
---
Tiếp trên nhánh `codex2/c0214-user-mockup` (96ae0af). Người dùng góp ý 2 điểm sau khi xem ảnh C-0214/C-0220. Chỉ sửa đúng 2 điểm này, không dời bất kỳ phần nào khác, nền giữ nguyên.

## 1. Màn câu hỏi + nhanh nhất: Kelly phải hiện BÁN THÂN, không chỉ cái đầu
Người dùng: "MC Kelly bị thấp chỉ lộ mỗi đầu MC, đúng là phải hiện bán thân."
- Khung ô Kelly GIỮ NGUYÊN 130/815/205/205, bảng tên giữ 92/1018/250/49.
- Hiện tại ảnh trong ô phóng quá to: chỉ thấy tóc + mặt + bàn tay, mép dưới ô cắt ở cằm/cổ.
- Cần như ảnh mẫu `assets-local/review/mau-nguoi-dung/mau-1114.png`: trong ô thấy trọn từ đỉnh tóc tới ngực — mặt chiếm khoảng 55–60% chiều cao ô phía trên, phần dưới thấy cổ choker + áo khoác vàng + tay chữ V. Tức là thu nhỏ ảnh (scale) và căn để đỉnh tóc cách mép trên ô ~0–10px, mép dưới ô cắt ngang ngực.
- Đầu không được bị cắt; không méo (giữ tỉ lệ).

## 2. Màn Top 10 giữa vòng: Kelly lên cao, sát bảng xếp hạng
Người dùng: "Top10 giữa vòng Kelly phải ở góc cao hơn gần bảng xếp hạng."
- Hiện tại cụm Kelly (ảnh + bảng tên + bong bóng) nằm góc dưới phải x≈760–980, y≈1390–1760, cách bảng Top 10 (đáy y≈1118) gần 300px khoảng trống.
- Dời CẢ CỤM lên ngay dưới bảng Top 10, giữ ở bên phải, căn mép phải theo mép phải bảng (x≈965); mép trên cụm cách đáy bảng ~12–20px (y≈1130–1140). Bảng Top 10 và header giữ nguyên.
- Kelly trong cụm này cũng hiện bán thân như điểm 1.

## Nộp
- Ảnh: `question`, `fastest`, `top10-mid-round` 1080×1920 và ảnh ghép "mẫu | bản dựng" cho màn câu hỏi; đặt ở `.claude/review/C0221/`.
- Bảng số đo: hộp ảnh Kelly (đỉnh tóc, cằm, mép dưới ô) và hộp cụm Kelly ở Top 10 giữa vòng.
- typecheck, test, e2e như C-0214. Không gộp main.

Ghi chú: màn sảnh chờ (Kelly to, bong bóng/khán đài vị trí cũ) đang chờ người dùng quyết — CHƯA sửa.
