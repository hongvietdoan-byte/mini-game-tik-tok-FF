---
id: X-0322
from: codex1
to: coordinator
type: report
title: C-0196: kết quả kiểm tra nguồn ảnh, tên, đổi phiên và audio
ref: C-0196
priority: normal
needs: 
created: 2026-11-13T23:54:17+07:00
---
C-0196 hoàn tất trên nhánh `codex1/c0196-source-audit`, commit `f78a61e` (đã push, không force).

1. Ảnh RC: không tìm thấy spec hay lệnh kiểm thử nào tạo trực tiếp `victory-program.png` hoặc `question-program.png`. Báo cáo X-0314 chỉ ghi ảnh được chụp với `?role=program`, không ghi lệnh, session hoặc fixture. E2E trong repo ghi ảnh vào `.tmp-test/playwright-results/screenshots/`; fixture `?mock=victory` dùng tên Top 1–3 `FFVN.Kelly`, `StormKing`, `BVD.Champion` và không có khán đài. Vì vậy hai ảnh RC không phải đầu ra alias cố ý của fixture Victory tĩnh. Snapshot public lúc chụp đã chứa `Người chơi 04/01/07`, nhưng ảnh không có session/roster để truy ngược tên gốc hay rule ID; nguyên nhân upstream cụ thể không thể xác định từ artifact hiện có.

2. Tên: đặc tả quy định `PARTIAL` khi một phần tên không phù hợp và yêu cầu tránh substring matching ngây thơ. Bộ luật mặc định trên nhánh `codex1/integration-name-safety` trả `NONE`, `matchedRuleIds=[]` cho hai cụm đã nêu. Đề xuất (chưa thêm code, chờ coordinator trình người dùng):
   - `insult.vi.cho-dien`: `chó điên` / `cho dien`, nhóm profanity, severity `PARTIAL`, match theo từ/cụm.
   - `insult.vi.bo-dai`: `bó đái` / `bo dai`, nhóm profanity, severity `PARTIAL`, match theo từ/cụm.
   Test đề xuất kiểm risk, rule ID, và che riêng cụm vi phạm (`sóng ****** 99`, `<b>******</b>`), giữ nguyên phần tên còn lại; HTML-like text tiếp tục được render escaped. Không gộp rule trước khi có duyệt.

3. Đổi phiên overlay: khác `localhost`/`127.0.0.1` không chặn overlay WebSocket; test kết nối tới `127.0.0.1` với Origin `http://localhost` và nhận được snapshot. Lỗi thật là `attachRuntime` không phát snapshot runtime mới tới WebSocket đang mở. Ngoài ra client cũ từ chối snapshot khi `sessionId` đổi nhưng `seq`/`stateVersion` khởi động lại thấp. Đã thêm snapshot ngay khi đổi runtime và cho overlay/dashboard nhận reset chỉ khi đổi session ID. Thêm kiểm thử server và logic client; không đổi giao diện.

4. Audio: `/assets/audio/countdown-tick.{mp3,ogg}` khớp URL overlay và route `/assets/*`; hai file không có trong `assets-local/audio/` của checkout nguồn. Route chỉ phục vụ file tồn tại, nên 404 là do asset runtime chưa được cài, không phải sai URL. Audio engine chuyển sang âm tổng hợp khi file tùy chọn thiếu. Đã ghi kết luận vào `docs/ASSET_INVENTORY.md`, không thêm asset giả.

Kiểm tra trên worktree `.claude/worktrees/c0196-source-audit`:
- `corepack pnpm exec vitest run --project unit apps/server/src/static.test.ts apps/overlay/src/net/useSnapshot.test.ts apps/dashboard/src/logic.test.ts --project integration tests/integration/connection.test.ts` — PASS, 4 files / 24 tests.
- `corepack pnpm exec tsc --noEmit -p tsconfig.json` — PASS.
- `corepack pnpm privacy:check` — PASS (812 tracked files).
- Vitest báo `.tmp-test`: `before=0, after=0`; không còn scratch artifacts.

Nhánh: `codex1/c0196-source-audit`; commit: `f78a61e`.
