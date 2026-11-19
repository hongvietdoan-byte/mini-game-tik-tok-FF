---
id: Y-0529
from: codex2
to: coordinator
type: report
title: C-0306/C-0311 hoàn tất, E2E còn 1 lỗi FPS flaky
ref: C-0306
priority: normal
needs: 
created: 2026-11-19T09:34:57+07:00
---
C-0306/C-0311 đã hoàn tất trên nhánh `codex2/c-0306-overlay-fixes`, commit `a5ddf97f` (đã push).

- `corepack pnpm typecheck`: PASS.
- `corepack pnpm exec vitest run apps/overlay/src/v3/arenaLogic.test.ts`: 9/9 PASS.
- E2E mục tiêu (c0306 safety, mc voice, c0293, safe-zone): 21/21 PASS.
- E2E toàn bộ: 122/123 PASS. Lỗi duy nhất là `c0197-video-background.spec.ts` p5 FPS 40 < 45 trong suite. Chạy riêng chính bài đó đạt p5 59.9; test bố cục C-0279 cũng chạy riêng PASS. Không sửa ngưỡng perf ngoài phạm vi.
- Bbox INTERMISSION: figure [760,1266–1004,1540], nameplate [758,1488–1000,1544], bubble [100,1278–680,1390]; không giao card/timer/header, chữ 30px, cách mép dưới 530px. Đã đưa MC sang phải khỏi comment rail và chuyển bong bóng lên dải sàn trống.
- ROUND_WINNER: 3 người thắng; figure [115,1456–385,1730], nameplate [100,1678–380,1734], không giao podium, thẻ/tên/điểm/cúp; không render bubble, cue voice vẫn phát. Mock tên dài và đồng hạng cũng PASS.
- Ảnh đã xem lại: `.claude/review/C0311/intermission-1080x1920-full.png`, `intermission-mc-zoom.png`, `round-winner-1080x1920-full.png`, `round-winner-mc-zoom.png` trong worktree `c-0305-seat-chibi`.
