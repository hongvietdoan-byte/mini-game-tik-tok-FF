---
id: C-0416
from: coordinator
to: codex1
type: task
title: C-0416: ghế khán giả chỉ xếp theo điểm cao (bỏ xoay ngẫu nhiên)
ref: 
priority: high
needs: 
created: 2026-11-24T02:53:19+07:00
---
# C-0416 — Ghế khán giả = Top 30 theo điểm (người dùng chốt 24/11)

Người dùng: "các ghế hiện tại cứ sắp xếp theo điểm cao thôi". Nhãn hàng chờ sẽ bị bỏ (Codex 2 làm riêng sau), nên không còn cần xoay ghế để người chờ có lượt.

## Hiện trạng (đã đọc code)
- `apps/server/src/runtime.ts:738-741`: ở REVEAL gọi `audience.reorderByRank(scores)` → chỉ đổi VỊ TRÍ của người đang ngồi theo điểm.
- `runtime.ts:754-759` + `apps/server/src/audience.ts:264` `rotateBetweenQuestions`: cứ `audienceRotateEvery` câu thì thay chủ ngai + người vắng 3 câu bằng người hàng chờ (FIFO), rồi ghim Top 3–5 và `rotate` tối đa 5 swap NGẪU NHIÊN với hàng chờ.

## Yêu cầu mới (cách đơn giản nhất)
1. Ở REVEAL (cùng chỗ `reorderByRank`), thay bằng một bước duy nhất: chọn người ngồi = 30 người đứng đầu bảng điểm vòng (trừ người đang giữ ngai — người này chỉ hiện trên ngai, không chiếm ghế), rồi xếp vị trí theo hạng như `reorderByRank` hiện làm. Người ngoài Top 30 vào hàng chờ (server vẫn giữ `queued` cho dashboard).
2. Thứ tự hạng: điểm giảm dần → số câu đúng giảm dần → người đang ngồi trước người đang chờ (tránh đổi ghế vô cớ khi đồng điểm) → vào sớm hơn trước → playerId.
3. Bỏ hẳn lời gọi `rotateBetweenQuestions` ở `runtime.ts:754-759` (và luật "vắng 3 câu" + xoay ngẫu nhiên). Có thể xoá hàm nếu không còn ai dùng; giữ `audienceRotateEvery`/`audiencePinTop` trong schema nếu xoá gây vỡ tương thích config cũ (chỉ bỏ qua giá trị).
4. Sảnh (LOBBY) giữ như cũ: ai comment trước ngồi trước, đủ 30 thì vào hàng chờ.
5. Khi ngai đổi chủ: chủ mới rời ghế (ghế đó nhận người hạng kế tiếp ở lần REVEAL đó); chủ cũ quay về xét như mọi người theo điểm.
6. Không ai xuất hiện 2 nơi (ghế + ngai), không ghế trống khi hàng chờ còn người.

## Test bắt buộc
- Unit `audience`: 40 người có điểm khác nhau → sau REVEAL 30 ghế đúng Top 30 (trừ chủ ngai), sắp đúng hạng; người hạng 31 vào ghế khi vượt điểm người hạng 30 ở câu sau.
- Đồng điểm: người đang ngồi giữ ghế, không đổi chỗ qua lại.
- Chủ ngai không có ghế; mất ngai thì quay lại ghế nếu đủ hạng.
- Integration/e2e liên quan rotation cũ: sửa theo hành vi mới (ghi rõ test nào đổi và vì sao).
- Chạy: typecheck, privacy:check, vitest unit+integration đủ, Playwright đủ 2 lượt asset thật + 1 lượt placeholder (webServer timeout đã là 180 s trên nhánh theme; nếu main chưa có thì đặt tạm env cục bộ, không commit).

## Giao hàng
- Nhánh `codex1/c-ghe-theo-diem` từ origin/main mới nhất; merge origin/main lại trước khi báo (nhánh theme `codex2/c-theme-goc` có thể vào main trong lúc bạn làm).
- Không commit ảnh/log chẩn đoán. Report: file:dòng đã đổi, số passed/failed từng lượt.
