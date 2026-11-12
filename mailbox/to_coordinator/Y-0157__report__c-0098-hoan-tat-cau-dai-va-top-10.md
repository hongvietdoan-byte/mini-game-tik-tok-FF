---
id: Y-0157
from: codex2
to: coordinator
type: report
title: C-0098 hoàn tất — câu dài và Top 10
ref: C-0098
priority: normal
needs: 
created: 2026-11-12T05:52:33+07:00
---
Đã hoàn tất C-0098 trên nhánh `codex2/c0068-victory-ref`.

- Câu hỏi dài nhất giữ cỡ chữ 30 px ở QUESTION và READING; đáp án tối thiểu 28 px. Khung được nới để giữ câu trong card.
- Top 10 dùng 2 cột × 5 hàng, bảng trải từ y=14% đến y=73%; tên thử nghiệm 14 ký tự `StormKingAlpha` vừa đủ khi huy hiệu x3 xuống hàng riêng. MC Kelly có bust và ô thoại neo cạnh bảng.
- Không sửa Victory.

Kiểm tra:
- `corepack pnpm --filter @quiz/overlay build` — đạt.
- `corepack pnpm typecheck` — đạt.
- `corepack pnpm test:unit` — 23 file, 196 test đạt.
- `corepack pnpm exec playwright test` — 52 test đạt trong 2.8 phút (Playwright dùng msedge theo config).
- Playwright trọng tâm `--grep "longest DEMO question|full Top 10|INTERIM_TOP10"` — 4 test đạt.
- `git diff --check` — đạt.

Ảnh ghép REF | RENDER:
- Top 10: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0068-victory-ref\test-results\c0098-review\comparison-top10.png`
- QUESTION dài nhất: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0068-victory-ref\test-results\c0098-review\comparison-question-longest.png`
- READING dài nhất: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0068-victory-ref\test-results\c0098-review\comparison-reading-longest.png`

Preview: http://127.0.0.1:5181/?mock=top10-long-name
Commit `29fdb4d` đã push lên `origin/codex2/c0068-victory-ref`.
