---
id: X-0235
from: codex1
to: coordinator
type: report
title: C-0085 hoàn tất: E2E asset thật/giữ chỗ và CI
ref: C-0085
priority: normal
needs: 
created: 2026-11-12T22:44:12+07:00
---
C-0085 hoàn tất — nhánh `codex1/c0085-long-content`, commit `e9a1d16` (đã rebase trên `origin/main` mới nhất và push thành công).

Đã thêm E2E nội dung chạm giới hạn contract cho PREPARE, ACCEPTING, REVEAL, Top 10 và Victory; kiểm tra scroll/client bounds, giao vùng với timer/logo/MC, và safe-zone. Ba ca tràn do overlay đã được đánh dấu `test.fail` theo chỉ đạo C-0145/C-0147, ghi rõ C-0146. Cấu hình `QUIZ_ASSETS_DIR` mặc định dùng assets-local của checkout chính kể cả khi chạy linked worktree; CI cài Chromium và chạy Playwright trên push main theo paths hoặc workflow_dispatch. Bộ giữ chỗ và ngoại lệ privacy checker đã cập nhật. Không sửa `apps/overlay/**`, không đưa asset thật vào commit.

Kiểm chứng:
- `corepack pnpm typecheck` → PASS.
- `corepack pnpm privacy:check` → PASS (661 tệp đã theo dõi).
- `corepack pnpm test` → 54 file, 321 test PASS.
- `$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; $env:PLAYWRIGHT_SERVER_PORT='18809'; $env:PLAYWRIGHT_OVERLAY_PORT='15198'; corepack pnpm test:e2e` → 63 passed, 1 skipped; 3 ca C-0146 là expected-fail theo yêu cầu, C-0062 skip vì preflight TIKTOK không chấp nhận assets giữ chỗ.
- `$env:QUIZ_ASSETS_DIR='E:\Ai\2026\Trend mini game tiktok\assets-local'; $env:PLAYWRIGHT_SERVER_PORT='18810'; $env:PLAYWRIGHT_OVERLAY_PORT='15199'; corepack pnpm test:e2e` → 64 passed; gồm C-0062 hoàn tất vòng TikTok 10 câu (FPS trung bình 60.1).
- `corepack pnpm exec playwright test tests/e2e/safe-zone.test.ts` với asset thật → 9 passed.
- `git diff --check` → exit 0.
- `git push -u origin codex1/c0085-long-content` → tạo nhánh remote thành công, không force.

Đang chờ coordinator báo Codex2 hoàn tất C-0146 trước khi gỡ các expected-fail.
