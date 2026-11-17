---
id: Y-0433
from: codex2
to: coordinator
type: report
title: C-0255 countdown schedule hoàn tất, đã push
ref: C-0255
priority: normal
needs: 
created: 2026-11-17T19:02:40+07:00
---
## C-0255 — countdown schedule cho overlay

**Đã làm**
- Nhánh `codex2/c-countdown-schedule`, commit `277e0bc273f54312fff244982b92ebbf4fe3efe9` (đã rebase lên `main` và push thành công).
- Thay timer server phát countdown từng giây bằng lịch đủ 6 mốc có assetId, durationMs, startsAtServerMs trong snapshot ACCEPTING; overlay tự xếp lịch theo đồng hồ server, cue sau ngắt cue trước. Pause, huỷ, đóng sớm sẽ dừng cue còn lại; reconnect chỉ nhận cue tương lai. Giữ sự kiện mcVoiceCue cũ cho loại cue khác.
- Bổ sung telemetry drop theo lý do và timer_lateness_ms; monitorEventLoopDelay trong simulator. Simulator nhận `--players 5000`.
- Không sinh giọng thật.

**Đo trước/sau**
- Trước: simulator tổng hợp 5.000 người, 1 câu; chặn event loop 1.25 s. Timer cũ phát 5/6; log ghi `reason=TIMER_LATE timer_lateness_ms=946`. Event loop (resolution 20 ms): samples=622, p50=30.98, p95=32.10, p99=32.85, max=1266.68, mean=32.93 ms.
- Sau: cùng tình huống tổng hợp, một schedule được công bố; overlay planner xếp đủ 6/6 mốc, 0 drop. Event loop: samples=623, p50=30.97, p95=32.28, p99=32.83, max=1252, mean=32.89 ms.
- Đây là phép đo tổng hợp một câu; chưa thay cho diễn tập thật 15 câu/5.000 người của coordinator sau khi gộp.

**Xác minh trên nhánh đã rebase**
- `corepack pnpm typecheck` → PASS (`tsc --noEmit`).
- `corepack pnpm test` → 80 files, 503 tests passed.
- `corepack pnpm test:e2e` → 98 passed (6.0m).
- `corepack pnpm privacy:check` → PASS (1063 tracked files).
- `corepack pnpm exec tsx --test tools/mock_round_check_analysis.test.ts` → 3 passed, 0 failed.
- `git diff --check HEAD^ HEAD` → PASS; quét EOF 9 file sửa → PASS, không có escape thừa cuối file.

**Tiêu chí**
- Gửi lịch đầy đủ, không timer countdown phía server: đạt.
- Pause/huỷ/đóng sớm, reconnect và dedupe schedule: đạt qua unit test; jitter 1.5 giây vẫn giữ đủ 6 mốc trong planner.
- Telemetry và event-loop measurement: đạt; dữ liệu thật 15 câu còn chờ coordinator diễn tập sau gộp.
