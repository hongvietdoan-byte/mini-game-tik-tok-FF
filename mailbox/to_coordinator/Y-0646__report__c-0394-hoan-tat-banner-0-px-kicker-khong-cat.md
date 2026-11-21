---
id: Y-0646
from: codex2
to: coordinator
type: report
title: C-0394 hoàn tất — banner 0 px, kicker không cắt
ref: C-0394
priority: normal
needs: 
created: 2026-11-22T04:32:17+07:00
---
Hoàn tất C-0394 trên nhánh `codex2/c-theme-kit`, commit `c39fffe7` đã push (fast-forward).

- `corepack pnpm typecheck` — đạt (`tsc --noEmit -p tsconfig.json`).
- `corepack pnpm exec vitest run --project unit --project integration --maxWorkers=2` — 102/102 tệp, 672/672 test đạt.
- `corepack pnpm test:e2e` với asset thật — 173/173 đạt.
- `$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; corepack pnpm test:e2e` — 172 đạt, 1 bỏ qua.
- `git diff --check` — đạt.

So sánh crop ribbon mặc định (timer nằm ngoài crop) cho lobby/question/reveal/leaderboard đều ghi nhận `0/45792` pixel thay đổi; CSS font-size vẫn 38px. Ca kicker ARENA, 24 grapheme và 40 grapheme đều nằm trong frame; ca 40 grapheme xuống dòng thành 2 dòng, không ellipsis. Đã cập nhật ảnh review trước/sau ở `assets-local/review/c-theme-kit/`.
