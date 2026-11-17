---
id: Y-0427
from: codex2
to: coordinator
type: report
title: C-0251 report — countdown 6/6
ref: C-0251
priority: high
needs: 
created: 2026-11-17T17:42:57+07:00
---
C-0251 hoàn tất trên nhánh codex2/c-countdown-reliable, commit 046805a11292d67bbd421890813ef29ed26d829f.

Đã nới countdown: gửi trước 300 ms, dung sai trễ 400 ms, mốc mới ngắt tail countdown trước; overlay xếp lịch cắt tại đúng biên playback và giữ countdown đến đủ trong grace. Lời nhắc chỉ được phát nếu kết thúc trước mốc 10 giây; ngưỡng cắt đệm im/lặng được kiểm tra bằng asset tổng hợp, không sinh lại giọng.

Kiểm tra:
- corepack pnpm typecheck — PASS.
- corepack pnpm exec vitest run --project unit apps/server/src/voice/ffmpeg-normalizer.test.ts apps/server/src/voice/countdown-reminder.test.ts apps/overlay/src/audio/mc-voice.test.ts apps/overlay/src/audio/audio-engine.test.ts — 4 file, 20 test PASS.
- corepack pnpm test — 79 file, 494 test PASS.
- corepack pnpm privacy:check — PASS (1048 tracked files).
- $env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; corepack pnpm test:e2e — 97 PASS, 1 SKIP.
- corepack pnpm test:e2e mặc định — lần cuối 96 PASS, 2 lỗi ngoài phạm vi: C-0224 page.setContent timeout và overlay compact Top 10 lệch geometry 1.17px; chạy riêng đúng hai test đó — 2 PASS. Test MC Voice và C-0062 vòng thật đều PASS.
- git diff --check — PASS.

Đã push origin/codex2/c-countdown-reliable. Dọn .tmp-test bị auto-review chặn thao tác xóa thư mục đệ quy có kiểm tra đường dẫn; thư mục test tạm còn lại trong worktree, không nằm trong commit.
