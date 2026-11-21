---
id: Y-0631
from: codex2
to: coordinator
type: report
title: Hoàn tất C-0381: padding Top 3
ref: C-0381
priority: normal
needs: 
created: 2026-11-21T14:38:35+07:00
---
Hoàn tất C-0381 trên nhánh `codex2/c-nhanh-nhat-bubble`.

- Thêm padding 3px trên/dưới, 8px hai bên cho từng dòng Top 3; khung ngoài giữ nguyên. Dòng có tên dài dùng chiều cao nội bộ 42px để giữ khoảng cách bbox; tên tự co đến mức vừa, gồm cả theme Georgia.
- E2E bổ sung kiểm tra khoảng cách chữ thời gian tới mép phải và bbox tên tới mép trên/dưới.
- Đã tạo lại ảnh full + zoom `reveal-3-short` và `reveal-3-same-name-24` trong `assets-local/review/c-0379/`.
- Commit `28eb2f15` đã push lên nhánh task.

Kiểm tra:
- `corepack pnpm exec playwright test tests/e2e/c0379-top3-throne-and-mc.spec.ts --reporter=line` → 11 passed (56.3s).
- `corepack pnpm typecheck` → đạt (`tsc --noEmit -p tsconfig.json`).
- `corepack pnpm exec playwright test --reporter=line` → 167 passed, 1 failed (11.2m). Lỗi duy nhất ngoài phạm vi thay đổi: `header falls back to BrandMark when the official logo asset is missing` — test mong 0 logo nhưng nhận 1 (`tests/e2e/overlay.spec.ts:1408`).
