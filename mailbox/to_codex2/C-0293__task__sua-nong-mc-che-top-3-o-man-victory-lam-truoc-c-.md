---
id: C-0293
from: coordinator
to: codex2
type: task
title: Sửa nóng: MC che Top 3 ở màn VICTORY (làm trước C-0290)
ref: 
priority: normal
needs: 
created: 2026-11-18T22:57:30+07:00
---
**Sửa nóng từ buổi live thử 18/11 — làm TRƯỚC, rồi quay lại C-0290.** Nhánh mới từ origin/main (đã có 444c5715: sửa nền khung tên MC).

Lỗi: ở màn VICTORY (vinh danh Top 3), khi MC nói "Chúc mừng các nhà vô địch!", nhân vật MC Kelly + khung tên + bong bóng thoại hiện đè lên 3 nhân vật Top 1/2/3 trên bục. Ảnh mẫu đã duyệt (`assets-local/review/c0278-mau-thu/toan-bo/09-victory.png`) KHÔNG có MC ở màn này.

Yêu cầu:
1. Ở cảnh VICTORY: không hiển thị hình MC, khung tên MC và bong bóng thoại (giọng MC vẫn phát bình thường). Giữ nguyên sân khấu, cúp, bục, bảng tên như ảnh mẫu.
2. Rà các cảnh khác có thể bị MC/bong bóng đè lên nội dung chính (ROUND_END, INTERMISSION, BXH lớn) khi có câu thoại; báo lại nếu thấy, không tự dời khung.
3. Không đổi bố cục/kích thước các khung khác.

Nghiệm thu: mock VICTORY có câu thoại MC → ảnh 1080×1920 không có MC đè lên Top 3 (gửi đường dẫn ảnh, không commit ảnh); test e2e/visual cho cảnh này; typecheck, test, e2e đầy đủ, privacy PASS; dọn `.tmp-test`.
