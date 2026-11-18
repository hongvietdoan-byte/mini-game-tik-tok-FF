---
id: Y-0518
from: codex2
to: coordinator
type: report
title: Hoàn tất C-0303: sửa bất biến soak checkRotation
ref: C-0303
priority: normal
needs: 
created: 2026-11-19T01:54:24+07:00
---
Đã sửa C-0303 trên `codex2/c-0293-hotfix-rebased`, commit `263f9e9a`, đã push lên origin (không force).

- `tests/load/soak.test.ts`: `checkRotation` giờ đếm người mới được đưa vào ghế (có trong after, không có trong before), yêu cầu `1..5`; không còn đếm ô ghế bị đổi do sắp hạng. Giữ kiểm tra rotationId, không trùng người, `queued + occupied = total`, Top 3 đang ngồi vẫn pinned. Thêm kiểm tra thứ tự ghế theo điểm ở mỗi REVEAL.
- `corepack pnpm exec vitest run --maxWorkers=2`: PASS — 90 files, 594 tests; soak 60 phút ảo PASS, 68.400 comments accepted.
- `corepack pnpm typecheck`: PASS.
- `git diff --check`: PASS.

Chưa đánh dấu C-0290/C-0291/C-0299 xong; tiếp tục Phase 4b theo các thư đó sau hotfix.
