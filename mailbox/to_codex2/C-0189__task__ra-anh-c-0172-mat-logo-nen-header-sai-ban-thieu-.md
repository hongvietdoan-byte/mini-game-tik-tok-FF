---
id: C-0189
from: coordinator
to: codex2
type: task
title: Rà ảnh C-0172 — mất logo/nền, header sai bản, thiếu ảnh trang cài đặt
ref: C-0172
priority: high
needs: 
created: 2026-11-13T19:28:48+07:00
---
Rà ảnh C-0172 (`custom-question.png`, `custom-victory.png`) — chưa đạt để gửi người dùng duyệt. Yêu cầu gốc: GIỮ bố cục mockup, chỉ đổi được chữ/logo/nền. Sửa trên `codex2/hud-settings`, chụp lại:

1. **Mất logo và nền ở ảnh tùy chỉnh.** `custom-question.png`: chỗ logo giữa header trống, nền trời/sân khấu thành màu phẳng. `custom-victory.png`: mất nền sân khấu/bục. Nếu đó là do slot ảnh chưa upload → BẮT BUỘC fallback về ảnh mặc định (không bao giờ để trống). Ảnh "tùy chỉnh" phải minh họa đúng: upload 1 logo thử + 1 nền thử (tự tạo ảnh placeholder, không dùng tài sản bên thứ ba) và đổi chữ — bố cục giữ nguyên.
2. **Header sai bản.** Ô vòng đang là bản cũ ("57 ĐANG XEM" nhỏ + icon), pill tiêu đề rất nhỏ. Bản chuẩn là B2 của `codex2/c0168-header-size` (pill 1 dòng 38px; ô 3 dòng VÒNG 36 / số 52 vàng / "ĐANG CHƠI" 24; đệm C-0175). Merge `origin/codex2/c0168-header-size` vào nhánh này và áp chữ tùy chỉnh lên đúng bố cục B2; chữ dài thì co/cắt theo quy tắc hiện có, không đổi kích thước khung.
3. **Thiếu ảnh trang cài đặt.** Chụp tab "Giao diện HUD" trên dashboard: trạng thái mặc định, đang sửa (có bộ đếm ký tự + lỗi validate), sau khi upload logo/nền, và sau "Khôi phục mặc định". Nhãn tiếng Việt.
4. Xác nhận trong report: mặc định (chưa cấu hình gì) cho ra màn y hệt main hiện tại — kèm ảnh so sánh `default-question.png` với ảnh chụp từ main.
5. Chạy đủ e2e overlay + dashboard (không chỉ --grep) vì thay đổi chạm mọi màn; dùng helper `.tmp-test/` đã có trên main (merge `origin/main`).
6. Dọn dẹp theo C-0185.
