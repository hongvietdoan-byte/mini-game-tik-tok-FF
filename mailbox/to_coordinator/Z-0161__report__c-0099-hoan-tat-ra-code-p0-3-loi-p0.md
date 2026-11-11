---
id: Z-0161
outbox_id: Z-0007
from: cloud
to: coordinator
type: report
title: C-0099 hoàn tất rà code P0 (3 lỗi P0)
ref: C-0099
priority: normal
needs: 
created: 2026-11-11T23:55:24+00:00
---
C-0099 xong. Nhánh `claude/zen-dijkstra-sop0bt` @ `a25f6df`, chỉ tài liệu:
- `docs/review/RA_SOAT_P0.md` (F1–F12)
- `docs/IMPLEMENTATION_GAP_MATRIX_V4.md` (cập nhật)
- `docs/TIEN_DO.md` (viết lại)

**5 phát hiện nặng nhất:**
1. **P0 — Auto mode bỏ qua preflight.** Cổng chỉ nằm trong route HTTP (`apps/server/src/app.ts:530`). Auto start gọi `systemCommand({type:'START_ROUND'})` (`apps/server/src/runtime.ts:517`), đi thẳng `dispatch()`. Phiên TIKTOK + auto thì cả 6 vòng chạy mà không kiểm overlay/asset/DB/nguồn. `RESTART_ROUND` cũng bỏ qua. Đề xuất: hàm kiểm chung cho cả hai đường; FAIL thì tắt auto + báo lý do; thêm test.
2. **P0 — Máy chưa có `data/quiz.db` không bao giờ khởi động được** (đã tái hiện). `CHAY_GAME.cmd:30-33` backup trước khi mở server, mà `tools/backup.py:147-148` FAIL khi chưa có DB (DB chỉ được tạo khi server chạy). Đề xuất: chưa có DB thì bỏ qua backup.
3. **P0 — Thiếu `py`/`git` hoặc Python < 3.9 thì dừng hẳn, báo sai nguyên nhân.** Thiếu `py` → errorlevel 9009 → "không đọc được commit HEAD" (`CHAY_GAME.cmd:18-21`). Thiếu git → `web_build.py` trả 2 → dừng. `Path.is_relative_to` (`backup.py:50`) cần 3.9, gây AttributeError không được bắt. Đề xuất: `where py/git` + kiểm phiên bản ở đầu; không có git thì luôn build lại.
4. **P1 — Kiểm "dist còn mới" bằng giờ commit** (`web_build.py:43`, `app.ts:310`). Fast-forward một commit có giờ commit cũ hơn lần build trước → báo PASS sai → phát overlay cũ. Ngược lại, pull chỉ đổi docs cũng buộc build lại. Đề xuất: ghi `dist/.build-commit` + `git diff --quiet <hash> HEAD -- apps packages pnpm-lock.yaml`.
5. **P1 — Backup mỗi lần khởi động chép toàn bộ `assets-local/`, không dọn bản cũ** (`backup.py:143-176`). Ổ đầy → backup FAIL → server không mở. Đề xuất: giữ N bản, chỉ chép asset khi SHA đổi, kiểm dung lượng trống.

**Các phát hiện khác:**
- P1: preflight PASS chỉ vì `CONNECTED`, chưa thấy comment (F6).
- P1: restore không chặn khi server đang chạy; trên Linux ghi đè im lặng, trên Windows có thể bị file lock chặn (CHƯA KIỂM CHỨNG) (F7).
- P2: restore không xoá asset thừa và mở bản backup qua `Store` nên có thể migrate chính bản backup (F8).
- P2: ACK của tab xem thử cũng tính; FAIL tạm ngay sau mỗi lệnh (F9).
- P2: preflight asset chỉ kiểm tồn tại; ảnh giữ chỗ vẫn PASS (F10).
- P2: rehearsal là tổng duyệt mã nguồn, chưa phải P0.5 trên máy operator; ghi chú `it.fails` trong biên bản đã cũ (F11).
- P2: lặt vặt privacy-check/preflight (F12). Simulator runId: ổn.

**Số liệu @ `ff1d9f2`:** typecheck sạch; 268/268 test PASS (41 file); privacy-check PASS (500 tệp). Thử backup create → verify → restore → verify (cùng schema) PASS.

**Ma trận/TIEN_DO:** preflight, backup, source-run, rehearsal chuyển sang IMPLEMENTED/UNIT_VERIFIED kèm F1–F5. Nhánh `codex2/c0068-victory-ref` (Victory + C-0080 + C-0098) ghi chưa gộp, chờ người dùng duyệt. Không mục nào VISUAL_APPROVED/LIVE_VERIFIED. M18 = NO-GO.

Đề xuất giao: F1 cho làn server (coordinator); F2–F5, F7 cho codex1.
