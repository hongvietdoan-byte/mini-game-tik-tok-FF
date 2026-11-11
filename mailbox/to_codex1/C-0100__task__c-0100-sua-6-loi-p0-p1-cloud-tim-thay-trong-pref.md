---
id: C-0100
from: coordinator
to: codex1
type: task
title: C-0100 Sửa 6 lỗi P0/P1 cloud tìm thấy trong preflight, backup, CHAY_GAME.cmd
ref: C-0092
priority: high
needs: 
created: 2026-11-12T06:56:20+07:00
---
Cloud rà code P0 đã gộp, chi tiết ở `docs/review/RA_SOAT_P0.md` (F1–F12, đã gộp main). Sửa theo thứ tự, một nhánh `codex1/c0100-p0-fixes`, mỗi mục một commit + test, report một lần:

1. **F1 (P0) — Auto mode và RESTART_ROUND bỏ qua preflight.** Cổng chỉ ở route HTTP; `systemCommand({type:'START_ROUND'})` trong runtime đi thẳng `dispatch()`. Làm một hàm kiểm chung cho mọi đường vào START_ROUND/RESTART_ROUND ở mode TIKTOK; FAIL thì tắt auto, đưa lý do ra state cho dashboard. Test: phiên TIKTOK + auto + preflight FAIL → không sang vòng mới.
2. **F2 (P0) — Máy chưa có `data/quiz.db` thì `CHAY_GAME.cmd` không bao giờ mở được server** (backup FAIL vì chưa có DB). Chưa có DB → bỏ qua backup DB, in rõ, vẫn chạy.
3. **F3 (P0) — Thiếu `py`/`git` hoặc Python < 3.9 báo sai nguyên nhân.** Kiểm `where py`, `where git`, phiên bản Python ở đầu `CHAY_GAME.cmd` với thông báo đúng; không có git thì luôn build lại; bỏ phụ thuộc `Path.is_relative_to` hoặc chặn phiên bản rõ ràng.
4. **F4 (P1) — "dist còn mới" so bằng giờ commit là sai hai chiều.** Ghi `dist/.build-commit` khi build; coi là cũ khi `git diff --quiet <hash> HEAD -- apps packages pnpm-lock.yaml` khác rỗng. Dùng chung cho `web_build.py` và preflight.
5. **F5 (P1) — Backup mỗi lần khởi động không dọn bản cũ.** Giữ N bản gần nhất (mặc định 10), kiểm dung lượng trống trước khi chép; backup FAIL vì đầy ổ thì cảnh báo to nhưng hỏi có chạy tiếp không thay vì chặn hẳn.
6. **F7 (P1) — restore khi server đang chạy.** Từ chối restore nếu cổng 8787 đang mở hoặc DB đang bị khoá; thông báo rõ.

F6, F8–F12: ghi vào report là để sau, không làm. DoD: typecheck + test + privacy xanh trên cây đã commit; chạy thật `CHAY_GAME.cmd` tới dòng "[3/3]" trên một bản clone tạm KHÔNG có `data/` và dán output.
