---
id: Z-0004
from: cloud
to: coordinator
type: report
title: C-0093 hoàn tất ma trận khoảng trống V4
ref: C-0093
priority: normal
needs: 
created: 2026-11-11T17:19:25+00:00
---
C-0093 xong. File `docs/IMPLEMENTATION_GAP_MATRIX_V4.md` trên nhánh `claude/zen-dijkstra-sop0bt`, commit `771fe1d` (chỉ tài liệu, không sửa code).

**Bằng chứng chạy lại @ main `3769b01`:** typecheck sạch; vitest 38 file, 260/260 PASS. E2E không tái lập được trong cloud (thiếu assets-local + Edge). Không mục nào ghi VISUAL_APPROVED/LIVE_VERIFIED/E2E_VERIFIED.

**Kết quả kiểm theo code (đọc code, không suy theo tên file):**
- UNIT_VERIFIED: 15 s backend; đủ pha (READING chỉ khi `mcVoiceEnabled`, hạn 20 s, fallback đúng); khoá đáp án đầu tiên (UNIQUE + transaction); comment trễ/sớm/câu trước (cửa sổ + STALE_SOURCE_TIMESTAMP); pause/resume/skip/void; mất kết nối; khôi phục sau restart; Top 10/podium đồng hạng; không lặp câu; characterId ổn định.
- MISSING: **SMART_RANDOM 7/5/3** (chỉ RANDOM có seed, đang ở backlog); **JOIN ở sảnh**; **backup** (`Store.backup()` có nhưng không nơi nào gọi).
- Preflight chỉ kiểm số câu. Backup, đường chạy, rehearsal ghi "ĐANG LÀM (C-0092)", tôi không làm trùng.
- `CHAY_GAME.cmd` chỉ build khi chưa có dist (dùng bản dựng cũ). Repo-`data/` khác `%APPDATA%` của Electron, tức hai thư mục dữ liệu.

**Phát hiện cần chú ý:**
1. Victory trên `main` (`apps/overlay/src/v3/Victory.tsx:92-121`) **vẫn vẽ cúp SVG**, trái D07. Bản raster chỉ có ở nhánh chưa gộp `codex2/c0068-victory-ref` @ `1d6bbd8`.
2. Nhánh đó vẫn render `<BrandMark />` ở header Victory (`:116`). Cần xác định `brand/logo.png` là logo Free Fire hay logo sự kiện (D08). Tôi CHƯA KIỂM CHỨNG được vì không có assets-local.
3. Overlay trên `main` chưa có giao diện READING (thuộc C-0080).
4. E2E không có câu dài nhất, 720×1280, reduced motion; Playwright không có trong CI.

**Mâu thuẫn V4 cần người dùng chốt (§8 của file):**
- M2: xoay ghế đang ghim Top 3 theo điểm (`runtime.ts:413`), V4 ghi "không ưu tiên điểm".
- M3: SMART_RANDOM có cần cho buổi thi không? Nếu cần, 6 vòng × 7/5/3 = 90 câu đã duyệt, nhiều hơn 36.
- M4: JOIN. Đề xuất để P2.
- M1 (Kahoot) đã chốt theo D-21. M5/M6/M8 chỉ khác tên hoặc đã xong.

**Top việc trước tổng duyệt (§7):** duyệt ≥ 15 câu cho buổi thi → comment thật + đo độ trễ (`maxSourceLagMs` 5 s) → chốt đường chạy/thư mục dữ liệu → duyệt + gộp Victory raster → kiểm logo D08 → C-0080 + ảnh ghép → backup/restore → preflight → rehearsal 1 vòng rồi 6 vòng → runbook khi TikTok rớt.
