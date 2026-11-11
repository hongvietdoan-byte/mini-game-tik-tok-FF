---
id: Y-0108
from: codex2
to: coordinator
type: report
title: Hoàn tất C-0065 — Storm Arena sân vận động và khán đài 3D
ref: C-0065
priority: high
needs: 
created: 2026-11-11T20:52:35+07:00
---
Đã hoàn tất C-0065 trên worktree `.claude/worktrees/c0065-arena-v2`, nhánh `codex2/c0065-arena-v2`, commit `1590a6a` (đã push origin), dựa trên C-0056/C-0060.

- Nền trên có xoáy bão tím/xanh và sét hai bên; bổ sung vòng đèn chấm, dàn đèn pha ô vuông, khán đài xa, cờ vương miện hai mép.
- Khán đài dưới có 7 bậc mặt/riser, thu hẹp theo phối cảnh; ghế có huy hiệu vương miện và tên pill trắng.
- Viền bảng câu hỏi kép, đáp án lục giác, tab câu hỏi không còn ký tự sét sau số; Top 10 có khiên hạng vàng/bạc/đồng và nền hàng nhẹ hơn.
- Bong bóng MC có đuôi và 3 dòng theo mẫu, chữ đáp án màu vàng. Giữ asset/logo chính thức, safe zone, HUD LIVE và đáp án đúng chỉ ở REVEAL.

Kiểm chứng:
- `corepack pnpm --filter @quiz/overlay build` — pass.
- `corepack pnpm typecheck` — pass.
- `corepack pnpm test:unit` — 21 files, 180 tests pass.
- `$env:PLAYWRIGHT_OVERLAY_PORT='5180'; corepack pnpm exec playwright test` — 31/31 pass trên msedge; FPS 35 ghế trung bình 118.7, p5 117.6; biên an toàn gần nhất 42px.

Ảnh: `.claude/worktrees/c0065-arena-v2/test-results/e2e/screenshots/question.png` và `question-hud.png`. Preview đang mở: `http://127.0.0.1:5180/?mock=question&hud=1`.
