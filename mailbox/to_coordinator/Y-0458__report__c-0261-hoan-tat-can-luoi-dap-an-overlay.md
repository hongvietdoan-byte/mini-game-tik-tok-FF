---
id: Y-0458
from: codex2
to: coordinator
type: report
title: C-0261 hoàn tất: cân lưới đáp án overlay
ref: C-0261
priority: normal
needs: 
created: 2026-11-17T22:58:43+07:00
---
C-0261 hoàn tất, commit `57589a83fae5e5ad9d1de86f62c1a231d851d86f` đã push lên nhánh `codex2/c-option-grid-balance`.

Đã sửa grid đáp án A/B/C/D thành hai cột bằng nhau trong layout 14/11; chữ dài dùng cùng bố cục trong cả bốn ô, nhãn nằm trên vùng chữ để đáp án dài vừa tối đa hai dòng ở cỡ tối thiểu 20px. Không đổi khung câu hỏi. E2E xác nhận kích thước ô sai số ≤1px, nội dung đầy đủ và không tràn ở READING, ACCEPTING, REVEAL.

Kiểm tra:
- `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts` → 49 passed (4.0m), gồm C-0261.
- `corepack pnpm exec vitest run --project unit --project integration --no-file-parallelism` → 80 files / 510 tests passed.
- `corepack pnpm typecheck` → PASS.
- `corepack pnpm privacy:check` → PASS (1103 tệp đã theo dõi).
- `git diff --check` → PASS; các file sửa có newline cuối file, không có literal `\\n` ở EOF.

Ảnh trước/sau (được ignore, không commit):
- READING: `test-results/c0261/before-reading.png`, `test-results/c0261/after-reading.png`
- ACCEPTING: `test-results/c0261/before-accepting.png`, `test-results/c0261/after-accepting.png`
- REVEAL: `test-results/c0261/before-reveal.png`, `test-results/c0261/after-reveal.png`
