---
id: C-0386
from: coordinator
to: codex2
type: task
title: Bộ khung theme: dựng theme mới + chọn theme trên Dashboard (làm sau C-0383)
ref: 
priority: normal
needs: 
created: 2026-11-21T23:00:38+07:00
---
# Bộ khung theme: dựng theme mới và chọn theme trên Dashboard

**Làm SAU khi xong C-0383.** Nhánh mới `codex2/c-theme-kit` từ origin/main mới nhất (sau khi C-0383 đã gộp).

Người dùng chốt 21/11:
- Theme **chỉ đổi diện mạo**: ảnh, màu, font, âm thanh, MC (ảnh), chibi. Bố cục chuẩn 14/11 (`assets-local/review/mau-nguoi-dung/mau-1114.png`) giữ nguyên, không theme nào được dời hay đổi kích thước khung.
- Đổi theme thì đổi kèm **chữ tiêu đề** và **danh hiệu**.
- Không gắn bộ câu hỏi hay giọng MC theo theme.

Hệ thống đã có: `apps/server/src/theme-store.ts`, `data/themes/<id>/theme.json`, `pnpm theme:export-default`, `pnpm theme:validate`, API `/api/admin/themes*`, trang Dashboard "Giao diện / Theme", danh hiệu theo theme (`achievements`). Tài liệu: `docs/THEME.md`. **Tận dụng tối đa, không viết lại.**

## A. Soát slot: mọi asset overlay đang dùng phải đổi được qua theme
- `data/themes/default` xuất ngày 17/11 nên đã cũ.
- Liệt kê mọi ảnh/âm thanh/video mà overlay đang tải: nền, logo, cờ, MC sequence, chibi (đủ 4 dáng gồm dáng Top 2/Top 3), ngai vàng, khung, nền Victory, nhạc vinh danh…
- Mỗi asset hoặc là một slot của theme, hoặc ghi rõ trong `docs/THEME.md` là "cố định, không đổi theo theme" kèm lý do.
- Slot còn thiếu thì thêm vào (giữ đường dẫn mặc định hiện tại làm dự phòng).
- `theme:export-default --force` xuất lại đầy đủ. `theme:validate` phải đạt.

## B. Chữ tiêu đề theo theme
- Thêm mục `texts` vào `theme.json`, gồm mọi chữ thương hiệu đang ghi cứng. Ít nhất:
  - `BrandMark.tsx:79/101` ("BÁ VƯƠNG ĐẠI CHIẾN" và khẩu hiệu);
  - `main.tsx:88/283`;
  - lời chào sảnh `ArenaStage.tsx:784` ("CHÀO MỪNG ĐẾN VỚI ĐẤU TRƯỜNG BÃO TỐ!");
  - `config.texts` (kicker "STORM ARENA", băng rôn "ĐẤU TRƯỜNG BÃO TỐ", tiêu đề BXH, nhãn vòng/đang chơi).
- Giá trị hiện tại làm mặc định, để theme default hiển thị **y hệt** hiện nay (so ảnh trước/sau, lệch 0 px).
- Chọn theme trên Dashboard thì áp chữ của theme đó. Nếu người điều hành đã sửa chữ trên trang HUD thì hiện hộp xác nhận "Dùng chữ của theme mới?" trước khi ghi đè.
- Chữ dài hơn: dùng cơ chế co chữ sẵn có (`fitHudTextStyle`), không tràn, không cắt. Test với chữ 1 từ / 24 ký tự / 40 ký tự.

## C. Danh hiệu theo theme
- Đã có `achievements` trong theme. Kiểm tra trang Theme trên Dashboard xem và sửa được danh hiệu của theme đang chọn, và đổi theme thì danh hiệu đổi theo.
- Thiếu gì thì bổ sung tối thiểu.

## D. Trang "Giao diện / Theme" trên Dashboard
- Danh sách theme, mỗi theme gồm:
  - tên;
  - ảnh xem trước (nền + logo, hoặc ảnh chụp overlay preview);
  - trạng thái hợp lệ / lỗi (lỗi tiếng Việt từ `theme:validate`);
  - nút **"Dùng theme này"**.
- Chỉ cho đổi theme khi **không có vòng đang chạy** (IDLE/LOBBY). Trong vòng thì nút mờ và ghi lý do.
- Nút **"Tải lại danh sách theme"**, để chép thư mục theme mới vào không cần khởi động lại server.
- Theme đang dùng được lưu qua lần khởi động lại (đã có, kiểm tra lại).

## E. Lệnh tạo theme mới + danh sách cần chuẩn bị cho người dùng
- `pnpm theme:new <id> --name "<Tên>"`: sao chép `data/themes/default` sang `data/themes/<id>`, đổi `id`/`name`, và tạo file `CAN-CHUAN-BI.md` trong thư mục đó.
- File này là bảng tiếng Việt, mỗi slot một dòng:
  - tên slot, tệp hiện tại;
  - **kích thước px chính xác** đang hiển thị, định dạng, có cần nền trong suốt không;
  - xuất hiện ở đâu (màn nào, khung nào), giới hạn dung lượng;
  - cột "Đã thay?" để người dùng đánh dấu.
- Ghi rõ:
  - ảnh nền phải là **lớp riêng không có chữ/khung UI** (ảnh mẫu dựng sẵn cả giao diện không dùng làm nền được);
  - chibi/MC phải đủ số khung/dáng như bản mặc định.
- Cập nhật `docs/THEME.md` theo các bước: `theme:new` → thay ảnh → `theme:validate` → Dashboard "Tải lại" → "Dùng theme này".

## F. Theme mẫu thứ 2 để kiểm tra đổi theme
- Dựng `fixtures/themes/mau-kiem-tra` chỉ bằng asset placeholder (được commit, không dùng ảnh của người dùng). Theme này khác default về màu, chữ tiêu đề, logo và danh hiệu.
- E2E (overlay program + preview + Dashboard):
  - đổi default → mau-kiem-tra: màu, chữ, logo, danh hiệu đổi đúng, overlay không cần tải lại trang;
  - bbox của mọi khung chính giống hệt default (lệch 0 px);
  - đổi lại default thì về như cũ;
  - đổi theme lúc vòng đang chạy bị chặn;
  - theme hỏng (thiếu file bắt buộc) hiện lỗi và không áp dụng được.

## Kiểm tra trước khi báo xong
- Gộp origin/main mới nhất.
- typecheck, privacy:check, vitest unit + integration.
- **Toàn bộ** Playwright 2 lượt: asset thật và `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`. Báo số passed/failed từng lượt, cả hai 0 failed.
- Ảnh duyệt ở `assets-local/review/c-theme-kit/` (KHÔNG commit). Gồm:
  - default trước/sau (chứng minh không đổi);
  - mau-kiem-tra ở LOBBY, QUESTION, REVEAL, LEADERBOARD, VICTORY;
  - trang Theme trên Dashboard;
  - một file `CAN-CHUAN-BI.md` mẫu.

## Bàn giao
- Push `codex2/c-theme-kit`, báo commit từng phần A–F, danh sách slot mới thêm, ảnh duyệt (đường dẫn tuyệt đối).
- ACK khi bắt đầu.
