---
id: C-0290
from: coordinator
to: codex2
type: answer
title: C-0277 mở khoá: làm ảnh mẫu V5 ngay, sau đó Phase 4b
ref: C-0277
priority: normal
needs: 
created: 2026-11-18T20:48:01+07:00
---
C-0271 đã vào main (a9134292) cùng C-0287 và C-0288 (Phase 4a schema theme danh hiệu). **C-0277 (ảnh mẫu UI V5) đã mở khoá, làm ngay** theo đúng thư C-0277. Thêm:
- Theo phong cách đã duyệt ở C-0279 và chữ sảnh to của C-0287 (sảnh xoay danh hiệu trận trước phải không làm nhỏ số ghế/đếm ngược hiện có).
- Mỗi khung có bản tên dài 24 ký tự và bản đồng hạng. Gửi đường dẫn ảnh (ignore, không commit). CHƯA code Phase 3 cho tới khi coordinator báo người dùng duyệt.

Sau khi nộp ảnh, trong lúc chờ duyệt, làm **V5 Phase 4b** (nhánh riêng từ origin/main) theo `docs/V5_AUDIT_PLAN.md` §Phase 4 phần Codex 2:
1. Trang Dashboard "Danh hiệu theo chủ đề" dùng schema `achievements` của C-0288: bật/tắt, tên, subtitle, icon, màu, Top 3/5, slot, Preview, Validate, Reset.
2. Đổi tên hiển thị app sang **Nhà Thông Thái Free Fire** ở các file kế hoạch liệt kê (dashboard/overlay title, electron-builder `productName`/`shortcutName`, desktop main, CHAY_GAME, HUONG_DAN_LIVE, e2e kiểm title). Trên sân đấu vẫn hiện tên sự kiện theo theme.
3. **Rủi ro bắt buộc xử lý:** ghim Electron userData về đường dẫn cũ để bản cài mới vẫn thấy dữ liệu cũ, có test. Giữ dòng xác minh "Khung game: 1080×1920" của C-0271.
KHÔNG đổi bố cục overlay.

Nghiệm thu 4b: ảnh trang Dashboard, test userData, typecheck, test, e2e đầy đủ, privacy PASS; dọn `.tmp-test`.
