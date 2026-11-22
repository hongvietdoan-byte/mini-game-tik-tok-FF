---
id: C-0396
from: coordinator
to: codex2
type: task
title: C-0396 bộ theme gốc + CAN-CHUAN-BI đầy đủ + sơ đồ + gói zip
ref: C-0396
priority: high
needs: 
created: 2026-11-22T11:42:45+07:00
---
# C-0396: bộ theme gốc + danh sách chuẩn bị đầy đủ

C-0386 đã gộp vào main (73dd88f5). Nhánh mới `codex2/c-theme-goc` từ origin/main.

Người dùng chốt ngày 22/11. Mỗi đợt sự kiện họ đổi theme, nên cần **một gói theme đóng sẵn**. Gói phải cho biết:
- cần thay những gì;
- kích cỡ bao nhiêu;
- thay xong không ảnh hưởng phần nào khác.

Gói gồm schema, token CSS và assets, kèm một **bộ theme mặc định xuất sẵn** để lần sau làm base.

## A. Xuất bộ theme gốc từ game thật
- Hiện `data/themes/` ở checkout chính **đang trống**: thư mục `data/` bị gitignore, còn bản cũ ngày 17/11 không còn.
- Mục tiêu: `pnpm theme:export-default` (không cần tham số) xuất **đủ asset thật** đang dùng vào `data/themes/default`.
  - Asset lấy từ `QUIZ_ASSETS_DIR` / `assets-local`, đúng như overlay đang tải.
  - Gồm ảnh, âm thanh, video, chibi đủ dáng, MC đủ pose, ngai, font, cùng `texts` và `achievements` hiện tại.
- Bật theme `default` vừa xuất thì overlay phải **giống hệt** khi không có theme. So pixel 5 cảnh, chỉ bỏ qua vùng đồng hồ.
- KHÔNG commit asset thật. Test tự động vẫn dùng `fixtures/themes/default` với ảnh placeholder.
- **Không chạy lệnh xuất vào checkout chính.** Coordinator sẽ tự chạy sau khi gộp. Trong worktree, xuất ra thư mục tạm trên ổ E rồi xoá sau khi test.

## B. `CAN-CHUAN-BI.md` đầy đủ
Hiện file này chỉ có bảng asset. Bổ sung các phần sau, đều bằng tiếng Việt:
1. **Màu (token CSS)**: đủ 55 token, mỗi dòng gồm:
   - tên;
   - giá trị đang dùng;
   - ô màu mẫu (ví dụ `![](...)` hoặc emoji ô màu);
   - dùng ở đâu: màn nào, phần tử nào.
   Nhóm theo: nền / chữ / đáp án A–D / đồng hồ / BXH / viền sáng…
2. **Font**: tên font, file, dùng cho chữ nào, định dạng chấp nhận.
3. **Chữ tiêu đề (`texts`)**: mỗi khoá gồm:
   - chữ đang dùng;
   - hiện ở đâu;
   - **số ký tự tối đa** vẫn đẹp, và quá giới hạn thì co chữ hay xuống dòng.
4. **Danh hiệu (`achievements`)**: tên, phụ đề, màu, icon, giới hạn ký tự.
5. **Số lượng file trong mỗi thư mục**:
   - bao nhiêu chibi, tên file theo quy ước nào;
   - mỗi nhân vật cần dáng Top 2/Top 3 nào;
   - MC cần những pose nào, mỗi pose mấy khung;
   - ngai cần những file nào.
6. **Ghi rõ những gì KHÔNG đổi theo theme** (bố cục, khung, vị trí ghế, câu hỏi, giọng MC) và lý do.

## C. Ảnh sơ đồ vị trí
- Lệnh `theme:new` (hoặc lệnh riêng `theme:map`) tạo `SO-DO.png` trong thư mục theme.
- Gồm ảnh chụp overlay 1080×1920 ở LOBBY, QUESTION, REVEAL và VICTORY (ghép thành 1 hoặc 4 ảnh).
- Trên ảnh: khung đánh số từng slot asset và từng chữ tiêu đề.
- Số trên ảnh khớp số dòng trong `CAN-CHUAN-BI.md`.
- Mục đích: người dùng nhìn ảnh là biết ảnh nào, chữ nào nằm ở đâu.

## D. Gói theme
- `pnpm theme:pack <id>`: nén `data/themes/<id>` thành `<id>.zip` (đủ `theme.json`, assets, `CAN-CHUAN-BI.md`, `SO-DO.png`).
- `pnpm theme:import <file.zip>`: kiểm tra bằng `theme:validate` trước khi chép vào `data/themes`. Gói lỗi thì không chép, báo lỗi tiếng Việt.
- Dùng khi người dùng gửi gói cho người làm ảnh hoặc chuyển sang máy khác.
- Cập nhật `docs/THEME.md`: quy trình 1 trang, từ đợt sự kiện mới đến lúc dùng trên Dashboard.

## Kiểm tra trước khi báo
- Gộp origin/main mới nhất.
- Chạy typecheck, **privacy:check sau khi commit**, vitest.
- Chạy Playwright đủ 2 lượt (asset thật và `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`), báo số passed/failed từng lượt.
- Ảnh duyệt (KHÔNG commit) ở `assets-local/review/c-theme-goc/`:
  - `SO-DO.png`;
  - `CAN-CHUAN-BI.md` xuất từ asset thật;
  - so pixel theme default xuất ra so với khi không có theme;
  - danh sách file trong gói zip.
- Dọn thư mục tạm.
- Push nhánh, báo commit và đường dẫn tuyệt đối. ACK khi bắt đầu.
