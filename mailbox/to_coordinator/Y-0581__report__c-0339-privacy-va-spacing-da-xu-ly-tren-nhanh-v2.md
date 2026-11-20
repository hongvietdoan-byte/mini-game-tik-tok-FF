---
id: Y-0581
from: codex2
to: coordinator
type: report
title: C-0339 privacy và spacing đã xử lý trên nhánh v2
ref: C-0339
priority: high
needs: 
created: 2026-11-20T03:57:18+07:00
---
## C-0351 / C-0339 — hoàn tất nhánh v2

- Nhánh mới: `codex2/c-0339-throne-ui-v2`; commit `2393d536ab15787bdca434b1a740729b50fa1933`, đã push và đối chiếu `origin` trùng HEAD.
- Đã xóa remote branch `codex2/c-0339-throne-ui` theo yêu cầu.
- Quét `git log origin/main..HEAD --stat`: 9 ảnh thay đổi đều là placeholder, lớn nhất 3,352 byte; không có đường dẫn `tests/e2e/__screenshots__/` trong diff.
- `privacy-check` bỏ ngoại lệ cả thư mục screenshot; chỉ nhận ảnh placeholder trong danh sách chính xác hoặc ảnh `<4 KB`. Test bổ sung chặn ảnh 1 MB và đúng ngưỡng 4 KB.
- Giao diện: nhãn đồng hạng được dời lên 4 px, badge x3 nằm góc trên phải; E2E đo khoảng trống tie ≥8 px, badge cách PTS ≥8 px và tiêu đề ngai cách bubble MC ≥24 px.

### Xác minh

- `corepack pnpm typecheck` — PASS.
- `corepack pnpm privacy:check` — PASS, 1,350 tệp đã theo dõi.
- `corepack pnpm exec vitest run scripts/privacy-check.test.ts --config vitest.config.ts` — PASS, 13/13.
- `$env:PLAYWRIGHT_SERVER_PORT='18921'; $env:PLAYWRIGHT_OVERLAY_PORT='15321'; corepack pnpm exec playwright test tests/e2e/c0339-throne-ui.spec.ts --config playwright.config.ts` — PASS, 3/3 với asset thật.
- `$env:PLAYWRIGHT_SERVER_PORT='18931'; $env:PLAYWRIGHT_OVERLAY_PORT='15331'; $env:QUIZ_ASSETS_DIR=(Join-Path (Get-Location) 'fixtures/assets-placeholder'); corepack pnpm exec playwright test tests/e2e/c0339-throne-ui.spec.ts --config playwright.config.ts` — PASS, 3/3 với placeholder.
- `git diff --check` — PASS.

### Ảnh duyệt cục bộ (1080×1920)

Asset thật:

- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0339-throne-ui-v2\test-results\c0339-review\actual\throne-held-1080x1920.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0339-throne-ui-v2\test-results\c0339-review\actual\throne-tie-victory-1080x1920.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0339-throne-ui-v2\test-results\c0339-review\actual\victory-1080x1920.png`

Placeholder:

- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0339-throne-ui-v2\test-results\c0339-review\placeholder\throne-held-1080x1920.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0339-throne-ui-v2\test-results\c0339-review\placeholder\throne-tie-victory-1080x1920.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0339-throne-ui-v2\test-results\c0339-review\placeholder\victory-1080x1920.png`

Ảnh đang ở `test-results/` bị ignore, không commit. Ghi chú quyền riêng tư: xóa nhánh đã loại bỏ ref branch cũ; GitHub vẫn có thể giữ các commit cũ nếu còn PR/ref khác trỏ tới chúng. Diff sạch của v2 không chứa các ảnh này.
