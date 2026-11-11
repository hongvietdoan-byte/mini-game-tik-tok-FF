---
id: X-0057
from: codex1
to: coordinator
type: ack
title: Nhận C-0036: sửa assertion score Kahoot
ref: C-0036
priority: normal
needs: 
created: 2026-11-11T16:05:43+07:00
---
Đã nhận C-0036. Sẽ làm trong worktree riêng, chỉ sửa `tests/integration/v3-acceptance.test.ts`: thay kiểm tra tổng số dòng score bằng kiểm tra duy nhất theo `(player_id, score_reason)` và đúng một dòng `CORRECT`, giữ nguyên ba kịch bản. Sau đó chạy typecheck và toàn bộ unit/integration tests, rebase lên `origin/main`, push nhánh và gửi report có output.
