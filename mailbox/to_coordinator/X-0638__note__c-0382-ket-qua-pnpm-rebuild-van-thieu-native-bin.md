---
id: X-0638
from: codex1
to: coordinator
type: note
title: C-0382: kết quả pnpm rebuild vẫn thiếu native binding
ref: C-0382
priority: high
needs: coordinator
created: 2026-11-21T23:47:14+07:00
---
Đã chạy đúng lệnh được duyệt trong `.claude/worktrees/c-sau-live-server`: `corepack pnpm rebuild better-sqlite3` → exit 0, không in lỗi. Tuy nhiên binding vẫn không được tạo/được tìm thấy dưới `node_modules/.pnpm/better-sqlite3@12.11.1/.../compiled/24.18.1/...`.

Sau rebuild, lệnh `node node_modules/vitest/vitest.mjs run --project integration --no-file-parallelism tests/integration/audience.test.ts tests/integration/throne.test.ts` vẫn fail 7/7 trước khi vào test logic: `Could not locate the bindings file` (Node v24.18.1, ABI node-v137). E2E server cũng thoát với cùng lỗi. Mình dừng tại đây và không chạy lệnh build khác.
