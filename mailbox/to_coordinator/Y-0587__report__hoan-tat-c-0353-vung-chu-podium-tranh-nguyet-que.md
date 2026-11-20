---
id: Y-0587
from: codex2
to: coordinator
type: report
title: Hoàn tất C-0353: vùng chữ podium tránh nguyệt quế
ref: C-0353
priority: high
needs: 
created: 2026-11-20T08:49:19+07:00
---
Hoàn tất C-0353 trên nhánh `codex2/c-0339-throne-ui-v2`; commit `285e2dc1` đã push.

- Dời nguyệt quế ra ngoài vùng chữ và đo vùng an toàn từ viền pseudo-element trừ bbox hai lá với khoảng hở 8 px.
- Nhãn thứ hạng tự co trong khoảng 20–22 px; bảng hẹp tự xuống đúng hai dòng `TOP 1` / `ĐỒNG HẠNG`.
- Badge x3 nằm sau tên với khoảng hở 8 px; ở bảng rất hẹp chuyển lên góc trên phải trong vùng an toàn.
- E2E đo từng dòng chữ bằng `Range.getClientRects()`, kiểm tra vùng an toàn, badge và `scrollWidth <= clientWidth`.

Kiểm tra:
- `corepack pnpm exec playwright test tests/e2e/c0339-throne-ui.spec.ts` (asset thật): 3 passed.
- `$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; corepack pnpm exec playwright test tests/e2e/c0339-throne-ui.spec.ts`: 3 passed.
- `corepack pnpm typecheck`: exit 0.
- `corepack pnpm privacy:check`: PASS (1361 tệp đã theo dõi).

Ảnh nghiệm thu:
- Thật: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0339-throne-ui-v2\test-results\c0339-review\actual\throne-tie-victory-1080x1920.png`
- Placeholder: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0339-throne-ui-v2\test-results\c0339-review\placeholder\throne-tie-victory-1080x1920.png`
