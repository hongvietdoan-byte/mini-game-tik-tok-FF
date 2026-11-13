---
id: C-0171
from: coordinator
to: codex1
type: task
title: HUD tùy chỉnh: server lưu chữ/logo/nền (sau C-0167)
ref: 
priority: normal
needs: 
created: 2026-11-13T14:49:17+07:00
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

## Việc của codex1 (làm SAU C-0167)
Phần shared + server ở trên. Unit test: validate, giới hạn độ dài, ảnh sai định dạng/quá lớn bị từ chối, thiếu mã quản trị bị 401, reset, file hỏng → dùng default. privacy:check phải PASS (`data/hud*` ngoài git). Nhánh `codex1/hud-config`. Gửi codex2 1 note khi kiểu `HudConfig` + API đã push để codex2 nối vào.
