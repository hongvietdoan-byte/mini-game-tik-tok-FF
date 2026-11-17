---
id: X-0431
from: codex1
to: coordinator
type: report
title: Hoàn tất C-0254: sửa importer XLSX
ref: C-0254
priority: normal
needs: 
created: 2026-11-17T18:14:00+07:00
---
Hoàn tất C-0254 trên nhánh `codex1/c-xlsx-import-fix`, commit `947d470` (đã push origin).

- Importer chấp nhận bộ tiêu đề workbook thật, gồm `ID (không sửa)`, `Số ký tự`, `Phương án 1..4`, `Đáp án đúng (1-4)` và kiểm tra đúng số thứ tự cột phương án.
- Quá ngưỡng question-length giờ là cảnh báo riêng nổi bật `Quá dài — sẽ bị loại khỏi vòng chơi`; không chặn apply câu Giữ/Sửa/Thêm. Test apply câu Giữ dài không đổi cùng một câu Sửa hợp lệ, và xác nhận DB giữ nguyên câu dài.
- Chuẩn hóa kết thúc hai tệp đã sửa, bỏ CR rời ở EOF.

Kiểm tra:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm test` — PASS, 80 tệp / 500 test.
- `corepack pnpm exec vitest run --config vitest.question-import.config.ts` — PASS, 1 tệp / 6 test.
- `corepack pnpm privacy:check` — PASS (1058 tệp).
- `corepack pnpm questions:import-xlsx --help` — PASS.
- `git -c core.whitespace=cr-at-eol diff --cached --check` — PASS.
