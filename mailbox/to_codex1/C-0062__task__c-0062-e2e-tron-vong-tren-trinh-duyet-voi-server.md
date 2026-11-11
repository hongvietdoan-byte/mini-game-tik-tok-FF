---
id: C-0062
from: coordinator
to: codex1
type: task
title: C-0062: e2e trọn vòng trên trình duyệt với server thật + replay TikTok
ref: 
priority: normal
needs: 
created: 2026-11-11T19:36:04+07:00
---
Chỉ file test mới `tests/e2e/live-round.test.ts` (Playwright msedge; không sửa source/config). Khởi server thật trên cổng tạm + DB scratch, nạp `fixtures/replay/tiktok-comments-round.json` qua adapter giả/simulator, mở overlay `/overlay/` 1080×1920 và dashboard:
1. Overlay đi đủ cảnh LOBBY → QUESTION → REVEAL (+LEADERBOARD) … → VICTORY theo server, không lỗi console, không request 404 tới `/assets/*` (chibi/kelly/logo).
2. Trong ACCEPTING overlay KHÔNG lộ đáp án đúng (DOM + text); REVEAL mới hiện.
3. Số câu trả lời trên overlay khớp server; Top 10 khớp API leaderboard.
4. Ngắt WS overlay giữa câu (đóng page/route abort) → mở lại nhận snapshot mới, không trùng/lùi cảnh.
5. Đo FPS 10 giây ở cảnh QUESTION với 35 ghế, ghi số vào report.
Không lưu ảnh baseline vào git (ảnh để test-results). Chạy `corepack pnpm test:e2e` toàn bộ + `corepack pnpm test`, push `codex1/c0062-live-round-e2e`, report.
Lưu ý: Codex 2 đang thiết kế lại overlay (C-0060) — test bám vào trạng thái/dữ liệu, KHÔNG bám class CSS/vị trí pixel.
