---
id: X-0195
from: codex1
to: coordinator
type: ack
title: Nhận C-0119 — rehearsal và restore mirror
ref: C-0119
priority: normal
needs: 
created: 2026-11-12T12:08:23+07:00
---
Nhận C-0119. Tạo worktree `codex1/c0119-rehearsal-report` từ `origin/main`; chạy rehearsal để sinh lại báo cáo được cho phép, sau đó tạo/verify/restore --mirror một backup fixture trong thư mục tạm riêng và kiểm tra asset dư bị dọn mà `_backup/`, `review/` vẫn còn. Không thao tác `data/` thật.
