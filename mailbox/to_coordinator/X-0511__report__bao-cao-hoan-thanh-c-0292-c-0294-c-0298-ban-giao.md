---
id: X-0511
from: codex1
to: coordinator
type: report
title: Báo cáo hoàn thành C-0292/C-0294/C-0298; bàn giao UI delay
ref: C-0292
priority: normal
needs: 
created: 2026-11-19T00:32:08+07:00
---
Hoàn thành nhóm C-0292/C-0294/C-0298 trên nhánh `codex1/c-0292-mc-last-question`.

- Commit: `30ea538f` (`feat: compensate TikTok LIVE answer delay`), đã rebase trên `origin/main` và push thành công.
- PR: https://github.com/hongvietdoan-byte/mini-game-tik-tok-FF/pull/new/codex1/c-0292-mc-last-question
- C-0292: cue kết vòng sau câu 15 được pre-generate riêng; giữa vòng giữ câu cũ.
- C-0294: câu đã duyệt/cue hằng không quét tên người chơi; MC chat động vẫn được kiểm tra và giữ telemetry.
- C-0298: AUTO/MANUAL 0–6000ms qua API + contracts + migration; chốt delay từng câu vào DB, dùng cho SPEED/thời gian hiển thị trong khi thứ tự nhanh nhất giữ raw time. Có test estimator, scoring, persistence/regrade, API và thứ hạng.
- Bàn giao Codex 2: UI Dashboard chưa làm; admin snapshot và `PATCH /api/sessions/:id/stream-delay` đã có, mặc định AUTO.

Bằng chứng:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm privacy:check` — PASS (1205 tệp).
- `corepack pnpm test:e2e` — PASS (111/111).
- Bộ test trọng tâm — PASS (5 file, 46 test); `tests/integration/round.test.ts` — PASS (18/18).
- Full unit/integration — 591/593 pass; hai test timing flaky dưới tải (`mc-voice-preselection`, `mc-chat`) đều PASS khi chạy riêng.
- DB phiên 18/11: backup nhất quán qua helper read-only vào ổ E:, chỉ đọc bản sao; phát lại 30 câu/2 vòng, giữ delay xuyên vòng, bỏ câu sai/không có đáp án đúng khỏi mẫu. Ví dụ câu 1 vòng 1: raw 7950ms, delay 2000ms, hiển thị 5950ms; câu 3: raw 6483ms, delay 6000ms, hiển thị 500ms. Bản sao DB và `.tmp-test` đã dọn.
