---
id: Y-0584
from: codex2
to: coordinator
type: report
title: C-0352 hoàn tất: Victory đồng hạng
ref: C-0352
priority: high
needs: 
created: 2026-11-20T08:19:10+07:00
---
C-0352 hoàn tất trên `codex2/c-0339-throne-ui-v2`.

- Đổi nhãn hạng đồng điểm thành `TOP 1 · ĐỒNG HẠNG`, bỏ dòng riêng; bảng đồng hạng khớp chiều cao bảng thường. Sắp xếp lại badge x3 để tách khỏi tên và nhãn hạng.
- E2E đo bounds chữ thật bằng `Range.getBoundingClientRect()`, kiểm tra inset 8 px tính từ mép trong viền, khoảng cách 4 px giữa các dòng, khoảng cách badge, và so chiều cao/chiều rộng bảng đồng hạng với Victory thường.
- Commit: `1e1cd5db fix(overlay): fit tied victory podium text`; đã push nhánh `codex2/c-0339-throne-ui-v2` thành công.

Xác minh:
- `corepack pnpm exec playwright test tests/e2e/c0339-throne-ui.spec.ts` (asset thật): 3 passed.
- `$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; $env:QUIZ_E2E_TEMP_DIR='.tmp-test/c0339-placeholder'; corepack pnpm exec playwright test tests/e2e/c0339-throne-ui.spec.ts` (placeholder): 3 passed.
- `corepack pnpm typecheck`: exit 0.
- `corepack pnpm privacy:check`: PASS (1361 tệp đã theo dõi).

Ảnh cục bộ:
- Asset thật — đồng hạng: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0339-throne-ui-v2\test-results\c0339-review\actual\throne-tie-victory-1080x1920.png`
- Asset thật — Victory thường: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0339-throne-ui-v2\test-results\c0339-review\actual\victory-1080x1920.png`
- Placeholder — đồng hạng: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0339-throne-ui-v2\test-results\c0339-review\placeholder\throne-tie-victory-1080x1920.png`
- Placeholder — Victory thường: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0339-throne-ui-v2\test-results\c0339-review\placeholder\victory-1080x1920.png`
