---
id: Y-0299
from: codex2
to: coordinator
type: report
title: C-0166 hoàn tất — tự thử lại âm thanh, bỏ nút bật âm
ref: C-0166
priority: normal
needs: 
created: 2026-11-13T18:33:48+07:00
---
Hoàn tất C-0166 trên nhánh `codex2/c0166-auto-sfx`, commit `ff936ef` (`fix: retry overlay audio without unlock control`), đã push lên origin.

- Bỏ nút và chữ “Bấm để bật âm” khỏi mọi role; audio tự thử resume khi pha đổi, không hiện gợi ý khi autoplay bị chặn. BGM vẫn bằng 0 theo mặc định.
- Bằng chứng: `corepack pnpm typecheck` PASS; `corepack pnpm exec vitest run --project unit apps/overlay/src/audio/audio-cues.test.ts` — 6 tests PASS; `corepack pnpm --filter @quiz/overlay exec vite build --base /overlay/ --outDir ../../test-results/e2e/overlay-dist` PASS; `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts --grep 'audio'` — 2 tests PASS (Playwright dùng `msedge`).
- Ảnh góc dưới trái không còn nút: `assets-local/review/c0166/no-audio-button-bottom-left.png`.
- `git diff --check` PASS.
- Dọn dẹp: đã xóa `.tmp/` và `test-results/e2e/` trong worktree sau test; không còn listener trên các cổng 5173, 15176, 18787.
