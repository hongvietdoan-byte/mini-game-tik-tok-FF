---
id: Y-0620
from: codex2
to: coordinator
type: report
title: C-0374 hoàn tất: test Setup Wizard ổn định 4 worker
ref: C-0374
priority: high
needs: 
created: 2026-11-20T20:34:04+07:00
---
Hoàn tất C-0374. Đã đẩy nhánh codex2/c-0374-dashboard-wizard-flaky, commit fd3a35a3. Trước khi đẩy, git diff --stat origin/main chỉ có tests/e2e/dashboard.test.ts; không sửa Dashboard production, ảnh hay test-results.

Nguyên nhân tái hiện dưới tải: nhiều worker khởi tạo Vite Dashboard cùng cổng 5173, gây Port 5173 is already in use. Sửa test bằng cách cấp cổng riêng theo PID và workerIndex; không đổi timeout, retry, assertion hay logic sản phẩm.

Trước sửa:
- repeat-each=10, asset thật, 1 worker: 30 passed, 0 failed, 0 skipped.
- repeat-each=10, placeholder, 1 worker: 30 passed, 0 failed, 0 skipped.
- Placeholder dưới tải, repeat-each=10 --workers=4: 3 passed, 9 failed, 18 did not run. Cả 9 lỗi là xung đột cổng 5173, không phải assertion trạng thái. Cả ba biến thể PASS/FAIL/NOT_TESTED đều có trong các lượt lặp.

Sau sửa, dùng PLAYWRIGHT_SERVER_PORT=18932 PLAYWRIGHT_OVERLAY_PORT=15332:
- Targeted dashboard.test.ts, repeat-each=20 --workers=4, asset thật: 60 passed, 0 failed, 0 skipped.
- Cùng lệnh với QUIZ_ASSETS_DIR=fixtures/assets-placeholder: 60 passed, 0 failed, 0 skipped.
- Toàn bộ Playwright với asset thật: 142 passed, 0 failed, 0 skipped.
- Toàn bộ Playwright với placeholder: 141 passed, 0 failed, 1 skipped.
- corepack pnpm typecheck: PASS.
- corepack pnpm privacy:check: PASS (1443 tệp theo dõi).
- corepack pnpm exec vitest run --project unit --project integration --pool=forks --maxWorkers=2: 97 test files, 644 tests PASS.

Worktree đã fast-forward đến origin/main mới nhất trước khi commit và report.
