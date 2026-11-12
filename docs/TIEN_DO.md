# Tiến độ dự án — Storm Arena LIVE Quiz

Cập nhật: **12/11/2026 sáng** (làn cloud viết lại theo C-0099, đối chiếu `main` @ `ff1d9f2`). Tài liệu điều phối: plan V4 (`docs/STORM_ARENA_MASTER_DIRECTION_ACTION_PLAN_V4.txt`, D-19..D-22). Chi tiết từng hạng mục: `docs/IMPLEMENTATION_GAP_MATRIX_V4.md`.

Mốc sự kiện: tổng duyệt 12/11, thi đấu 13–14/11.

**Trạng thái theo từ vựng V4:**
- `IMPLEMENTED`: có code.
- `UNIT_VERIFIED`: vitest unit/tích hợp PASS.
- `E2E_VERIFIED`: Playwright tái lập được.
- `VISUAL_APPROVED`: người dùng đã duyệt hình.
- `LIVE_VERIFIED`: đã có comment thật.
- `BLOCKED`, `DEFERRED`.

Hiện **chưa mục nào** đạt `VISUAL_APPROVED` hay `LIVE_VERIFIED`. E2E chỉ có báo cáo từ máy Windows, chưa tái lập ở nơi khác.

**Bằng chứng gần nhất @ `ff1d9f2`:** typecheck sạch · 268/268 test PASS · privacy-check PASS · tổng duyệt mã nguồn `MOCK_REHEARSAL_PASSED` (6 vòng × 15 câu, 500/2.000 người giả lập, `docs/reports/REHEARSAL_2026-11-12.md`).

## Bảng mốc

| # | Mốc | Trạng thái V4 | Còn thiếu / chặn |
|---|---|---|---|
| M0 | Engine, tính điểm Kahoot (D-21), server, khôi phục sau restart, chống chấm trùng | UNIT_VERIFIED | — |
| M1 | Đủ pha PREPARE → READING → ACCEPTING → REVEAL → LEADERBOARD; pause/huỷ câu; mất kết nối | UNIT_VERIFIED | — |
| M2 | Chọn câu: RANDOM có seed, không lặp trong phiên | UNIT_VERIFIED | SMART_RANDOM 7/5/3: chưa có, cần người dùng chốt (ma trận M3) |
| M3 | 35 ghế khán giả, nhân vật cố định mỗi người, tải 2.000 người | UNIT_VERIFIED | Xoay ghế đang ghim Top 3 theo điểm; V4 nói không ưu tiên điểm, cần người dùng chốt (M2) |
| M4 | Dashboard, Setup Wizard, Kiểm tra kết nối | IMPLEMENTED | E2E chưa tái lập ngoài Windows |
| M5 | Màn câu hỏi (Quiz) theo ref | IMPLEMENTED trên nhánh `codex2/c0068-victory-ref` (C-0080, C-0098) | **Người dùng duyệt ảnh ghép** rồi mới gộp |
| M6 | Victory: cúp + bục gốc, 3 nhân vật trên bục thấp (D07/D08) | IMPLEMENTED trên nhánh `c0068`; `main` vẫn là cúp SVG | **Người dùng duyệt**; kiểm logo phía trên (D08) |
| M7 | Top 10 sau mỗi câu, đồng hạng | UNIT_VERIFIED (logic); giao diện mới trên nhánh `c0068` | Duyệt hình |
| M8 | Kết nối TikTok (thư viện cộng đồng, chỉ đọc) | UNIT_VERIFIED (mock/replay) · **BLOCKED** cho LIVE | Người dùng phát một phiên LIVE được phép để thử comment thật |
| M9 | Bộ câu hỏi cho buổi thi | **BLOCKED (người dùng)** | 36 câu mới được duyệt để chạy thử (BOARD #20); cần duyệt nội dung + nguồn ≥ 15 câu |
| M10 | Preflight trước Start (TIKTOK) | UNIT_VERIFIED (đường HTTP) | Auto mode bỏ qua preflight (RA_SOAT_P0 F1, P0) |
| M11 | Backup DB + asset, restore | IMPLEMENTED | Máy chưa có DB không khởi động được (F2, P0); không dọn bản cũ (F5); restore khi server chạy (F7) |
| M12 | Đường chạy source-run `CHAY_GAME.cmd`, dữ liệu `<repo>\data` | IMPLEMENTED | Thiếu `py`/`git` thì dừng hẳn (F3, P0); kiểm bản build theo giờ commit (F4) |
| M13 | Tổng duyệt | Mã nguồn: UNIT_VERIFIED · trên máy operator: chưa làm | OBS/LIVE Studio + audio + điện thoại, có ảnh/video |
| M14 | CI + E2E | IMPLEMENTED một phần (CI chưa chạy Playwright) | C-0085 (codex1, đang xếp hàng) |
| M15 | Giọng MC Kelly, Voice Settings | DEFERRED (D-22: dừng sau mốc 2) | API thật; C-0079 hoãn |
| M16 | MC PNG Sequence | IMPLEMENTED, dùng ảnh tĩnh | Frame thật từ người dùng |
| M17 | Theme Pack runtime, AI Question Studio, analytics | DEFERRED_UNTIL_AFTER_EVENT | — |
| M18 | Sẵn sàng LIVE thật (V4 §15 GO) | **NO-GO** | Cần M5, M6, M8, M9 + sửa F1–F3 |

## Đang chờ người dùng

1. **Duyệt ≥ 15 câu + nguồn** cho buổi thi 13–14/11 (M9).
2. **Duyệt ảnh ghép** màn câu hỏi, Top 10, Victory trên nhánh `codex2/c0068-victory-ref` (M5–M7).
3. **Phát một phiên LIVE được phép** để thử comment thật (M8).
4. **Xác nhận máy LIVE có `py` (Python ≥ 3.9) và `git`** (F3).
5. **Thử overlay trong OBS/LIVE Studio + audio + xem trên điện thoại** (M13).
6. **Chốt:**
   - xoay ghế có ghim Top 3 hay không;
   - có cần SMART_RANDOM 7/5/3 cho buổi thi không;
   - JOIN ở sảnh để sau sự kiện?

   (`IMPLEMENTATION_GAP_MATRIX_V4.md` §8)

## Việc theo làn (chi tiết: `mailbox/BOARD.md`)

| Làn | Đang làm / xếp hàng |
|---|---|
| coordinator | Điều phối V4; xử lý F1 (auto mode qua preflight — làn server) |
| codex1 | C-0085 E2E nội dung dài + CI; đề xuất nhận F2–F5, F7 (backup, `CHAY_GAME.cmd`, `web_build.py`) |
| codex2 | Chờ người dùng duyệt nhánh `c0068` |
| cloud | C-0099 rà P0 (`docs/review/RA_SOAT_P0.md`) — xong |

## Nhật ký

- 12/11 sáng — Gộp C-0092 P0-A..D (preflight, backup + source-run, tổng duyệt mã nguồn, ảnh giữ chỗ) và C-0097 (event ID simulator). 268 test. Cloud rà P0: 3 lỗi P0 (F1–F3), xem `docs/review/RA_SOAT_P0.md`.
- 12/11 00:13 — Người dùng gửi plan V4. Chốt D-19..D-22: giữ Kahoot, P0 trước, dừng giọng MC sau mốc 2. Cloud lập ma trận khoảng trống (C-0093).
- 11/11 23:45 — 36 câu Free Fire được duyệt để chạy thử (BOARD #20).
- 11/11 21:35 — 227 test + 33 E2E (Windows). Gộp HUD LIVE mô phỏng, safe zone, đếm đáp án realtime.
- Nhật ký chi tiết trước 21:35 ngày 11/11: xem lịch sử git của file này (`git log -p docs/TIEN_DO.md`).
