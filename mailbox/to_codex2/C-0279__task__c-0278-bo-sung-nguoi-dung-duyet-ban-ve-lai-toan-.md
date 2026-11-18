---
id: C-0279
from: coordinator
to: codex2
type: task
title: C-0278 bổ sung: người dùng duyệt bản vẽ lại toàn bộ giao diện — làm theo ảnh mẫu
ref: C-0278
priority: normal
needs: 
created: 2026-11-18T09:21:00+07:00
---
Bổ sung cho C-0278. Người dùng đã DUYỆT bản vẽ lại toàn bộ giao diện overlay (12 cảnh). Làm đúng theo bản mẫu này, thay cho mô tả 3 ý trong thư C-0278 gốc.

**Bản mẫu (máy cục bộ, không commit vì assets-local bị ignore):**
- CSS mẫu: `assets-local/review/c0278-mau-thu/toan-bo/ban-thu-5-toan-bo.css` — được chụp bằng cách chèn đè lên overlay nhánh `codex2/c-option-grid-balance` (527b01d). Chỉ là bản nháp dùng `!important`; khi làm thật hãy viết lại sạch vào `arena.css` / `victory.css`, đưa màu vào token theme `--theme-*` (theme mặc định phải ra đúng như ảnh), không dùng `!important` tràn lan.
- Ảnh trước/sau 12 cảnh: `assets-local/review/c0278-mau-thu/toan-bo/01-lobby.png` … `12-connection-lost.png`.
- Ảnh chi tiết khung câu hỏi: `assets-local/review/c0278-mau-thu/ban4-*.png`, `ban3-*.png`.

**Thông số đã duyệt:**
1. Bố cục câu hỏi: TOP 10 `left: 70px` (dịch trái 18px). Khung câu hỏi `left: 410px; width: 600px` cố định cho mọi câu (bỏ `has-long-labels` nới 640px).
2. Trong khung: khung câu hỏi lề trái/phải 16px, `top: 152px; height: 124px`; lưới đáp án `top: 292px`, 2 hàng × 72px, khe 12px (hàng) / 16px (cột), lề 16px. Đồng hồ 124px, `top: 14px`.
3. Viền khép kín: bỏ `clip-path` cắt góc trên khung câu hỏi, ô đáp án, TOP 10, khung lớn, bảng xếp hạng lớn, thẻ vòng, thẻ sự kiện, bong bóng MC, thẻ tên MC. Dùng bo góc (ô 12px, khung 14–18px) + viền gradient 2px (xanh ngọc → tím) bằng kỹ thuật `padding-box`/`border-box`, ánh kính nửa trên, bóng đổ.
4. Ô đáp án: nhãn A–D là huy hiệu tròn vàng kim 34px ở giữa bên trái; chữ căn trái. Cỡ chữ: ngắn 22px, dài (>30 ký tự) 17px tối đa 2 dòng; lúc công bố ngắn 20px, dài 15px tối đa 3 dòng.
5. Công bố: % có cột riêng 46px bên phải, vạch ngăn mảnh, thanh % 36px nằm dưới con số (không chạy dưới chữ). Ô đúng: nền vàng cam, viền vàng phát sáng, huy hiệu nhãn đổi xanh lá. Ô sai mờ 50%.
6. TOP 10: mỗi hàng bo góc; top 1 nền vàng, top 2–3 nền tím; điểm màu vàng đậm. Bảng xếp hạng lớn (INTERIM_TOP10) cùng phong cách.
7. MC: bong bóng viền vàng, giữ đuôi; thẻ tên bo góc viền vàng. Thẻ tên khán giả dạng viên thuốc.
8. Nghỉ giữa vòng / mất kết nối: thêm thẻ nền tối có viền phía sau nội dung để đọc rõ trên trời sáng.
9. KHÔNG đổi: màn Vinh danh (bục, bảng tên), ảnh nền, logo, cờ đội, chibi, vị trí/kích thước các khối khác.
10. Điểm hiển thị không có số 0 ở đầu (dữ liệu mẫu "075 điểm" trong mock là chữ đáp án — sửa mock thành "75").

**Nghiệm thu:** ảnh 1080×1920 đủ 12 cảnh + các mock grid-balance/longest/clamp; so với ảnh mẫu; test layout cập nhật (ô bằng nhau, chữ không tràn, khoảng cách ≥12px giữa các khối, % không chạm chữ); theme mặc định khớp; typecheck, test, e2e đầy đủ PASS; dọn `.tmp-test`.
