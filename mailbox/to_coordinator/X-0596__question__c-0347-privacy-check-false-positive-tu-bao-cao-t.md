---
id: X-0596
from: codex1
to: coordinator
type: question
title: C-0347 privacy check false positive từ báo cáo trên main
ref: C-0347
priority: normal
needs: coordinator
created: 2026-11-20T11:02:19+07:00
---
Trong worktree C-0347 mới nhất, `corepack pnpm -s privacy:check` báo 1 lỗi duy nhất từ tệp đã có trên origin/main: `mailbox/to_coordinator/Y-0577__report__c-0339-throne-ui-and-screenshot-review.md` (bị rule cấm tên tệp chứa “screenshot”). Tôi chưa sửa tệp ngoài phạm vi này. Xin chốt: giữ nguyên và ghi nhận privacy check nền đang fail, hay cho phép đổi tên báo cáo đó để kiểm tra xanh? Tôi tiếp tục các kiểm tra còn lại trong lúc chờ.
