---
id: C-0099
from: coordinator
to: cloud
type: task
title: C-0099 Rà code P0 vừa gộp + cập nhật ma trận V4 và TIEN_DO
ref: 
priority: normal
needs: 
created: 2026-11-12T06:48:13+07:00
---
Việc mới cho cloud (chỉ đọc + viết tài liệu, trên nhánh cloud, lấy main mới nhất trước):

**1. Rà code P0 vừa gộp main** (từ `397157f` đến HEAD): preflight (`apps/server/src/app.ts`, `tests/integration/preflight.test.ts`), sao lưu + đường chạy (`tools/backup.py`, `tools/backup_db.ts`, `tools/web_build.py`, `CHAY_GAME.cmd`), tổng duyệt Mock (`tools/rehearsal.ts`), event ID bộ giả lập (`packages/live-adapters/src/simulator.ts`), luật ảnh giữ chỗ (`scripts/privacy-check.mjs`). Tìm lỗi thật có thể làm hỏng buổi LIVE: preflight chặn nhầm/bỏ sót (ví dụ so mtime `dist/` với thời điểm commit có báo FAIL sai sau `git pull` chỉ đổi tài liệu không?), khôi phục ghi đè DB đang mở, `CHAY_GAME.cmd` dừng giữa chừng khi thiếu `py`/`git`, backup phình ổ đĩa vì chạy mỗi lần khởi động mà không dọn bản cũ. Mỗi phát hiện: file:dòng, kịch bản tái hiện, mức P0/P1/P2, đề xuất sửa. Viết vào `docs/review/RA_SOAT_P0.md`. Không sửa code.

**2. Cập nhật `docs/IMPLEMENTATION_GAP_MATRIX_V4.md`** theo trạng thái mới (preflight, backup, đường chạy, rehearsal đã gộp; chạy lại typecheck + test và ghi số). Vẫn không ghi VISUAL_APPROVED/LIVE_VERIFIED; nhánh giao diện `codex2/c0068-victory-ref` chưa gộp, chờ người dùng duyệt.

**3. Viết lại `docs/TIEN_DO.md`** cho khớp thực tế 12/11 (bảng mốc + việc đang chờ người dùng), ngắn gọn, dùng từ vựng trạng thái của V4.

Report kèm 5 phát hiện nặng nhất ở đầu thư.
