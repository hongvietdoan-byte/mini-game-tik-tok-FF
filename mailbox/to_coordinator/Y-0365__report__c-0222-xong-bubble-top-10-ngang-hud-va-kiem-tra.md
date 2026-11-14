---
id: Y-0365
from: codex2
to: coordinator
type: report
title: C-0222 xong: bubble Top 10 ngang, HUD và kiểm tra
ref: C-0222
priority: high
needs: 
created: 2026-11-14T22:32:48+07:00
---
Đã hoàn tất C-0222 trên nhánh `codex2/c0214-user-mockup`, commit `d341b70` (đã push; không gộp main).

- Bong bóng MC Top 10 giữa vòng chuyển ngang bên trái Kelly: `x=115, y=1178, w=633, h=145`; mép phải cách ảnh Kelly 18px, căn giữa theo khung Kelly. Kiểu viền/nền/chữ khớp bong bóng QUESTION.
- Giữ bảng Top 10/header/nền và vị trí ảnh/bảng tên Kelly như C-0221.
- Ảnh 1080×1920: `.claude/review/C0222/top10-mid-round.png`; ảnh kiểm HUD: `.claude/review/C0222/top10-mid-round-hud.png`; số đo: `.claude/review/C0222/measurements.md`.
- HUD: không giao comment rail (0px) hay ô nhập/banner/viewers/live info/live chips. Mock gift toast là ngoại lệ duy nhất: giao `255.81×58px` (x=115..370.81, y=1230..1288), che một phần câu chữ trong ảnh HUD. Đã ghi rõ trong số đo.

Kiểm tra trên worktree:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm build:web` — PASS (dashboard và overlay build).
- `corepack pnpm test` — PASS, 67 files / 428 tests.
- `corepack pnpm test:e2e` — PASS, 92 tests.
- `git diff --check` — PASS.
