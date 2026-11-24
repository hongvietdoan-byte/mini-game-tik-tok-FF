---
id: C-0418
from: coordinator
to: codex1
type: task
title: C-0416 chưa đạt: soak chậm và tốn bộ nhớ hơn main — sửa reorderByRank
ref: C-0416
priority: high
needs: 
created: 2026-11-24T08:49:53+07:00
---
Coordinator đã gộp thử codex1/c-ghe-theo-diem (3d436ebf) với main dcc7cdf1 và chạy đủ bộ test:
- typecheck, privacy, vitest 686/686: qua.
- Playwright ảnh thật: lượt 1 có 175 qua + 1 lỗi FPS chập chờn (c0197), lượt 2 qua 176/176. Placeholder: 175 qua + 1 bỏ qua. Phần này ĐẠT.
- test:load: KHÔNG ĐẠT.
  - soak.test.ts timeout ở 300 s.
  - Đối chứng: main (chỉ sửa tạm 35→30 ở soak.test.ts:74) qua trong 259 s, heap 64→150 MiB (+86, dưới 96).
  - Nhánh của bạn: >325 s, heap +115 MiB. Hồi quy do nhánh gây ra, không phải do máy.

NGUYÊN NHÂN KHẢ DĨ (apps/server/src/audience.ts, reorderByRank ~266–340):
1. Mỗi REVEAL dựng candidateIds từ known + joinOrder + seats + queue + rankByPlayer, rồi sort TOÀN BỘ (hàng nghìn id).
2. `nextQueue = rankedIds.slice(30)`: hàng chờ bị xếp lại theo điểm mỗi câu, nên `changed` gần như luôn true → dirty → saveAudienceState ghi JSON cả hàng chờ (vài nghìn id) mỗi REVEAL. Đây là nghi phạm chính về thời gian và heap.
3. `this.store.displayNames([playerId])` gọi trong vòng lặp (~305).
4. runtime.ts:524 cũng gọi reorderByRank khi khôi phục (không sao, nhưng dùng chung đường nhanh).

HƯỚNG SỬA (đơn giản nhất, giữ nguyên hành vi người xem thấy):
a. Chọn Top 30 bằng cách duyệt một lượt this.ranked (đã xếp sẵn theo điểm ở runtime): bỏ chủ ngai, lấy 30 người đầu. Tie-break giữ như spec C-0416. Nếu this.ranked chưa xử lý tie "đang ngồi trước" thì chỉ xếp lại nhóm đồng điểm quanh vị trí 30, không sort cả danh sách.
b. Hàng chờ GIỮ thứ tự cũ (FIFO, không hiện trên màn hình): chỉ bỏ những người vừa được chọn vào ghế, và thêm người vừa rời ghế vào cuối. Như vậy state chỉ đổi khi ghế thật sự đổi.
c. Không gọi store trong vòng lặp. Người thiếu tên/nhân vật thì gom lại, gọi displayNames một lần.
d. Không thêm vào candidate những id chưa qua onAccepted. Nếu gặp thì bỏ qua và console.warn một lần.

TIÊU CHÍ XONG:
- `corepack pnpm test:load` qua toàn bộ với giới hạn gốc (300 s, heap 96 MiB), KHÔNG nới ngưỡng. Báo thời gian và heap start/mid/end của soak, kèm số đo main để so.
- Sửa luôn tests/load/audience.test.ts (đang chờ 35 ghế, lỗi có sẵn trên main) theo 30 ghế.
- Unit/integration C-0416 giữ nguyên ý: 40 người, đồng điểm, đổi chủ ngai, không ai ở 2 nơi, sảnh FIFO.
- typecheck, privacy, vitest đủ, Playwright ảnh thật 2 lượt + placeholder; báo passed/failed từng lượt.
- Merge origin/main mới nhất, push cùng nhánh codex1/c-ghe-theo-diem.
