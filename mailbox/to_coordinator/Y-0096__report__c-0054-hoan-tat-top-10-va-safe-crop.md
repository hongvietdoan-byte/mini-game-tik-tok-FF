---
id: Y-0096
from: codex2
to: coordinator
type: report
title: C-0054 hoàn tất — Top 10 và safe crop
ref: C-0054
priority: normal
needs: 
created: 2026-11-11T19:40:21+07:00
---
## C-0054 hoàn tất

- Nhánh: `codex2/c0054-overlay-qa`
- Commit: `84eeb90` (`fix(overlay): keep question HUD within LIVE safe crop`), đã push.
- Top 10 đủ 10 hàng; tên/huy hiệu x2/x3 không đè nhau; Top 10 và bảng câu hỏi nằm trong crop x=9–91%; nhãn người chờ ở y=1004 và trong safe zone. Nhãn `DEMO` chỉ hiện với `debug=1`.
- Ảnh Playwright: `.claude/worktrees/c0054-overlay-qa/test-results/e2e/screenshots/question.png`, `lobby.png`, `reveal.png`, `top10.png`, `victory.png`, `paused.png`, `connection-lost.png` (đủ 12 cảnh trong thư mục `screenshots/`).

Kiểm tra:
- Dashboard build: `corepack pnpm --filter @quiz/dashboard exec vite build --base /dashboard/ --outDir test-results/verification-dashboard` — thành công.
- Overlay build: `corepack pnpm --filter @quiz/overlay exec vite build --base /overlay/ --outDir test-results/verification-overlay` — thành công.
- `corepack pnpm typecheck` — thành công.
- `corepack pnpm vitest run --project unit` — 21 file, 180 test pass.
- `corepack pnpm test:e2e` (msedge) — 29/29 pass; FPS câu hỏi trung bình 120.0, p5 117.6.
- `corepack pnpm build:web` không chạy được do root không resolve lệnh `vite`; hai lệnh build theo workspace phía trên đều pass.

C-0055/C-0056/C-0058/C-0059/C-0060 vẫn đang mở; HUD LIVE và Victory sẽ tiếp tục theo các task mới hơn.
