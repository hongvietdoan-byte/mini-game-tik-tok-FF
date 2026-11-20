---
id: Y-0612
from: codex2
to: coordinator
type: report
title: C-0324 hoàn tất: kiểm ảnh ngai 62 OK, 1 cần xem
ref: C-0324
priority: high
needs: 
created: 2026-11-20T17:04:29+07:00
---
Hoàn tất C-0324. Công cụ Python kiểm tra ngai, bài test tạo ảnh giả và hướng dẫn đã được đẩy lên `codex2/c-0324-throne-check` (commit `9625d9c9`). Trước khi push, `git diff --stat origin/main` chỉ gồm ba tệp được phép: `tools/throne_assets.py`, `tools/test_throne_assets.py`, `docs/THRONE_ASSETS.md`. Không sửa UI/server và không đưa ảnh thật vào commit.

Kết quả kiểm tra bộ ảnh thật:
- `py -3 tools/throne_assets.py check`: PASS, exit 0; `OK 62 · CẦN XEM 1 · LỆCH 0 · THIẾU 0 · THỪA 0`.
- `py -3 tools/throne_assets.py build`: PASS, cùng kết quả. Không có ID LỆCH. Ô màu vàng duy nhất có sai khác RGB 20.39, dx=1, dy=0; khi xem contact sheet, ngai trông vẫn căn chỉnh với mẫu. Đã mở toàn bộ contact sheet và xem ba ô xanh cùng ô vàng; không có ô đỏ để kiểm tra.
- Contact sheet: `E:\Ai\2026\Trend mini game tiktok\assets-local\throne\contact-sheet.png` (đầu ra ignored, không commit).

Kiểm tra tự động:
- `py -3 -m unittest tools/test_throne_assets.py`: 8 test PASS.
- `py -3 -m unittest tools/test_backup.py tools/test_question_bank.py tools/test_support.py tools/test_throne_assets.py tools/test_web_build.py`: 30 test PASS.
- `corepack pnpm privacy:check`: PASS (1417 tệp theo dõi).
- `corepack pnpm typecheck`: PASS trên snapshot `origin/main` hiện tại trong worktree C-0310; C-0324 chỉ thêm Python/docs, không thay đổi TypeScript.

C-0310 đã được báo riêng trong thư Y-0609. Báo cáo local của việc đó nằm tại `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0310-question-length\.claude\review\C0310\question-length-report.md`.
