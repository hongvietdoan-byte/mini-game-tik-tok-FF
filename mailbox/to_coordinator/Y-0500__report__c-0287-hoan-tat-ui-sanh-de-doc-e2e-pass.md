---
id: Y-0500
from: codex2
to: coordinator
type: report
title: C-0287 hoàn tất — UI sảnh dễ đọc, E2E PASS
ref: C-0287
priority: normal
needs: 
created: 2026-11-18T17:25:38+07:00
---
C-0287 hoàn tất trong worktree riêng.

Nhánh: codex2/c-0287-lobby-seat-ui
Commit: 4fa859c9 — C-0287: improve lobby seat and countdown readability

Đã chỉnh UI sảnh:
- Giữ nguyên khung sảnh và thẻ giữa: board [416,345,567,470], question [18,145,527,160].
- Tiêu đề SẮP BẮT ĐẦU 24px; số ghế màu vàng 68px, nhãn GHẾ ĐÃ CÓ CHỦ 22px, các dòng cách nhau 12px.
- Lời nhắc Comment FREE FIRE để giành ghế! 30px, FREE FIRE màu vàng.
- Khi đủ 35 ghế không đếm ngược hiện ĐÃ ĐỦ GHẾ!; khi đếm ngược hiện VÀO TRẬN SAU và số 96px. Seat count luôn giữ ở thẻ; khi snapshot không còn countdown UI trở về nhánh không đếm ngược.
- Test layout kiểm tra khung cố định, khoảng cách, cỡ chữ tối thiểu, các dòng nằm trong vùng hiển thị; thêm mock và ảnh 10/3 giây.

Ảnh nghiệm thu 1080×1920 (được giữ trong worktree, không commit):
- E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0287-lobby-seat-ui\.claude\review\C0287\c0287-lobby-0.png
- E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0287-lobby-seat-ui\.claude\review\C0287\c0287-lobby-12.png
- E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0287-lobby-seat-ui\.claude\review\C0287\c0287-lobby-35-full.png
- E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0287-lobby-seat-ui\.claude\review\C0287\c0287-lobby-35-countdown-10.png
- E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0287-lobby-seat-ui\.claude\review\C0287\c0287-lobby-35-countdown-3.png

Kiểm tra:
- `corepack pnpm typecheck` → PASS.
- `corepack pnpm test` → 87 test files, 579 tests PASS (63.58s).
- `$env:PLAYWRIGHT_SERVER_PORT='18827'; $env:PLAYWRIGHT_OVERLAY_PORT='15287'; $env:QUIZ_E2E_TEMP_DIR='.tmp-test-c0287-review'; corepack pnpm exec playwright test --workers=1 --timeout=60000` → 111 E2E PASS (6.7m), gồm test C-0287.
- `corepack pnpm privacy:check` → PASS (1181 tệp đã theo dõi).
- `git diff --check` → PASS.
- Đã dọn thư mục `.tmp-test-c0287-review`.

Đã đẩy nhánh thành công lên origin; không đẩy main.
