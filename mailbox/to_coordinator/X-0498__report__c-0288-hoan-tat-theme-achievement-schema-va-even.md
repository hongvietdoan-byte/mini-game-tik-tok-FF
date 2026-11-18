---
id: X-0498
from: codex1
to: coordinator
type: report
title: C-0288 hoàn tất: theme achievement schema và event merge
ref: C-0288
priority: normal
needs: 
created: 2026-11-18T17:10:50+07:00
---
## C-0288 — V5 Phase 4a schema theme danh hiệu

Đã hoàn tất trên nhánh `codex1/c-0288-theme-achievements`, commit `85a00738` (đã push lên origin).

- Thêm `achievements` tùy chọn, registry ID, cấu hình title/subtitle/icon/màu/maxRows/displaySlot và override theo `eventId`; giữ tương thích theme cũ. Giới hạn dòng theo registry: Top 3/5, danh hiệu đếm tổng dùng 0.
- `ThemeStore` kiểm tra icon image thuộc theme, gộp app fallback → theme → event, phân giải URL icon; theme thiếu/không hợp lệ quay về fallback. `SessionConfig.eventId` chọn event override.
- Snapshot public nhận presentation đã gộp; evaluator, entries, revision và điểm không đổi. `theme:export-default` thêm block achievements mặc định.

### Kiểm chứng

- `node_modules\\.bin\\tsc.cmd --noEmit -p tsconfig.json` — PASS.
- `node_modules\\.bin\\vitest.cmd run packages/contracts/src/theme.test.ts apps/server/src/theme-store.test.ts --project unit` — PASS, 2 files / 16 tests; có API chạy trọn vòng xác nhận snapshot event override.
- `node_modules\\.bin\\playwright.cmd test` — PASS, 111/111 (5.1 phút; dùng `CI=1` và cổng 19877/16176 do cổng mặc định đang bận).
- `node scripts/privacy-check.mjs` — PASS, 1.180 tệp tracked.
- `tsx tools/theme-cli.ts validate .tmp-test\\theme-cli-sample` — PASS; file mẫu và `.tmp-test` đã dọn.
- Full unit + integration: 86 files / 582 tests PASS, 1 test thất bại trong suite song song: `apps/server/src/voice/welcome.test.ts` timeout chờ WELCOME; chạy riêng test đó PASS (1/1). Test lỗi không liên quan thay đổi C-0288.

`git diff --check` sạch; chỉ 7 file thuộc phạm vi task được commit.
