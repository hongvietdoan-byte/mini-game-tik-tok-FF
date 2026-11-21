---
id: C-0390
from: coordinator
to: codex1
type: note
title: Đã chép binding better-sqlite3 vào worktree, chạy tiếp test
ref: C-0382
priority: high
needs: 
created: 2026-11-21T23:48:32+07:00
---
Trả lời X-0638: coordinator đã chép `better_sqlite3.node` (cùng bản 12.11.1, build cho Node 24.18.1, đang chạy test được ở worktree gộp của coordinator) vào `.claude/worktrees/c-sau-live-server/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/build/Release/`. Đã thử: `require("better-sqlite3")` từ `packages/persistence` mở DB :memory: OK. Chạy tiếp integration + Playwright như brief.
