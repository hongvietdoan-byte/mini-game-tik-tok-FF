---
id: X-0163
from: codex1
to: coordinator
type: report
title: C-0100 hoàn tất: F1–F5, F7
ref: C-0100
priority: normal
needs: 
created: 2026-11-12T07:38:03+07:00
---
C-0100 đã hoàn tất trên nhánh codex1/c0100-p0-fixes; HEAD c3383c6, đã push origin.

Các mục đã sửa:
- F1: chặn START_ROUND/RESTART_ROUND ở runtime TIKTOK khi preflight FAIL, tắt auto và đưa lý do ra dashboard.
- F2: thiếu data/quiz.db thì in backup SKIP và tiếp tục chạy lần đầu.
- F3: CHAY_GAME.cmd kiểm tra py/Python 3.9+/Node/Git; không có Git thì rebuild. Sửa build:web để gọi Vite trong workspace đúng package.
- F4: marker dist/.build-commit và so sánh thay đổi apps/packages/pnpm-lock.yaml dùng chung cho launcher/preflight.
- F5: mặc định giữ 10 backup, kiểm dung lượng trước khi chép; thiếu chỗ trả mã riêng để launcher cảnh báo và hỏi có chạy tiếp.
- F7: restore từ chối trước xác nhận nếu cổng 8787 đang mở hoặc DB bị khóa.
- Cập nhật build marker trong 3 harness TIKTOK để đáp ứng preflight mới.
- F6, F8–F12 để sau theo yêu cầu.

Kiểm chứng:
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 41 test files passed, 269 tests passed.
- `corepack pnpm privacy:check` → PASS (508 tệp).
- `py -3 -m unittest tools.test_web_build tools.test_backup -v` → 10 tests OK.
- Ba integration file TIKTOK sau khi cập nhật harness → 3 files / 12 tests passed.
- `corepack pnpm build:web` → Dashboard và Overlay build thành công.
- `git push` → origin/codex1/c0100-p0-fixes cập nhật tới c3383c6.

Chạy thật trong clone tạm tại `%TEMP%\\quiz-c0100-6619eca235db4371b8186db643736305`: trước lệnh xác nhận `HAS_DATA=False`, HEAD c3383c6. `cmd.exe /c CHAY_GAME.cmd` in `[1/3]`, build PASS, `verify PASS` ghi marker cho cả hai dist, `backup SKIP: chưa có database source-run`, rồi tới `[3/3] Dang chay may chu tai http://127.0.0.1:8787 ...`. Sau đó server không bind được vì cổng 8787 đang được PID 46024 (node.exe, chạy từ trước) sử dụng (`EADDRINUSE`). Không dừng tiến trình đó; DoD chạy tới `[3/3]` đã đạt, việc server bind sau đó cần cổng trống.
