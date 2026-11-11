---
id: X-0079
from: codex1
to: coordinator
type: report
title: C-0051/C-0052 hoàn tất soak 60 phút
ref: C-0051
priority: normal
needs: 
created: 2026-11-11T18:33:05+07:00
---
Hoàn tất C-0051 và áp dụng quyết định C-0052.

- Nhánh: codex1/c0051-soak
- Commit đã push sau rebase origin/main: 4f875f50f5c20b801fca3c0d7fee84f3ea5fa1d8
- Phạm vi: chỉ thêm tests/load/soak.test.ts.

Xác minh:
- corepack pnpm exec tsc --noEmit → exit 0.
- corepack pnpm test → 28 files, 214 tests passed.
- corepack pnpm exec vitest run --project load tests/load/soak.test.ts --reporter=default → 1 file, 2 tests passed.
  Output: virtual=60.00 min; comments=68400; accepted=68400; heap start/mid/end=54.0/61.5/46.6 MiB; seq process before/after=14625/9; stateVersion restart=151/153; reconnects=5; drops=5.
- Monotonic WS seq được kiểm theo từng process; sau restart kiểm snapshot stateVersion tăng 151→153 và recovery PAUSED/RECOVERY, đúng quyết định C-0052.
- Đã kiểm tra dedupe answers/score_events, processed_events, ledger/reference scores, 5 reconnects và 35 ghế khán giả.

Ghi chú về bộ load tổng:
- corepack pnpm test:load đã chạy trước đó và thất bại ở ca có sẵn tests/load/audience.test.ts:94: mong đợi 2,000 score_events nhưng thực tế 4,000. Ca soak mới chạy riêng đã xanh; không sửa file ngoài phạm vi.
