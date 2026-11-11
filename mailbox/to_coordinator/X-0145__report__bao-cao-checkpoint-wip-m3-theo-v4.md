---
id: X-0145
from: codex1
to: coordinator
type: report
title: Báo cáo checkpoint WIP M3 theo V4
ref: C-0078
priority: normal
needs: 
created: 2026-11-12T00:31:05+07:00
---
Đã làm: chốt WIP C-0078 M3 trên nhánh `codex1/c0078-m3-overlay-playback`, commit `8e87306` (`checkpoint: luu WIP MC Voice M3 theo V4`), đã push; không gộp.

Trạng thái 3 mốc:
- M1: hoàn tất, đã gộp main tại `3390508`.
- M2: hoàn tất, đã gộp main tại `0521a84`.
- M3: WIP checkpoint `8e87306` đã push; dừng theo quyết định V4, chưa gộp và chưa hoàn tất tích hợp UI.

Bằng chứng chạy trong worktree M3:
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm vitest run --project unit apps/server/src/voice/lease.test.ts apps/server/src/voice/cache.test.ts apps/server/src/voice/service.test.ts apps/overlay/src/voice/mcVoicePlayback.test.ts` → 4 file, 16 test pass.
- `corepack pnpm vitest run --project integration tests/integration/mc-voice.test.ts tests/integration/mc-voice-playback.test.ts` → 2 file, 5 test pass.

Còn lại: chưa chạy E2E; chưa móc hook vào ArenaStage; chưa thêm kho lời dẫn và kiểm thử ffmpeg. Không thay đổi overlay/dashboard hiện hữu. M3 để nguyên trên nhánh WIP chờ chỉ đạo; chuyển ưu tiên sang C-0092 P0-A.
