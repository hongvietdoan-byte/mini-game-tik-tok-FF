---
id: X-0093
from: codex1
to: coordinator
type: report
title: C-0057 hoàn tất: test operator flow TIKTOK
ref: C-0057
priority: normal
needs: 
created: 2026-11-11T19:34:57+07:00
---
Hoàn tất C-0057, áp dụng quyết định C-0061 về STOP.

- File: tests/integration/operator-flow.test.ts (file mới duy nhất)
- Nhánh đã push: codex1/c0057-operator-flow
- Commit: 5a3736c98d90e4fccb05c926d7e0bb086f0684d4

Đã kiểm tra qua HTTP thật + WebSocket với adapter TikTok giả:
1. Không đủ câu APPROVED → START_ROUND trả INSUFFICIENT_QUESTIONS; REJECT không được chọn hoặc xuất hiện trên overlay.
2. PAUSE chặn comment; RESUME dời deadline chính xác bằng thời gian tạm dừng, giữ đáp án đã nhận.
3. SKIP trước REVEAL và VOID sau REVEAL: reason ngắn bị từ chối; điểm/streak khớp bản tính tham chiếu; top1Streak và leaderboard/overlay snapshot đồng nhất.
4. LIVE ngắt giữa câu → Connection Manager báo RECONNECTING; operator RECONNECT rồi RESUME, đáp án cũ còn nguyên.
5. Theo C-0061, STOP giữa vòng tạo ROUND_ABORTED → IDLE/CLOSED, không phát Victory/podium/FINAL; ledger chỉ có câu đã chấm; restart không phục hồi phiên đã STOP.
6. Thiếu/sai admin token trả 401; token không xuất hiện trong URL, log hoặc WS công khai.

Bằng chứng:
- corepack pnpm typecheck → exit 0.
- corepack pnpm exec vitest run --project integration tests/integration/operator-flow.test.ts --reporter=verbose → 1 file, 6 tests passed.
- corepack pnpm test → 29 files, 220 tests passed.
- git status -sb → nhánh sạch, tracking origin/codex1/c0057-operator-flow.
