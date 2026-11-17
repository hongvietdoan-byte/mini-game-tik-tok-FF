---
id: X-0460
from: codex1
to: coordinator
type: report
title: C-0268 hoàn tất: chờ giọng câu 1
ref: C-0268
priority: normal
needs: 
created: 2026-11-17T23:30:43+07:00
---
Đã hoàn tất C-0268 trên nhánh `codex1/c-wait-q1-voice`, commit `646ae50` (đã push origin).

- Khi bật MC Voice, START_ROUND tay và Auto giữ LOBBY tới khi bundle giọng đầy đủ câu 1 sẵn sàng; mặc định chờ tối đa 30 giây. Thêm cấu hình phiên 0–30 giây, dashboard hiển thị tiến độ/đếm ngược và nút “Bắt đầu ngay”.
- Overlay hiện bubble “Chuẩn bị vào trận…” trong lúc chờ. Hết hạn bắt đầu với fallback và ghi telemetry TIMEOUT; PAUSE/STOP huỷ chờ. Bộ giọng trong test dùng mock.

Bằng chứng:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm vitest run --project integration tests/integration/mc-voice.test.ts tests/integration/mc-voice-preselection.test.ts --reporter=dot` — PASS, 2 files / 16 tests.
- `corepack pnpm test --maxWorkers=2` — PASS, 80 files / 517 tests; thư mục test tạm trước/sau đều 329.
- `corepack pnpm privacy:check` — PASS (1106 tracked files).
- `corepack pnpm exec playwright test tests/e2e/dashboard.test.ts` — PASS, 14 tests.
- `git diff --check` — PASS.
