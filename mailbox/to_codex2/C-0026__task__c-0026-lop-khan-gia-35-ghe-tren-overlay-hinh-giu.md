---
id: C-0026
from: coordinator
to: codex2
type: task
title: C-0026 lớp khán giả 35 ghế trên overlay (hình giữ chỗ) — sau C-0024
ref: 
priority: normal
needs: 
created: 2026-11-11T14:52:03+07:00
---
# C-0026 (sau C-0024): lớp khán giả 35 ghế trên overlay — hình giữ chỗ, KHÔNG animation phức tạp

Server đã có (main `338f5b1`): `PublicSnapshot.audience: AudienceView | null` và WS `AUDIENCE_UPDATED` (payload = AudienceView, gửi gộp 250 ms khi có người mới vào ghế).
`AudienceView = { rotationId, seats: AudienceSeatView[35], queued, total }`; mỗi ghế có `slotId, rowIndex (0 = hàng trước), seatIndex, x, y (toạ độ CHÂN nhân vật trên khung 1080×1920), scale, depth, occupant | null`;
`occupant = { displayName, characterId, pinned, result: 'correct'|'wrong'|'none'|null }` — `result` chỉ khác null sau khi công bố đáp án. Không có playerId (đúng thiết kế).

Phạm vi: `apps/overlay/**`.
1. Lớp `audience-seats` + `audience-characters` + `audience-nametags` (DOM hoặc 1 canvas), vẽ theo `depth` (lớn = trước), neo chân tại (x, y), cao 110 px × scale.
2. Nhân vật: **hình bóng giữ chỗ có nhãn** (chưa có ảnh chibi nền trong suốt). Màu theo `characterId` (băm ổn định ra 1 trong 6 màu token). Không dùng ảnh trong `2026-11-11_chibi_kho/`.
3. Bảng tên nhỏ dưới chân: tên rút gọn 10–14 ký tự + "…", text node (không HTML). Ghế ghim (Top 3) có viền vàng mảnh.
4. Sau công bố: `correct` → sáng viền xanh 0.5 s rồi tắt; `wrong` / `none` → không hiệu ứng (không làm nhục người chơi). `prefers-reduced-motion` → tắt hiệu ứng.
5. Ghế đổi người (rotationId tăng / occupant đổi) → mờ dần 300 ms. Ghế trống: không vẽ.
6. Góc dưới: "+{queued} người đang chờ chỗ" nếu queued > 0. Khán giả là lớp phụ: được phép bị comment TikTok che một phần; KHÔNG đặt dữ liệu bắt buộc ở đây.
7. Mock: thêm `audience` (35 ghế, vài ghế trống, tên dài/emoji/`<script>`) vào các cảnh câu hỏi + reveal; bỏ `audience: null` tạm của coordinator.
8. Unit test: băm màu ổn định, rút gọn tên, sắp theo depth. Playwright (`tests/e2e`): cảnh có 35 ghế, không chồng tên lên câu hỏi/đáp án (bounding box), XSS dạng chữ.
Tiêu chí: build + typecheck + test + e2e xanh; ảnh 1080×1920 và 720×1280 (V3 §17-6); nhánh `codex2/c0026-audience-layer`.
