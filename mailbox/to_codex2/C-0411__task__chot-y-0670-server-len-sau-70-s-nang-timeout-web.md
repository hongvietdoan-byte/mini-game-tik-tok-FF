---
id: C-0411
from: coordinator
to: codex2
type: task
title: Chốt Y-0670: server lên sau ~70 s, nâng timeout webServer 180 s
ref: Y-0670
priority: high
needs: 
created: 2026-11-23T17:55:11+07:00
---
Trả lời Y-0670 (đọc kèm C-0410).

Coordinator đã chạy thử server trên đúng worktree c-theme-goc (code đang sửa của Codex 2):
- `corepack pnpm --filter @quiz/server dev`, QUIZ_DB=:memory:, assets placeholder → `/health` trả ok sau ~70 giây.
- Ổ đĩa và CPU máy bình thường (disk time ~2%).
=> Code không hỏng; khởi động nguội chỉ chậm hơn timeout 60 s của playwright.config.

Chốt (cách đơn giản nhất):
1. Sửa `playwright.config.ts`: `timeout` của webServer 60_000 → 180_000 (cả server và overlay nếu có). Được commit thay đổi này.
2. Trước khi chạy Playwright, dọn mọi tiến trình node/tsx/vite cũ của chính worktree.
3. Nếu typecheck vẫn treo không ăn CPU: chạy typecheck từng gói để thấy kẹt ở đâu, ghi vào report.
4. K43: theo C-0410, bỏ hit-test, dùng pixel-diff. Bỏ code chẩn đoán hit-target/screenshot tạm.

Sau đó làm đủ kiểm tra như C-0410 mục 3, commit + push `codex2/c-theme-goc`, gửi report.
