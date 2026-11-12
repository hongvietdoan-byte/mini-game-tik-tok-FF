---
id: C-0092
from: coordinator
to: codex1
type: task
title: C-0092 ĐỔI ƯU TIÊN theo V4: dừng giọng MC, làm P0 (preflight, backup + đường chạy, rehearsal)
ref: 
priority: high
needs: 
created: 2026-11-12T00:11:32+07:00
---
ĐỔI ƯU TIÊN (người dùng chốt 12/11 theo plan V4 — `docs/STORM_ARENA_MASTER_DIRECTION_ACTION_PLAN_V4.txt`, quyết định D-19..D-22 trong `docs/DECISIONS.md`): **DỪNG giọng MC sau mốc 2**. Mốc 3 đang dở: commit WIP lên nhánh riêng, push, ghi 3 dòng trạng thái trong report, KHÔNG gộp. Tính điểm GIỮ Kahoot (không đổi engine).

Làm P0 theo thứ tự, mỗi mục một nhánh + một report riêng có tiêu chí đo được:

**P0-A · Preflight trước khi Start (V4 P0.2, P1.2 mức tối thiểu)** — `apps/server/**` + test.
- API `GET /api/preflight` (admin) trả danh sách kiểm với PASS/FAIL/WARN + lý do: đủ ≥ `questionsPerRound` câu APPROVED + không DEMO cho mode hiện tại và không lặp trong phiên; DB ghi được; thư mục asset có các file bắt buộc (logo, `victory/trophy-stage.png`, `victory/bg.jpg`, ≥ 1 chibi, MC); overlay đã ACK; nguồn comment (MOCK/TIKTOK) ở trạng thái nào; bản build overlay/dashboard có cũ hơn mã nguồn không (so mtime `dist/` với commit HEAD).
- START_ROUND ở mode TIKTOK bị từ chối khi preflight có FAIL (mã lỗi rõ); MOCK chỉ cảnh báo. Không tự bật DEMO.
- DoD: unit + integration cho từng nhánh FAIL; typecheck/test/privacy xanh.

**P0-B · Sao lưu + một đường chạy (V4 P0.4, P1.2)** — `tools/**`, `CHAY_GAME.cmd`, `docs/HUONG_DAN_LIVE.md`.
- `tools/backup.py`: chép `data/quiz.db` (dùng API backup của SQLite, an toàn khi WAL đang mở) + `assets-local/` (bỏ `_backup/`, `review/`) vào `backups/<yyyymmdd-hhmmss>/` kèm `manifest.json` (đường dẫn, kích thước, SHA-256); lệnh `verify` so lại checksum; lệnh `restore --from <thư mục>` có xác nhận. `backups/` thêm vào `.gitignore`.
- `CHAY_GAME.cmd`: LUÔN build lại web khi `dist/` cũ hơn HEAD hoặc thiếu; in ra commit đang chạy + đường dẫn DB; chạy backup trước khi mở server.
- `HUONG_DAN_LIVE.md`: chốt source-run bằng `CHAY_GAME.cmd` là đường chạy cho 12–14/11 (bộ cài NSIS = DEFERRED, ghi rõ); thêm mục dự phòng khi connector TikTok hỏng giữa buổi (tạm dừng → huỷ câu → chạy tiếp/đổi MOCK phải công bố là MOCK).
- DoD: chạy thật trên máy này: backup → verify PASS → restore vào thư mục tạm và mở DB đọc được số câu; dán output vào report.

**P0-C · C-0085 phần không đụng e2e của Codex 2**: `QUIZ_ASSETS_DIR` + bộ asset giữ chỗ. Phần test nội dung dài nhất + e2e trên CI vẫn chờ thư báo gộp C-0080.

**P0-D · Kịch bản tổng duyệt Mock (V4 P0.5)** — script `tools/rehearsal` chạy 6 vòng × 15 câu liên tiếp trên server thật mode MOCK với 500 và 2.000 người giả, có: người vào giữa vòng, spam 100 comment, A rồi B, comment đúng deadline, comment trễ của câu trước, pause/resume, restart giữa câu. Xuất biên bản Markdown `docs/reports/REHEARSAL_<ngày>.md`: từng gate PASS/FAIL, số liệu, lỗi P0/P1 còn mở. Chỉ được ghi `MOCK_REHEARSAL_PASSED`, không ghi LIVE.

Không sửa `apps/overlay/**`, `apps/dashboard/**`. Hỏi lại nếu mục nào đụng file ngoài làn.
