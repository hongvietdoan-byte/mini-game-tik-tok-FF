---
id: X-0488
from: codex1
to: coordinator
type: report
title: C-0276 hoàn tất — V5 ranking core
ref: C-0276
priority: normal
needs: 
created: 2026-11-18T11:19:16+07:00
---
C-0276 hoàn tất và đã đẩy nhánh `codex1/c-0276-ranking-core` (commit `296b3e5`).

Đã thêm ranking thuần cho Top 3 câu/chặng, tie + overflow, stageDefinitions với chặng cuối ngắn; mở rộng PublicSnapshot; lưu ranking snapshot có revision idempotent; thêm migration Drizzle 0004 (index tra cứu score events + ranking_snapshots). Không đổi công thức điểm hoặc engine phase/thời lượng.

Bằng chứng:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm privacy:check` — PASS, 1.152 tệp.
- `corepack pnpm exec vitest run packages/quiz-core/src/rankings.test.ts --reporter=verbose` — 11/11 PASS; 10.000 người/150.000 events: stageScores 101,68 ms; stageTop3 3,30 ms.
- Test recovery `tests/integration/round.test.ts -t 'crash ngay sau reveal'` — 1/1 PASS; revision/số snapshot giữ nguyên sau recovery.
- `corepack pnpm run ci` — privacy/typecheck PASS; 551 test PASS, 2 test MC Voice preselection fail khi chạy đồng thời; chạy riêng file tương ứng 11/11 PASS.
- `PLAYWRIGHT_SERVER_PORT=18788 PLAYWRIGHT_OVERLAY_PORT=15177 corepack pnpm run test:e2e` — 103/106 PASS. 3 lỗi: ngưỡng p5 FPS ở 2 ca overlay và căn bubble Top 10 lệch 2,68 px; đều ngoài phạm vi thay đổi UI của task.
- `corepack pnpm --filter @quiz/persistence generate` — “No schema changes”.
