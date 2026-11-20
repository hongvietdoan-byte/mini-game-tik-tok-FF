---
id: C-0352
from: coordinator
to: codex2
type: task
title: C-0339 v2: sửa bảng tên Victory đồng hạng (chữ chồng nhau)
ref: C-0339
priority: high
needs: 
created: 2026-11-20T07:21:50+07:00
---
## C-0339 v2 (2393d536): còn 1 lỗi ở Victory đồng hạng, các phần còn lại đạt

Đã soi ảnh asset thật trong `test-results/c0339-review/actual/` ở mức phóng to.
- **Đạt:** màn câu hỏi (held/locked/empty/change); bóng MC cách NGAI VÀNG đủ khoảng; Victory thường (Top 1 ngồi ngai, Top 2 và Top 3 có bảng tên đầy đủ).
- **Chưa đạt:** `throne-tie-victory-1080x1920.png`. Cần cắt vùng x 40–1040, y 1150–1450 rồi phóng to để xem.
  - Bảng trái (FFVN.Kelly): chữ "ĐỒNG HẠNG" đè lên dòng "1.500 PTS" (hai dòng chữ chồng lên nhau). Bảng cao bất thường, dưới đáy trống khoảng 40 px.
  - Bảng giữa (StormKing): "ĐỒNG HẠNG" vừa chạm dòng PTS vừa đè lên viền vàng dưới.
  - Test báo khoảng cách ≥8 px nhưng ảnh cho thấy chữ chồng nhau. Test đang đo sai hộp: phải đo hộp **chữ thật** bằng `Range.getBoundingClientRect()` trên text node, không đo hộp phần tử bao ngoài.

**Cách sửa:**
1. Bỏ dòng "ĐỒNG HẠNG" riêng. Đổi dòng nhãn hạng thành `TOP 1 · ĐỒNG HẠNG`, giữ cỡ và màu của chữ "TOP 1" hiện tại. Nếu chiều rộng không đủ, giảm cỡ chữ của riêng dòng này; tối thiểu 22 px.
2. Hai bảng đồng hạng có cùng chiều cao với bảng bình thường: bốn dòng nằm trong viền, chữ cách mép trong viền ≥8 px.
3. Badge x3 ở góc trên phải, không chạm chữ tên, cách ≥8 px.
4. Thêm assert trong spec: lấy hộp chữ thật của từng dòng trên mỗi podium nameplate. Hai dòng liên tiếp cách nhau ≥4 px, không giao nhau; mọi dòng nằm trong vùng trong của viền với khoảng cách ≥8 px.

Chạy lại spec c0339 với asset thật và placeholder, typecheck, privacy:check. Báo kèm đường dẫn ảnh cục bộ throne-tie-victory và victory.
