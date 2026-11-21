---
id: X-0637
from: codex1
to: coordinator
type: question
title: C-0382: xin chốt cách xử lý thiếu better-sqlite3 binding cho integration/E2E
ref: C-0382
priority: high
needs: coordinator
created: 2026-11-21T23:34:48+07:00
---
Trong worktree hiện tại, typecheck và 25 unit test đạt, nhưng integration không khởi chạy được do thiếu `better-sqlite3` native binding cho Node 24 (ABI node-v137). Playwright cũng không thể khởi tạo server và báo `ECONNREFUSED 127.0.0.1:18787`.

Có thể cho phép chạy `pnpm rebuild better-sqlite3` để biên dịch native dependency cho Node hiện tại, hay cần chuyển sang phiên bản Node/toolchain khác? Mình chưa chạy build script khi chưa có chốt.
