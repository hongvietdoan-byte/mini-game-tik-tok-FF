---
id: C-0172
from: coordinator
to: codex2
type: task
title: HUD tùy chỉnh: trang cài đặt + overlay đọc cấu hình (sau C-0166, C-0168)
ref: 
priority: normal
needs: 
created: 2026-11-13T14:49:29+07:00
---
## Yêu cầu người dùng (13/11)
"Giữ mockup, nhưng thay được chữ, logo, nền… tùy chỉnh HUD trong cài đặt mini game."
→ BỐ CỤC GIỮ NGUYÊN (C-0133 câu hỏi, C-0131 Victory, header B2 C-0168). Chỉ NỘI DUNG đổi được: chữ, logo, ảnh nền. Không đổi vị trí/kích thước khung.

## Hợp đồng chung (codex1 làm phần server/shared, codex2 dùng)
Kiểu `HudConfig` trong `packages/shared` (có default = giá trị đang hiện trên màn hình bây giờ):
- `texts`: `kicker` ("STORM ARENA"), `arenaTitle` ("ĐẤU TRƯỜNG BÃO TỐ"), `playingLabel` ("ĐANG CHƠI"), `roundLabel` ("VÒNG"), `leaderboardTitle` (chữ tiêu đề BXH hiện tại), `victoryTitle` (chữ tiêu đề Victory hiện tại nếu có). Mỗi trường có giới hạn độ dài (đề xuất 24–28 grapheme), trim, không HTML.
- `images`: `logo`, `bgQuestion`, `bgLobby`, `bgVictory` — mỗi cái là `null` (= dùng ảnh mặc định hiện tại) hoặc id ảnh đã tải lên.
- `version` (số tăng mỗi lần lưu) để overlay biết mà nạp lại.

API (server):
- `GET /api/hud` — công khai cho overlay đọc (không lộ đường dẫn ổ đĩa).
- `PUT /api/hud` — cần mã quản trị; validate bằng schema; lưu `data/hud.json` (ghi nguyên tử).
- `POST /api/hud/images?slot=logo|bgQuestion|bgLobby|bgVictory` — cần mã quản trị; chỉ PNG/JPG/WEBP, kiểm magic bytes, ≤ 8 MB, lưu `data/hud-assets/<hash>.<ext>`, trả id + kích thước ảnh.
- Phục vụ ảnh ở `/hud-assets/<id>` (MIME đúng, cache theo hash).
- `POST /api/hud/reset` — về mặc định.
- Snapshot WS mang `hudVersion` (hoặc đẩy sự kiện) để overlay tự nạp lại không cần F5.
- Preflight: WARN nếu ảnh cấu hình bị thiếu file hoặc tỉ lệ nền khác 9:16 quá nhiều.

## Việc của codex2 (làm SAU C-0166 + C-0168)
1. Dashboard: thêm trang/tab "Giao diện HUD": ô sửa từng chữ (đếm ký tự, báo vượt giới hạn), nút tải ảnh cho từng ô ảnh (logo, nền câu hỏi, nền sảnh, nền Victory) + nút "Về mặc định" từng ô và toàn bộ, khung xem trước nhỏ (iframe `/overlay/?role=preview&mock=...`) đổi được giữa câu hỏi / Top 10 / Victory.
2. Overlay: bỏ chữ/ảnh gắn cứng ở `BrandMark.tsx`, `ArenaStage.tsx`, `ArenaBackdrop.tsx`, `Victory.tsx`… → lấy từ `HudConfig` (fallback default khi chưa có). Ảnh luôn `object-fit: contain` cho logo, `cover` cho nền. Chữ dài vẫn nằm trong khung cũ (tự thu nhỏ tới cỡ tối thiểu rồi cắt "…"). Đổi cài đặt → overlay tự cập nhật không cần F5.
3. Chờ note của codex1 về API; trong lúc chờ có thể làm phần overlay đọc config với default.
Chụp ảnh: mặc định (phải giống hệt hiện tại) + 1 bộ đã đổi chữ/logo/nền thử vào `assets-local/review/hud/`. Nhánh `codex2/hud-settings`. typecheck + test + e2e rồi report.
