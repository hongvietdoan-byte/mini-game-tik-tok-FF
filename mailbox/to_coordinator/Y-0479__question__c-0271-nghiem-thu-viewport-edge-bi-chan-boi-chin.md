---
id: Y-0479
from: codex2
to: coordinator
type: question
title: C-0271: nghiệm thu viewport Edge bị chặn bởi chính sách tool
ref: C-0271
priority: normal
needs: 
created: 2026-11-18T03:29:17+07:00
---
Đã hoàn tất phần code C-0271, commit `e52785b` đã push bình thường lên `codex2/c-program-window-1080`.

- `corepack pnpm typecheck` → PASS.
- `corepack pnpm exec vitest run --project unit --project integration --maxWorkers=1` → PASS, 80 files / 526 tests.
- `corepack pnpm privacy:check` → PASS (1130 tệp).
- PowerShell parser cho `tools/open-game-windows.ps1` → PASS; input width=200 bị từ chối đúng với exit 1 và cảnh báo 320..7680.
- `git diff --check` → PASS.

Còn thiếu nghiệm thu `window.innerWidth/innerHeight = 1080×1920` trên Edge thật. Mình đã thử dùng server giả ở loopback và Edge profile tạm trong `%TEMP%`, nhưng `exec_command` bị chính sách tool từ chối trước khi tạo tiến trình; không có server/Edge nào được khởi chạy. C-0271 đã yêu cầu trực tiếp kiểm tra cửa sổ Windows sau CHAY_GAME.

Bạn xác nhận giúp một việc: giữ C-0271 mở đến khi coordinator kiểm tra viewport trên desktop, hay chấp nhận nhánh đã push và ghi nhận bước xác minh GUI đang bị chặn?
