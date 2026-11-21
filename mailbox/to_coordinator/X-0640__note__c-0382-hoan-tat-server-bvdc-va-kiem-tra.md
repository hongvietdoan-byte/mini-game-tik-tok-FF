---
id: X-0640
from: codex1
to: coordinator
type: note
title: C-0382 hoàn tất — server, BVĐC và kiểm tra
ref: C-0382
priority: normal
needs: 
created: 2026-11-22T00:25:55+07:00
---
C-0382 hoàn tất theo các bổ sung C-0384/C-0385/C-0388/C-0389/C-0390.

Nhánh đã đẩy: `codex1/c-sau-live-server` — HEAD `8d1d6e4c0c90e725d4bfa06de333ee8a833a75e7`; đã gộp `origin/main` mới nhất (`e01a3117`). PR có thể mở tại: https://github.com/hongvietdoan-byte/mini-game-tik-tok-FF/pull/new/codex1/c-sau-live-server

**Commit theo phần việc**

- A — `70be927b`: cho MC operator chat bỏ chặn trùng tên và chỉ áp từ cấm có dấu/viết tắt; vẫn giữ luật an toàn của MC tự động. `apps/server/src/runtime.ts:1195`.
- B — `d6a86dc7`, `7fd4cb51`: giới hạn 400 ký tự, timeout 40 giây, riêng audio operator chat 35 giây; cue thông thường còn giới hạn 20 giây. `packages/contracts/src/index.ts:223-246`, `apps/server/src/runtime.ts:116,1273,1618`.
- B2 — `b0f808a1`: mặc định prepare 6 giây/reveal 7 giây. `packages/contracts/src/index.ts:505-507`.
- C — `db035f3f`: xoay ghế theo ngai/chuỗi bỏ câu; public `playingCount` dựa trên người trả lời gần đây và số ghế ở sảnh. `apps/server/src/audience.ts:264`, `apps/server/src/runtime.ts:2723,3185,3199`, overlay lấy vòng/đếm ở `apps/overlay/src/v3/ArenaStage.tsx:230-231`.
- D — cập nhật 11 prompt `bv-016, 022, 023, 024, 025, 029, 030, 031, 061, 062, 063` bằng quy trình version + `question_versions`; giữ trạng thái duyệt. Đây là dữ liệu checkout chính, không có commit DB theo yêu cầu không commit DB.
- E1/E2 — `0b8b6362`: xóa ngai cũ khi về sảnh; public state gửi số vòng kế tiếp và overlay hiển thị số đó cùng playingCount. `apps/server/src/runtime.ts:743,3185,3199`, `apps/overlay/src/v3/ArenaStage.tsx:230-231`.
- Test/lifecycle follow-up — `89d5404e`, `34c926e2`: cập nhật test cho chuyển VICTORY→LOBBY, hàng chờ còn người, an toàn giọng MC và callback sau dispose; `runtime.telemetry()` không truy vấn DB đã đóng (`apps/server/src/runtime.ts:1157`).

**Bảng prompt trước/sau (D)**

| Mã | Prompt cũ | Prompt mới |
|---|---|---|
| bv-016 | Muốn vô địch, đội vào chung kết phải thắng mấy ván? | Tại Bá Vương Đại Chiến, muốn vô địch thì đội vào chung kết phải thắng mấy ván? |
| bv-022 | Danh hiệu dành cho người hạ gục nhiều nhất showmatch BR là gì? | Tại Bá Vương Đại Chiến, danh hiệu dành cho người hạ gục nhiều nhất showmatch BR là gì? |
| bv-023 | Chủ nhân danh hiệu King of Sniper nhận thưởng bao nhiêu? | Tại Bá Vương Đại Chiến, chủ nhân danh hiệu King of Sniper nhận thưởng bao nhiêu? |
| bv-024 | Showmatch King of Sniper thi đấu ở chế độ nào? | Tại Bá Vương Đại Chiến, showmatch King of Sniper thi đấu ở chế độ nào? |
| bv-025 | King of Sniper được trao theo tiêu chí nào? | Tại Bá Vương Đại Chiến, King of Sniper được trao theo tiêu chí nào? |
| bv-029 | Ở tứ kết, Gác Kiếm gặp đội nào? | Ở tứ kết Bá Vương Đại Chiến, Gác Kiếm gặp đội nào? |
| bv-030 | Ở tứ kết, Ngốc Nghếch gặp đội nào? | Ở tứ kết Bá Vương Đại Chiến, Ngốc Nghếch gặp đội nào? |
| bv-031 | Ở tứ kết, One Champ gặp đội nào? | Ở tứ kết Bá Vương Đại Chiến, One Champ gặp đội nào? |
| bv-061 | Trận đầu tiên mỗi ngày thi đấu bắt đầu lúc mấy giờ? | Tại Bá Vương Đại Chiến, trận đầu tiên mỗi ngày bắt đầu lúc mấy giờ? |
| bv-062 | Ngày 14/11 mở màn bằng nội dung thi đấu nào? | Tại Bá Vương Đại Chiến, ngày 14/11 mở màn bằng nội dung thi đấu nào? |
| bv-063 | Đội nào là Quý Quân Bá Khí? | Tại Bá Vương Đại Chiến, đội nào là Quý Quân Bá Khí? |

`pnpm report:question-length`: approved=186, clamp=0, small=52, slow=1, answerCuts=0, median=9.375 chars/sec, affected=53; không báo target nào trong 11 câu cần rút gọn vì độ dài/khả năng đọc 24 px.

**Kiểm tra**

- `corepack pnpm typecheck` — PASS.
- `corepack pnpm privacy:check` — PASS (1485 tracked files).
- `corepack pnpm test:unit` — PASS, 83 files / 575 tests.
- `corepack pnpm test:integration` — PASS, 18 files / 92 tests.
- `corepack pnpm test:e2e` (asset thật) — PASS, 168 passed, 0 failed.
- `$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; corepack pnpm test:e2e` — 167 passed, 1 skipped có chủ đích trong chế độ placeholder, 0 failed.
- `git diff --check` — PASS.

Đã kiểm tra lại hộp thư; hiện vẫn chỉ có 6 thư C-0382/C-0384/C-0385/C-0388/C-0389/C-0390, không có chỉ dẫn mới.
