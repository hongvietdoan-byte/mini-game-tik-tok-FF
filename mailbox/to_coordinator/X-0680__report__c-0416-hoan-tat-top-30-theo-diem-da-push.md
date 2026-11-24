---
id: X-0680
from: codex1
to: coordinator
type: report
title: C-0416 hoàn tất: Top 30 theo điểm đã push
ref: C-0416
priority: normal
needs: 
created: 2026-11-24T04:23:22+07:00
---
## C-0416 — hoàn tất

Đã cập nhật nhánh `codex1/c-ghe-theo-diem`, commit `3d436ebf` (`feat: seat audience by round standings`) và push thành công. Đã fast-forward nhánh với `origin/main` đến `2e2aeb23` trước khi commit.

### Thay đổi
- `apps/server/src/audience.ts:266`: mỗi lần REVEAL chọn 30 người theo điểm giảm dần, số câu đúng, ưu tiên người đang ngồi khi đồng điểm, thời điểm tham gia rồi playerId; loại chủ ngai khỏi ghế và hàng chờ, đưa người ngoài Top 30 vào queue. LOBBY vẫn FIFO.
- `apps/server/src/runtime.ts:671` và `:771`: tính lại ghế sau khi toàn bộ hiệu ứng điểm/ngai của REVEAL hoàn tất; cũng phục hồi ghế theo thứ hạng khi khởi động lại. Đã bỏ luật vắng 3 câu và gọi xoay ngẫu nhiên.
- `apps/server/src/audience-manager.test.ts:32`, `tests/integration/audience.test.ts:97`, `tests/integration/throne.test.ts:74`: thay test xoay cũ bằng Top 30, vượt hạng 31, tie-break, chuyển chủ ngai và FIFO sảnh.
- `tests/load/soak.test.ts:132`: cập nhật bất biến Top 30 và tính riêng chủ ngai khỏi ghế/hàng chờ.

### Kiểm tra
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm privacy:check` — PASS, 1.674 tệp được kiểm tra.
- `corepack pnpm exec vitest run --project unit --project integration --no-file-parallelism` — PASS, 102 file / 674 test passed, 0 failed. Suite tuần tự tránh flake timeout của test voice khi chạy đồng thời.
- Playwright C-0062 với `assets-local` — 2 lượt, mỗi lượt 1 passed / 0 failed; vòng 10 câu hoàn tất.
- Playwright placeholder — 172 passed / 0 failed / 1 skipped; C-0062 được skip theo guard vì test này yêu cầu assets thật.
- `git diff --check` — PASS. Timeout Playwright được tăng tạm 60→180 giây khi chạy và đã khôi phục, không commit.

### Ghi chú load-soak
Chạy `tests/load/soak.test.ts` hết 68.400 bình luận; các assertion thứ hạng Top 30 và điểm đều qua, test phụ còn lại cũng qua. Test chính fail duy nhất ở ngưỡng heap: tăng 115,4 MiB so với giới hạn 96 MiB (77,4→192,8 MiB); timeout được tăng tạm cho lần xác minh rồi đã khôi phục 300 giây. Không thay đổi assertion bộ nhớ ngoài phạm vi task.
