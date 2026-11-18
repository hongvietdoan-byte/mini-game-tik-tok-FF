---
id: X-0492
from: codex1
to: coordinator
type: report
title: C-0284 hoàn tất — evaluator danh hiệu Phase 2
ref: C-0284
priority: normal
needs: 
created: 2026-11-18T13:30:49+07:00
---
C-0284 hoàn tất; commit `49cc31cc` trên nhánh `codex1/c-0284-achievements` (đã push, worktree sạch).

Thay đổi: evaluator thuần cho LONGEST_STREAK, MOST_CORRECT, COMEBACK, PERFECT_STAGE, FULL_PARTICIPATION, FIRST_CORRECT; dùng lại dữ liệu Phase 1 cho FASTEST_CORRECT/STAGE_CHAMPION và dữ liệu Victory cho ROUND_CHAMPION. Thêm public contract optional, snapshot revision + khóa idempotent và migration additive 0005; runtime lưu ở checkpoint chặng/cuối vòng; thêm unit và integration MOCK 15 câu × 100 người/recovery. Không sửa UI.

Kiểm chứng:
- `corepack pnpm typecheck`: PASS.
- `corepack pnpm exec vitest run --project unit packages/quiz-core/src/achievements.test.ts packages/persistence/src/store.test.ts`: 2 file / 23 test PASS; benchmark evaluator 10k người / 150k events = 70.3 ms (<200 ms).
- `corepack pnpm exec vitest run --project integration tests/integration/achievements.test.ts`: 1 test PASS; đối chiếu độc lập MOCK 15×100, recovery giữ revision; `.tmp-test` trước/sau 329/329.
- `corepack pnpm privacy:check`: PASS (1165 tệp theo dõi).
- `corepack pnpm test`: 560/561 PASS; một test MC Voice auto mode thất bại dưới tải toàn suite (LOBBY thay vì PREPARE), nhưng chạy riêng test đó PASS (1 chạy, 10 bỏ qua).
- `corepack pnpm test:e2e` ban đầu bị cổng 18787 đang dùng; chạy lại bằng cổng 18788/15177: 108/109 PASS. Ca còn lại C-0224 hết timeout 30 giây khi chụp screenshot; chạy riêng vẫn timeout ở screenshot. Teardown đã dọn `.tmp-test` (hiện không tồn tại).

File đổi: `packages/quiz-core/src/achievements.ts`, `packages/quiz-core/src/achievements.test.ts`, `packages/quiz-core/src/index.ts`, `packages/contracts/src/index.ts`, `packages/persistence/src/schema.ts`, `packages/persistence/src/index.ts`, `packages/persistence/src/store.test.ts`, `packages/persistence/migrations/0005_lame_famine.sql`, `packages/persistence/migrations/meta/0005_snapshot.json`, `packages/persistence/migrations/meta/_journal.json`, `apps/server/src/runtime.ts`, `tests/integration/achievements.test.ts`.
