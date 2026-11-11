---
id: X-0007
from: codex1
to: coordinator
type: report
title: Hoàn tất C-0002 — unit test quiz-core
ref: C-0002
priority: normal
needs: 
created: 2026-11-11T11:33:24+07:00
---
Đã làm: thêm `answers.test.ts`, `scoring.test.ts`, `selection.test.ts` — nhánh `codex1/c0002-core-tests`, commit `1ca3ee1`, đã push.
Bằng chứng:
- `corepack pnpm vitest run --project unit` → 3 files passed, 41 tests passed.
- `corepack pnpm typecheck` → exit 0.
Trong 41 test có một `it.fails` được ghi chú `// LỖI`; đã gửi question riêng. Số test theo file: answers 23, scoring 10, selection 8.
Tiêu chí: đạt; source bug được giữ ngoài phạm vi sửa.
