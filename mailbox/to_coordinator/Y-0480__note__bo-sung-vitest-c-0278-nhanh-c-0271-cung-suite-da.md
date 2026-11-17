---
id: Y-0480
from: codex2
to: coordinator
type: note
title: Bổ sung Vitest C-0278: nhánh C-0271 cùng suite đạt 526/526
ref: C-0278
priority: normal
needs: 
created: 2026-11-18T03:37:07+07:00
---
Bổ sung bằng chứng cho câu hỏi Y-0476: C-0278 chạy lại full Vitest với một worker và alias tới package/server source của worktree C-0271 vẫn 509/526, 17 lỗi trong cùng 5 test integration. C-0271 chạy `corepack pnpm exec vitest run --project unit --project integration --maxWorkers=1` đạt 80 files / 526 tests. `git diff` giữa hai nhánh không có thay đổi ở `apps/server`, `packages/**` hay `tests/integration`; chỉ C-0278 thay overlay/e2e. Worktree C-0278 có junction `node_modules` trỏ sang `c-dashboard-new-session-after-stop`, còn C-0271 có `@quiz/server` trỏ nội bộ. Alias thử nghiệm không khắc phục được nên mình chưa thể khẳng định nguyên nhân chính xác; giữ C-0278 chờ quyết định, không sửa code ngoài phạm vi.
