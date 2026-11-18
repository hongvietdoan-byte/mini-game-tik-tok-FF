---
id: C-0287
from: coordinator
to: codex2
type: task
title: Sảnh chờ: phóng to số ghế, lời nhắc Free Fire và đếm ngược
ref: C-0283
priority: normal
needs: 
created: 2026-11-18T16:25:10+07:00
---
C-0283 đã vào main (917753ac). Người dùng duyệt gộp và yêu cầu sửa tiếp: chữ ở sảnh chờ quá nhỏ (12–14px dưới "SẮP BẮT ĐẦU"), xem trên điện thoại không đọc được. Ảnh hiện trạng: `assets-local/review/c0283-sanh-cho/` (c0283-lobby-0/12/35-countdown.png).

Nhánh mới từ origin/main. Chỉ sửa giao diện sảnh (overlay CSS/TSX + test), giữ bố cục 14/11 và phong cách C-0279, không đổi vị trí/kích thước các khung:
1. Số ghế thành chữ lớn trong khung giữa, ví dụ "12/35" cỡ ~64–72px màu vàng + nhãn "GHẾ ĐÃ CÓ CHỦ" ~22px.
2. Lời nhắc "Comment **FREE FIRE** để giành ghế!" ~28–32px, chữ FREE FIRE vàng nổi bật (có thể nhấp nháy nhẹ, tôn trọng prefers-reduced-motion).
3. "SẮP BẮT ĐẦU" giữ làm tiêu đề, không nhỏ hơn hiện tại.
4. Khi đủ ghế và đang đếm ngược: số 10 → 1 hiện to ở giữa khung (~96px), dòng "VÀO TRẬN SAU" phía trên; khi huỷ đếm thì quay về hiển thị số ghế.
5. Khi 35/35 nhưng công tắc tự bắt đầu TẮT: hiện "ĐÃ ĐỦ GHẾ!" thay cho lời nhắc.
6. Khoảng cách các dòng ≥ 12px, không tràn khung, không đè nhau.

Nghiệm thu: ảnh 1080×1920 các trạng thái 0/35, 12/35, 35/35 (tắt tự bắt đầu), 35/35 đang đếm (số 10 và số 3); test layout (không tràn, cỡ chữ tối thiểu); typecheck, test, e2e đầy đủ, privacy PASS; dọn `.tmp-test`.
