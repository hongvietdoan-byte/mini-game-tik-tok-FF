---
id: C-0397
from: coordinator
to: codex2
type: task
title: C-0397 theme phủ TOÀN BỘ asset: khung/biểu tượng/hiệu ứng + slots.json + sơ đồ lớp + kiểm phủ
ref: C-0397
priority: high
needs: 
created: 2026-11-22T17:46:38+07:00
---
# C-0397: bộ theme phủ TOÀN BỘ asset (làm tiếp trên nhánh `codex2/c-theme-goc`)

C-0396 chưa gộp. Người dùng nói rõ: bộ theme phải gói **toàn bộ asset**. Hiện bộ chỉ có nền, logo, cờ, chibi, MC, âm thanh, chữ và màu. Mọi khung giao diện vẽ bằng CSS/SVG đang bị xếp vào mục "cố định". Như vậy là **sai phạm vi**.

Hiểu đúng:
- **Giữ bố cục** = giữ vị trí và kích thước.
- **Hình của khung** thì phải thay được.

## Định nghĩa "toàn bộ asset"
Asset là mọi thứ người xem nhìn thấy hoặc nghe thấy trên overlay, **trừ**:
- dữ liệu trận: tên người chơi, điểm, câu hỏi, đáp án, số giây, số người;
- bố cục: vị trí và kích thước khung.

Các nhóm và mã ID:

| Mã | Nhóm | Gồm |
|---|---|---|
| N | Nền | ảnh nền sảnh, câu hỏi, Victory, video lặp |
| K | Khung giao diện (skin) | xem danh sách bên dưới |
| I | Biểu tượng | vương miện các màu, huy hiệu hạng 1–3, chữ A/B/C/D, nhãn x3, ghế trống, cúp, icon danh hiệu |
| V | Nhân vật | MC, chibi ghế, chibi Top 2/3, ngai |
| L | Thương hiệu | logo, cờ |
| H | Hiệu ứng | viền phát sáng, tia sáng, pháo giấy, hạt sáng |
| C | Màu | token CSS |
| F | Font | |
| T | Chữ cố định | gồm danh hiệu |
| A | Âm thanh | |

Nhóm K (khung giao diện) gồm:
- **Header:** khung kicker, khung VÒNG / ĐANG CHƠI, băng rôn tiêu đề.
- **BXH Top 10:** khung bảng, hàng Top 1/2/3, hàng thường.
- **Câu hỏi:** khung lớn, nhãn "CÂU HỎI n", khung câu hỏi, đồng hồ (vòng, nền, trạng thái sắp hết giờ).
- **Đáp án:** ô đáp án (thường / đúng / sai / mờ), thanh phần trăm.
- **Sảnh:** khung "SẮP BẮT ĐẦU", khung chào mừng.
- **MC:** bóng thoại, bảng tên MC.
- **Khán đài:** bậc khán đài, bảng tên trên ghế.
- **Ngai:** khung ngai, bảng tên chủ ngai.
- **Victory:** bảng Top 1/2/3.
- **Top 3 nhanh nhất:** khung và các hàng.
- **Khác:** INTERMISSION, CONNECTION_LOST, và mọi khung khác bạn tìm thấy.

## Kỹ thuật (giữ 0 px bố cục)
- Mỗi khung K/I/H thành một slot **ảnh skin**.
- Kích thước ảnh = đúng **bbox px thật** của phần tử đó trên màn 1080×1920. Đo bằng Playwright, ghi vào slot.
- Khung co giãn theo nội dung (hàng BXH, ô đáp án, bóng thoại): dùng **9-slice** (`border-image`) và ghi rõ vùng góc không được kéo giãn.
- Slot **chưa có ảnh** thì hiển thị y hệt hiện nay (CSS cũ làm dự phòng).
- **Theme default bật lên phải lệch 0 px** so với không có theme, đủ mọi màn.
- Theme chỉ thay hình/màu. Theme **không** đổi được vị trí, kích thước, z-index hay thứ tự lớp; schema chặn các khoá này.
- Bộ default xuất sẵn phải có **ảnh của từng khung đúng như đang hiển thị**: chụp phần tử đó, nền trong suốt, đúng kích thước. Người làm ảnh mở ra là thấy hình gốc để vẽ lại.

## Thư mục theme
- `assets/<nhóm>/<ID>-<tên-ngắn>/`, ví dụ `assets/K-khung/K07-o-dap-an/thuong.png`, `dung.png`, `sai.png`, `mo.png`.
- Mỗi thư mục món có `DOC-TOI.txt`: kích thước px, định dạng, có cần nền trong suốt không, 9-slice (nếu có), số file và tên file bắt buộc, màn nào, ảnh soi.
- Đổi đường dẫn mặc định thì giữ tương thích: theme cũ / `fixtures/themes/*` vẫn chạy được, hoặc migrate tự động.

## `slots.json` (cho agent đọc)
Mỗi slot gồm:
- `id`, `nhom`, `lop` (0 nền / 1 khung / 2 biểu tượng / 3 hiệu ứng), `thuMuc`;
- danh sách file bắt buộc + trạng thái;
- `kichThuoc` (rộng, cao, tỉ lệ, sai số);
- `nineSlice`;
- `dinhDang`, `nenTrongSuot`, `dungLuongToiDa`;
- `viTri[]` (màn, x, y, rộng, cao);
- `nam_tren` / `nam_duoi` (slot nào chồng lên slot nào);
- `ghiChu`.

`CAN-CHUAN-BI.md` sinh ra từ `slots.json` (một nguồn duy nhất).

## Kiểm tra: `theme:validate` + `theme:map`
- `theme:validate` kiểm từng slot: kích thước/tỉ lệ, định dạng, nền trong suốt, đủ file, tên file, dung lượng. Lỗi tiếng Việt ghi rõ ID, sai gì, cần sửa gì.
- `theme:map` sinh vào thư mục theme:
  - `SO-DO/<man>.png` đủ lớp, mỗi slot một màu riêng, viền đúng bbox, số ID lớn, nhãn kích thước;
  - `SO-DO/<man>-lop-0..3.png` tách theo lớp;
  - `soi/<ID>.png`: làm mờ mọi thứ khác, chỉ sáng slot đó, kèm khung đo kích thước và tọa độ.
  - Màn: LOBBY, QUESTION, REVEAL, LEADERBOARD / INTERIM_TOP10, VICTORY, INTERMISSION, CONNECTION_LOST.
- **Kiểm phủ:** thay mọi slot bằng ảnh thử (mỗi slot màu riêng + ID), chụp đủ màn. Pixel nào không thuộc slot nào và không phải dữ liệu trận thì báo "chưa có slot", kèm vùng. **Kết quả phải 0 vùng sót.** Ghi danh sách vùng được miễn (dữ liệu trận) vào báo cáo.

## Giữ nguyên từ C-0396
`theme:export-default`, `theme:new`, `theme:pack` / `theme:import`, Dashboard chọn theme, chữ và danh hiệu theo theme.

## Kiểm tra trước khi báo
- Gộp origin/main mới nhất.
- Chạy typecheck, privacy:check **sau khi commit**, vitest.
- Chạy Playwright đủ 2 lượt (asset thật và `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`), 0 failed. Có test chập chờn thì ghi tên và sửa.
- So pixel theme default với không có theme: 0 px ở mọi màn.
- Ảnh duyệt (KHÔNG commit) ở `assets-local/review/c-theme-full/`:
  - `SO-DO` mọi màn, ảnh tách lớp, ảnh kiểm phủ;
  - 5 ảnh `soi/` mẫu;
  - cây thư mục bộ default;
  - `slots.json` và `CAN-CHUAN-BI.md`.
- Không xuất vào checkout chính; dùng thư mục tạm trên ổ E rồi xoá.

## Bàn giao
- Commit từng phần, push `codex2/c-theme-goc`.
- Báo: số slot từng nhóm, đường dẫn ảnh duyệt tuyệt đối, kết quả kiểm phủ.
- ACK khi bắt đầu. Có điểm mơ hồ thì hỏi coordinator, không hỏi người dùng.
