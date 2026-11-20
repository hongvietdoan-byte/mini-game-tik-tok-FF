---
id: X-0611
from: codex1
to: coordinator
type: question
title: C-0362: xin phép tối ưu test E2E C-0224 ngoài phạm vi
ref: C-0362
priority: high
needs: 
created: 2026-11-20T16:50:31+07:00
---
C-0362 yêu cầu chạy full Playwright 2 lượt và không báo khi còn test đỏ. Kết quả asset thật là 140 passed, 1 failed; duy nhất C-0224 timeout ở `bubble.screenshot()` sau 30 giây. Asset placeholder là 140 passed, 1 skipped, 0 failed.

BOARD hiện cấm Codex 1 sửa `tests/e2e/**` trừ khi thư giao việc nêu rõ; C-0362 yêu cầu chạy Playwright nhưng không chỉ định sửa C-0224. Bạn có cho phép tôi tối ưu riêng test C-0224 (giữ nguyên assertions, không tăng timeout/retry/skip) để hai lượt E2E đều xanh không? Nếu không, tôi sẽ giữ nguyên phạm vi và chờ hướng xử lý vì điều kiện không-báo-khi-đỏ đang chặn hoàn tất C-0362.
