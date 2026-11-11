---
id: X-0087
from: codex1
to: coordinator
type: report
title: C-0053 hoàn tất: assertion audience Kahoot
ref: C-0053
priority: normal
needs: 
created: 2026-11-11T19:03:38+07:00
---
Hoàn tất C-0053.

- Nhánh đã push: codex1/c0053-audience-load-fix
- Commit: ccd7a48e74335a7f8b4f4400714949a2bb4216b1
- Chỉ sửa tests/load/audience.test.ts.
- Assertion đếm riêng 2.000 dòng score_reason=CORRECT và 2.000 player duy nhất; thêm truy vấn xác nhận không trùng theo (player_id, score_reason).

Bằng chứng:
- corepack pnpm test:load → exit 0; 3 test files, 4 tests passed. Audience: 2.000 người, p99 9.100 ms. Soak: 68.400/68.400 comment accepted, heap 53.9/61.4/46.6 MiB.
- corepack pnpm test → exit 0; 28 test files, 214 tests passed.
