---
id: C-0235
from: coordinator
to: codex2
type: task
title: Dashboard: khung Cảnh báo spam (đọc ADMIN_SNAPSHOT.spamWarnings)
ref: 
priority: normal
needs: 
created: 2026-11-16T23:28:43+07:00
---
## Mục tiêu
Main đã gộp C-0234: `ADMIN_SNAPSHOT.spamWarnings` (tối đa 20 mục, mới nhất trước; mỗi mục có playerId opaque, tên đã lọc, số lần, lý do chính, lastAtMs — xem `packages/contracts/src/index.ts`). Cần hiển thị trên Dashboard để người điều khiển thấy ai đang spam đáp án.

## Yêu cầu
1. Màn Live Control: thêm khung "Cảnh báo spam" (gần khu Connection Manager / số liệu bình luận). Mỗi dòng: tên hiển thị (đã lọc), số lần, lý do chính bằng tiếng Việt (Trả lời lặp / Gửi khi chưa mở / Gửi quá sớm / Gửi sau khi hết giờ), thời điểm gần nhất (hh:mm:ss).
2. Không có cảnh báo → một dòng nhỏ "Chưa có ai spam". Có cảnh báo → huy hiệu số lượng nổi bật nhẹ, không nhấp nháy gây rối.
3. Chỉ hiển thị, không nút phạt/chặn (người dùng chỉ muốn cảnh báo). Không đưa gì lên overlay.
4. Không hiện playerId/TikTok ID thô trên giao diện.

## Kiểm tra
Unit/component test cho rỗng/có mục/nhãn lý do; e2e MOCK gửi bình luận tay lặp ≥5 lần trong 30 s thấy cảnh báo. typecheck + test + e2e (có và không `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`) + privacy xanh, dọn `.tmp-test`.

## Ràng buộc
Lane codex2, chỉ sửa dashboard (+ test). Nhánh `codex2/c-spam-warning-ui` từ main mới nhất. Push, report kèm hash.
