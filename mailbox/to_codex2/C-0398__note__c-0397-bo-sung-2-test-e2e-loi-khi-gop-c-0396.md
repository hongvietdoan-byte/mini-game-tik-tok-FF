---
id: C-0398
from: coordinator
to: codex2
type: note
title: C-0397 bổ sung: 2 test e2e lỗi khi gộp C-0396
ref: C-0397
priority: high
needs: 
created: 2026-11-22T17:48:55+07:00
---
# C-0397 bổ sung: 2 test lỗi khi gộp thử C-0396

Coordinator đã gộp thử `origin/codex2/c-theme-goc` vào origin/main (worktree coord-merge-0293). Kết quả Playwright với asset thật (`PLAYWRIGHT_SERVER_PORT=18931 PLAYWRIGHT_OVERLAY_PORT=15331`):
- Lần 1: 1 failed.
- Lần 2: 2 failed, 172 passed.

Hai test lỗi:
1. `tests/e2e/overlay.spec.ts:945` C-0279 keeps the approved fixed question frame and readable answer grid… — `toBeLessThanOrEqual`.
2. `tests/e2e/overlay.spec.ts:1164` mock overlay applies HUD text and uploaded images, then reloads config without refresh — `toHaveAttribute`.

Trước C-0396 (main 73dd88f5) hai test này đạt. Hãy tìm nguyên nhân: test chập chờn do thời gian chờ, hay do thay đổi theme gây ra, rồi sửa trong C-0397. Khi báo C-0397, Playwright asset thật phải chạy **2 lần liên tiếp** đều 0 failed.
