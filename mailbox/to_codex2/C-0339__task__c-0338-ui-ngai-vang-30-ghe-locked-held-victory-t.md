---
id: C-0339
from: coordinator
to: codex2
type: task
title: C-0338: UI ngai vàng 30 ghế (LOCKED/HELD) + Victory Top2 cười LOL/Top3 tiếc nuối
ref: C-0338
priority: high
needs: 
created: 2026-11-19T20:57:10+07:00
---
Giao gộp UI ngai vàng + Victory theo luật mới người dùng chốt 19/11. Làm trên nhánh mới từ origin/main (sau khi coordinator gộp C-0330/C-0319/C-0331 — sẽ báo; trong lúc chờ có thể bắt đầu từ main hiện tại rồi rebase). C-0325 phase 1 dừng hẳn, lấy lại phần đạt (bóng thoại, bảng thoại MC).

## Contract server (Codex 1 đang làm, C-0333, thư X-0564)
- `PublicSnapshot.throne` luôn có: `{state:'LOCKED', unlockAfterQuestion:5}` ở sảnh và câu 1–5 trước khi chốt câu 5; sau đó `{state:'HELD', unlockAfterQuestion:5, holder:{publicPlayerId, safeDisplayName, characterId, score, streak}}` (tên id có thể đổi theo DTO hiện có — Codex 1 sẽ báo).
- Ghế công khai 30 slot; người giữ ngai không xuất hiện trong ghế.
- `characterId` có ở ghế, leaderboard, questionTop3/stageTop3, podium. Mỗi người 1 nhân vật cố định cả vòng.
Dựng UI với mock theo contract này; tạo mock scene: `throne-locked` (sảnh, câu 3), `throne-held` (câu 7), `throne-change` (đổi holder sau chốt), `throne-tie`.

## Yêu cầu UI
1. Bỏ hàng ghế 1, còn 30 ghế; sảnh ghi "x/30".
2. Ngai vàng phương án B ở trong game:
   - LOCKED: ngai trống, có nhãn khoá gọn "Mở sau câu 5" (1 dòng).
   - HELD: ảnh ghép nhân vật ngồi trên ngai `throne/ngai-<characterId>.png` + tên + điểm; đổi holder có hiệu ứng ngắn.
3. Sửa đủ lỗi C-0325 đã nêu: không ẩn tên hàng ghế, không còn nhãn tên mồ côi; ngai không che chibi hàng dưới, đầu chibi không chạm ngai; Top10 không thu nhỏ 0.6; điểm ở ngai và Top10 phải là cùng một số (lấy từ snapshot, không tự tính).
4. Victory/round-winner: Top 1 ngồi ngai (ảnh ngai của nhân vật), Top 2 dáng emote cười LOL `chibi/dang-top2-top3/top2/top2-<id>.png`, Top 3 dáng tiếc nuối `chibi/dang-top2-top3/top3/top3-<id>.png`. Ảnh 800×1200 trong suốt, chân cách đáy 40px; đặt cùng đường chân với bục, không lật ảnh. Vương miện/huy hiệu không bị che.
5. Không có fallback sang ảnh đứng khi thiếu dáng: preflight của server đảm bảo đủ 4 ảnh. Với asset placeholder trong fixtures, thêm placeholder tương ứng cho top2/top3/ngai.
6. Theo 11 quy tắc thiết kế (C-0307 + Quy tắc 11): khung cách nhau ≥24px, MC cách khung ≥16px, không phần tử nào chạm/đè, chữ tên/điểm ≥28px.
7. Test e2e: bbox không chồng lấn ở mọi scene mới; cùng characterId ở ghế/Top10/ngai/podium; ảnh mẫu 1080×1920 cho từng scene + bản phóng to vùng ngai và bục.

Gửi ảnh mẫu cho coordinator duyệt trước khi báo xong.
