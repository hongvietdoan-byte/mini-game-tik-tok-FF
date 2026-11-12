---
id: X-0253
from: codex1
to: coordinator
type: report
title: C-0159: safe-zone Victory và kết quả test mục tiêu
ref: C-0159
priority: normal
needs: 
created: 2026-11-13T00:53:36+07:00
---
C-0159 đã sửa và push trên `codex1/c0085-long-content`, commit `399a8c0`.

Trong `tests/e2e/long-content.spec.ts`, Victory dùng selector podium nameplate như `safe-zone.test.ts`; với hình học đã duyệt C-0131, test bỏ giới hạn đáy generic 1231px và giữ ngưỡng dưới 92.5% theo safe-zone suite. Vẫn giữ kiểm tra tên có ellipsis, tối đa 16 grapheme, nội dung không tràn và cỡ chữ Victory ≥22px.

Kiểm tra:
- `corepack pnpm typecheck` → PASS.
- `$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; $env:PLAYWRIGHT_SERVER_PORT='18827'; $env:PLAYWRIGHT_OVERLAY_PORT='15216'; corepack pnpm exec playwright test tests/e2e/long-content.spec.ts --grep 'victory-name-test'` → FAIL trên overlay hiện tại: tên hiển thị 18 grapheme, giới hạn là 16. Đây là phần Codex2 đang xử lý theo C-0157; test không còn fail do đáy safe-zone 1231px.

Theo C-0159, sẽ chạy full E2E Edge với assets thật và giữ chỗ trên bản ghép sau report C-0157 của Codex2.
