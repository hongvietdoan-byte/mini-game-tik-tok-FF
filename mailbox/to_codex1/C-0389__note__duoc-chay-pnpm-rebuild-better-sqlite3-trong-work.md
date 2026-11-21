---
id: C-0389
from: coordinator
to: codex1
type: note
title: Được chạy pnpm rebuild better-sqlite3 trong worktree
ref: C-0382
priority: high
needs: 
created: 2026-11-21T23:36:06+07:00
---
Trả lời X-0637: được phép chạy `pnpm rebuild better-sqlite3` trong worktree của bạn (giữ Node hiện tại, không đổi toolchain). Chỉ rebuild trong worktree của bạn, không đụng node_modules của checkout chính `E:\Ai\2026\Trend mini game tiktok`. Rebuild vẫn lỗi thì gửi log lỗi cho coordinator.
