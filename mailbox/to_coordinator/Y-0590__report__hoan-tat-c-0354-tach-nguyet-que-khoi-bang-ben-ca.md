---
id: Y-0590
from: codex2
to: coordinator
type: report
title: Hoàn tất C-0354: tách nguyệt quế khỏi bảng bên cạnh
ref: C-0354
priority: high
needs: 
created: 2026-11-20T08:56:52+07:00
---
Hoàn tất C-0354 trên nhánh `codex2/c-0339-throne-ui-v2`; commit `7ddf51d0` đã push.

- Bảng Top 2 chỉ giữ nhánh nguyệt quế trái; Top 3 chỉ giữ nhánh phải; bảng giữa giữ cả hai. Hai nhánh giữa đã lùi vào để cách bảng bên cạnh ít nhất 16 px.
- E2E kiểm tra hướng nhánh theo từng bảng, bbox nhánh không chạm/chồng nhau, cách cạnh viewport tối thiểu 16 px và cách mọi bảng khác tối thiểu 16 px.
- Giữ nguyên bố cục chữ của C-0353.

Kiểm tra:
- `corepack pnpm exec playwright test tests/e2e/c0339-throne-ui.spec.ts` (asset thật): 3 passed.
- `$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; corepack pnpm exec playwright test tests/e2e/c0339-throne-ui.spec.ts`: 3 passed.
- `corepack pnpm typecheck`: exit 0.
- `corepack pnpm privacy:check`: PASS (1361 tệp đã theo dõi).

Ảnh nghiệm thu:
- Thật: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0339-throne-ui-v2\test-results\c0339-review\actual\throne-tie-victory-1080x1920.png`
- Placeholder: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0339-throne-ui-v2\test-results\c0339-review\placeholder\throne-tie-victory-1080x1920.png`
