---
id: C-0233
from: coordinator
to: codex2
type: task
title: Ghế khán giả cập nhật ngay trong lúc trả lời + chibi không tải (lazy)
ref: 
priority: high
needs: 
created: 2026-11-16T22:25:38+07:00
---
## Bối cảnh
Người dùng chạy thử MOCK 16/11 tối: đầu câu 1 ghế khán giả trống, gần cuối câu (hoặc tới REVEAL) mới hiện người; nhiều ghế chỉ có tên, không có chibi. Coordinator đã đo trên overlay `?role=preview` (MOCK 200 người giả lập): suốt READING+ACCEPTING 0 ghế có người, tới REVEAL mới 35/35; sau đó 35 ảnh chibi nhưng 13 ảnh `complete=false` mãi không tải (không lỗi 404).

## Lỗi 1 — overlay bỏ qua `AUDIENCE_UPDATED`
Server (`apps/server/src/runtime.ts` ~1270, `scheduleCounts`) phát `AUDIENCE_UPDATED` (payload = `publicSnapshot().audience`) theo nhịp ANSWER_COUNTS khi có người mới ngồi ghế. Overlay (`apps/overlay/src`, không có chỗ nào xử lý `AUDIENCE_UPDATED`) chỉ cập nhật ghế khi nhận STATE_SNAPSHOT đầy đủ → ghế chỉ đổi ở lần chuyển trạng thái kế tiếp.
- Xử lý `AUDIENCE_UPDATED` trong `net/useSnapshot.ts`: gộp vào snapshot hiện tại (`audience`), bỏ qua bản cũ hơn nếu có rotationId/stateVersion để so; không làm reset hiệu ứng khác.
- Ghế phải hiện người trong lúc ACCEPTING, ngay khi có đáp án hợp lệ đầu tiên (độ trễ ≈ nhịp ANSWER_COUNTS).

## Lỗi 2 — chibi `loading="lazy"` không tải
`v3/ArenaStage.tsx` `SeatChibi`: `<img loading="lazy">` trong khung overlay bị scale → trình duyệt coi ngoài viewport, ảnh không bao giờ tải. Bỏ `loading="lazy"` (dùng eager), cân nhắc preload danh sách chibi của manifest khi vào LOBBY để ghế mới hiện chibi ngay. Giữ `onError` ẩn ảnh lỗi.

## Kiểm tra
- Unit test reducer `AUDIENCE_UPDATED`.
- E2E: MOCK + simulator, trong ACCEPTING câu 1 có ≥1 ghế có tên trước khi hết giờ; mọi ảnh chibi của ghế có người `naturalWidth > 0` (chạy cả với `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`).
- Không đổi vị trí/bố cục đã duyệt (ảnh mẫu 14/11).

## Ràng buộc
Lane codex2. Nhánh `codex2/c-seats-live-update` từ main mới nhất. typecheck + test + e2e (có và không placeholder) + privacy xanh, dọn `.tmp-test`. Push nhánh, report kèm hash. Người dùng đang chạy thử, ưu tiên cao.
