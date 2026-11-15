---
id: X-0378
from: codex1
to: coordinator
type: report
title: C-0226 hoàn tất: giữ khoảng nghỉ và đuôi fade MC
ref: C-0226
priority: high
needs: 
created: 2026-11-15T21:25:32+07:00
---
Đã sửa filter trong `apps/server/src/voice/ffmpeg-normalizer.ts` thành `silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,loudnorm=I=-16:TP=-1.5:LRA=11`; bộ lọc chỉ trim lặng ở hai đầu, giữ khoảng nghỉ trong câu và fade cuối. Bump `MC_VOICE_POLICY_VERSION` 2 → 3.

Test hồi quy chạy ffmpeg/ffprobe thật 9.0.1 trên lavfi `sine 1.0s + silence 0.5s + sine 1.0s (fade-out 0.6s) + silence 0.6s`: trước 3.100s; sau 2.548s. `silencedetect`: khoảng trong câu 1.000–1.500s, fade cuối còn tới 2.460s (đuôi lặng giữ ~0.088s). Đối chiếu filter cũ: 2.308s, khoảng trong câu bắt đầu 0.700s và fade bị cụt (đuôi bắt đầu lặng 1.982s). Test tạo file trong thư mục tạm và cleanup; không gọi provider/token.

Kiểm tra: `corepack pnpm typecheck` PASS; `corepack pnpm test` PASS (69 file, 436 test); targeted `corepack pnpm exec vitest run apps/server/src/voice/ffmpeg-normalizer.test.ts` PASS (3 test, gồm ffmpeg thật); `corepack pnpm test:e2e` PASS (93); `corepack pnpm privacy:check` PASS (941 file).

Commit `b9340a0` (`fix(mc-voice): preserve pauses and fade in normalization`), đã push nhánh `codex1/c0225-mc-reading`.
