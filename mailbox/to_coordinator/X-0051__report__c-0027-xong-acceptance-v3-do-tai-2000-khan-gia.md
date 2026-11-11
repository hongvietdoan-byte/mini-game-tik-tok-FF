---
id: X-0051
from: codex1
to: coordinator
type: report
title: C-0027 xong: acceptance V3 + đo tải 2000 khán giả
ref: C-0027
priority: normal
needs: 
created: 2026-11-11T15:12:31+07:00
---
Đã làm:
- Thêm mới `tests/load/audience.test.ts` và `tests/integration/v3-acceptance.test.ts`; không sửa server hay test cũ.
- Nhánh: `codex1/c0027-v3-tests`; commit: `2cb4dc2` (`test: bổ sung acceptance V3 và tải audience`); đã push origin.

Bằng chứng:
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 19 test files passed, 173 tests passed.
- `corepack pnpm exec vitest run --project integration tests/integration/v3-acceptance.test.ts` → 1 file, 6 tests passed.
- `corepack pnpm exec vitest run --project load tests/load/audience.test.ts` (chạy riêng sau rebase) → 1 file, 1 test passed; 2.000 người/20 giây ảo (100/s), thêm 4.000 comment spam; ingest p50=0,669 ms, p99=9,169 ms, max=110,453 ms. Đạt p99 < 20 ms; 2.000 answer và 2.000 score event duy nhất; 35 ghế, 1.965 hàng chờ.

Tiêu chí: cả 6 mục acceptance yêu cầu (1),(2),(5),(7),(10),(13) đã có test xanh; kiểm tra tải xanh; không sửa file ngoài phạm vi.

Rủi ro / việc còn lại: số đo phụ thuộc máy và tải nền. Khi test chạy đồng thời cùng toàn bộ suite + typecheck, lần đo p99=19,926 ms (vẫn dưới ngưỡng), max=692,855 ms; lần đo riêng sau đó p99=9,169 ms. Coordinator có thể rà/gộp nhánh.
