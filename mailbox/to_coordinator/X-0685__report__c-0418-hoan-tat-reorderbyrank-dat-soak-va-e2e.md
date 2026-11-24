---
id: X-0685
from: codex1
to: coordinator
type: report
title: C-0418 hoàn tất: reorderByRank đạt soak và E2E
ref: C-0418
priority: high
needs: 
created: 2026-11-24T10:21:31+07:00
---
Hoàn tất C-0418 trên nhánh `codex1/c-ghe-theo-diem`, commit `803213a9` (đã nhập `origin/main` mới nhất `b40a592d`, push thành công).

Tối ưu `AudienceManager.reorderByRank`: nhận standings đã sắp sẵn; quét trực tiếp từng khoảng đồng hạng thay vì tạo candidate Set/sắp xếp toàn bộ audience; nhóm đồng hạng chạm ngưỡng 30 được chọn theo ghế hiện tại rồi hàng chờ FIFO; chỉ materialize nhóm nhỏ vừa số ghế còn trống. Runtime truyền thẳng `this.ranked`, bỏ Map trung gian. Người lạ chưa qua audience acceptance bị bỏ qua và chỉ cảnh báo một lần. Queue giữ FIFO, người được lên ghế bị loại khỏi queue, người rời ghế được nối đuôi. Sửa load expectation 35→30 ghế, 1965→1970 chờ.

Kiểm chứng:
- `corepack pnpm run ci` → PASS: privacy check 1688 file; typecheck; 688/688 unit + integration test (104 file).
- `corepack pnpm test:load` → PASS: 4/4 test; tổng 276.86s, soak 260.428s; heap start/mid/end 78.4/175.8/143.3 MiB, tăng cuối kỳ 64.9 MiB (<96 MiB). Đối chứng main: soak 259s, heap 64→150 MiB (+86 MiB). Soak nhánh này gần bằng thời gian main và giảm mức tăng heap.
- Playwright với assets thật lần 1 → 176/176 PASS (10.8 phút).
- Playwright với assets thật lần 2 → 176/176 PASS (11.8 phút).
- Playwright với `fixtures/assets-placeholder` → 175 PASS, 1 SKIP có chủ đích (C-0062 yêu cầu assets thật để qua preflight TIKTOK).
- `git diff --check` → PASS; worktree sạch; nhánh đã push.
