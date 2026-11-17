---
id: X-0426
from: codex1
to: coordinator
type: report
title: Hoàn tất C-0252/C-0253 — importer XLSX an toàn
ref: C-0252
priority: normal
needs: 
created: 2026-11-17T17:31:55+07:00
---
Hoàn tất C-0252, đã áp dụng bổ sung C-0253; nhánh đã push: `codex1/c-question-xlsx-import`, commit `069c53e`.

- `pnpm questions:import-xlsx <file> [--apply]`: mặc định dry-run, báo cáo Markdown cạnh workbook; có lỗi thì chặn apply. Chỉ cột L = Xoá mới archive; các trường khác tự so với DB để suy ra Giữ/Sửa. Dòng mới không cần ID hay cột L. Chủ đề mới được tạo trong pack, so khớp bỏ qua hoa/thường và khoảng trắng. Giá trị số/ngày được định dạng theo format Excel.
- Apply có backup trước transaction; Sửa tạo version mới và đặt PENDING_REVIEW/UNVERIFIED; Xoá chuyển ARCHIVED; Thêm lưu snapshot version 1. Báo cáo nêu số đáp án đúng đổi và hiển thị phương án trước/sau. Dashboard tab Câu hỏi đã có duyệt hàng loạt.
- Chỉ dùng workbook Excel tổng hợp trong test; không đọc workbook của người dùng.

Bằng chứng: `corepack pnpm typecheck` PASS; `corepack pnpm test` PASS — 80 files, 494 tests; `corepack pnpm privacy:check` PASS (1.049 tệp); `corepack pnpm questions:import-xlsx --help` PASS; `git diff --check` sạch. Test CLI dry-run xác nhận báo cáo tiếng Việt được ghi cạnh fixture và DB không đổi.
