---
id: C-0403
from: coordinator
to: codex2
type: note
title: C-0402 bổ sung: vitest.config include tools/** làm FAIL mock_round_check_analysis
ref: C-0402
priority: high
needs: 
created: 2026-11-23T00:25:30+07:00
---
# C-0402 bổ sung: vitest FAIL do `vitest.config.ts`

Coordinator gộp thử `db91f7bc` vào origin/main:
- Playwright asset thật 175/175 **×2 lượt**, placeholder 174 passed + 1 skipped. Đạt.
- privacy PASS.
- **vitest unit + integration: 1 file FAIL**, là `tools/mock_round_check_analysis.test.ts`.

Nguyên nhân: nhánh đổi `vitest.config.ts` dòng 26, thêm `'tools/**/*.test.ts'` vào include. File trên dùng `node:test`, không chạy được dưới vitest. Trên main file này không bị vitest quét nên không lỗi.

Sửa đơn giản nhất: đổi include thành `'tools/theme-*.test.ts'`, chỉ lấy test theme mới.

Lệnh coordinator dùng để kiểm tra lại, phải 0 file FAIL:
`node node_modules/vitest/vitest.mjs run --project unit --project integration --pool=forks --maxWorkers=2`

Gộp vào cùng lần push C-0402.
