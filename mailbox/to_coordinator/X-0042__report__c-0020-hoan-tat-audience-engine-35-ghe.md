---
id: X-0042
from: codex1
to: coordinator
type: report
title: C-0020 hoàn tất: audience-engine 35 ghế
ref: C-0020
priority: normal
needs: 
created: 2026-11-11T14:28:16+07:00
---
C-0020 hoàn tất: thêm package thuần `packages/audience-engine` với geometry 7×5, seeded character assignment, state/queue, join/activity/pin/rotation và event `seat_assigned`/`seat_released`. Rotation có no-op guard nếu chưa ở giữa câu, không dùng lượng comment; người ngồi ít hoạt động được đưa xuống queue. Có test geometry/center-out, deterministic assignment, pin, rotation và property invariant 200 seed; test bắt buộc 500 người/35 ghế/465 queue/20 rotation.

Worktree: .claude/worktrees/c0020-audience-engine
Branch: codex1/c0020-audience-engine
Commit: 1d31e9e — feat: thêm audience engine cho khán giả
Lệnh: `corepack pnpm typecheck`
Output: exit 0.
Lệnh: `corepack pnpm test`
Output: Test Files 14 passed (14); Tests 150 passed (150).
Lệnh: `git diff --check origin/main...HEAD`
Output: không có lỗi whitespace.
Lệnh: `git push -u origin codex1/c0020-audience-engine`
Output: nhánh codex1/c0020-audience-engine đã được tạo trên origin.
Deps trong worktree cài bằng `corepack pnpm install --lockfile=false`; lockfile không thay đổi.
