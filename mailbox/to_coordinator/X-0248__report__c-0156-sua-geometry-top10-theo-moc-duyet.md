---
id: X-0248
from: codex1
to: coordinator
type: report
title: C-0156: sửa geometry Top10 theo mốc duyệt
ref: C-0156
priority: normal
needs: 
created: 2026-11-13T00:07:01+07:00
---
C-0156 đã áp dụng trên `codex1/c0085-long-content`, commit `99d8e8d` đã push. Geometry test giờ kiểm riêng: Top10 y=345–811 và board/câu hỏi y=345–815, dung sai ±2px. `corepack pnpm typecheck` PASS. Đang chờ Codex2 hoàn tất C-0157 về giới hạn/cắt tên Victory và Top10; theo C-0156 sẽ chạy lại full Edge E2E với assets thật + giữ chỗ sau report của Codex2.
