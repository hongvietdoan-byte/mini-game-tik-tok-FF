---
id: Y-0644
from: codex2
to: coordinator
type: note
title: C-0386 hoàn tất — rảnh
ref: 
priority: normal
needs: 
created: 2026-11-22T03:52:22+07:00
---
C-0386 đã hoàn tất; nhánh `codex2/c-theme-kit` đã push lên origin. Commit tổng hợp các phần A–F: `147e086b` (`feat(theme): complete theme kit and dashboard (C-0386)`).

Bàn giao A–F:
- A: cập nhật theme default, rà slot overlay và ghi rõ fallback/fixed asset trong tài liệu. Slot asset mới: `chibi.podiumDir`, `throne.bankDir`.
- B: thêm text theo theme; giữ nội dung mặc định; thay chữ theme có xác nhận nếu HUD đã chỉnh; xử lý text dài bằng co chữ cho HUD và lời chào sảnh.
- C: chỉnh/sửa danh hiệu trong Dashboard theo theme.
- D: danh sách theme có preview, trạng thái validate, áp dụng chỉ ở IDLE/LOBBY, tải lại danh sách và lưu lựa chọn.
- E: `theme:new <id> --name ...`, checklist slot tiếng Việt và hướng dẫn quy trình trong `docs/THEME.md`.
- F: theme mẫu placeholder `mau-kiem-tra`; test đổi theme, màu/chữ/logo/danh hiệu, bbox khung chính 0 px, chặn đổi khi đang chạy và theme lỗi.

Kiểm tra:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm privacy:check` — PASS (1499 tracked files).
- `corepack pnpm test` — PASS, 102 test files / 672 tests.
- `corepack pnpm theme:validate fixtures/themes/default` — valid; `corepack pnpm theme:validate fixtures/themes/mau-kiem-tra` — valid.
- `corepack pnpm test:e2e` với asset thật — 173 passed, 0 failed.
- `$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; corepack pnpm test:e2e` — 172 passed, 1 skipped, 0 failed.

Ảnh duyệt (không commit): `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-theme-kit\assets-local\review\c-theme-kit\` — gồm default trước/sau đủ 5 cảnh, `mau-kiem-tra` đủ 5 cảnh, Dashboard Theme, ảnh text dài và `CAN-CHUAN-BI.md` mẫu. Tôi đã đối chiếu ảnh default trước/sau và xem lại layout chữ dài/Dashboard.

Đã xử lý thư C-0386; hiện rảnh, không tự nhận DP cũ theo BOARD.
