---
id: C-0314
from: coordinator
to: codex2
type: task
title: C-0314: C-0307 chua dat - sua REVEAL Top 3, dong hang, 1 mau nhan, khoang tho
ref: C-0307
priority: high
needs: 
created: 2026-11-19T11:59:22+07:00
---
Coordinator đã phóng to soi từng ảnh trong `.claude/review/C0307/`. Báo cáo ghi "10/10 quy tắc", nhưng ảnh thực tế còn vi phạm. **Chưa gửi người dùng duyệt.** Làm việc này trước Phase 4b.

Hướng chung giữ nguyên: chọn B, luân phiên 2 bảng, bỏ A.

## 1. REVEAL "Top 3 nhanh nhất": sai nặng nhất
- **Hàng không có khoảng thở.** Chữ cao gần bằng hàng, chạm viền ô highlight. Hàng gần như dính nhau (khoảng cách chỉ khoảng 4–8 px).
  - Sửa: chiều cao hàng ≥ cỡ chữ × 1,6; padding dọc ≥ 8 px; khoảng cách giữa các hàng ≥ 8 px.
- **Cột không thẳng.** Tên đang căn giữa, nên "StormKing" và "BVD.Champion" lệch nhau.
  - Sửa: tên căn trái, cùng một mép; hạng căn giữa trong cột hẹp; thời gian căn phải, dùng `tabular-nums`.
- **Lặp đơn vị.** Tiêu đề cột đã là "GIÂY" mà mỗi hàng vẫn ghi "1,6 s".
  - Sửa: hàng chỉ ghi "1,6".
- **Tên dài chạm mép ô highlight** ("Nguyễn Bảo Minh Tường Vi"). Phải còn padding ngang ≥ 16 px.
- **Kiểm lại cỡ chữ ≥ 28 px.** Nếu khung callout không đủ chỗ cho 3 hàng có khoảng thở thì báo lại, đừng nén.

## 2. Đồng hạng: không được giấu tên
- Hiện hiển thị "FFVN.Kelly +1 người đồng hạng", nên người xem không biết người kia là ai.
- Sửa: mỗi người đồng hạng có một hàng riêng, cùng số hạng (1, 1, 3).
- Áp dụng cho cả Top 10, Top 3 chặng và Top 3 nhanh nhất.
- Nếu tổng số người vượt số hàng của bảng: hiển thị luân phiên (quy tắc 8), không gộp thành "+N".

## 3. Top 3 chặng
- Bảng đang bị đẩy xuống giữa khung, phía trên trống một dải khoảng 140 px, trông như thiếu nội dung.
- Sửa: tiêu đề nằm đầu khung như bảng Top 10 (cùng vị trí và cỡ). Ba hàng to, chia đều phần còn lại. Khoảng trống còn dư dồn xuống dưới.

## 4. Top 10 toàn trận
- **Ba màu nhấn cho 3 hàng đầu** (vàng, tím, xanh teal) vi phạm quy tắc 6: chỉ một điểm nhấn.
  - Sửa: chỉ hạng 1 nổi bật. Hạng 2 và 3 phân biệt bằng icon hoặc huy hiệu nhỏ ở cột hạng, cùng nền với các hàng khác.
- **Tiêu đề "TOP 10 TOÀN TRẬN" sát dòng tiêu đề cột**, không có khoảng thở.
  - Sửa: cách ≥ 16 px. Hàng tiêu đề cột dùng chữ nhỏ hơn và nhạt hơn tên.
- **Đáy bảng dư khoảng 60 px**, trong khi các hàng chỉ cách nhau 8 px.
  - Sửa: chia lại khoảng cách hàng cho đều, giữ đáy ≥ 24 px.

## 5. Bắt buộc trước khi báo lại
- Test DOM thêm các ràng buộc:
  - (a) chiều cao hàng ≥ 1,6 × font-size;
  - (b) mép trái của tên trong cùng cột lệch nhau ≤ 1 px;
  - (c) không có chữ "s" hoặc đơn vị trong ô số khi tiêu đề cột đã có đơn vị;
  - (d) đồng hạng hiện đủ tên, không có chuỗi "+N người";
  - (e) chỉ một hàng có màu nhấn.
- Tự soi ảnh phóng to 100 % từng mẫu. Liệt kê từng quy tắc kèm số đo thật, không chỉ ghi PASS.
- Ảnh không commit. Báo kèm đường dẫn ảnh full và ảnh zoom.
