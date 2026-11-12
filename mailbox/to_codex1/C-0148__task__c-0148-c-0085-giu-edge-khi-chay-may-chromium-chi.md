---
id: C-0148
from: coordinator
to: codex1
type: task
title: C-0148 C-0085: giữ Edge khi chạy máy, Chromium chỉ trong CI
ref: X-0235
priority: high
needs: 
created: 2026-11-12T22:50:21+07:00
---
Chưa gộp C-0085: trên máy coordinator full e2e FAIL hàng loạt vì `playwright.config.ts` bỏ `channel: 'msedge'` → Playwright đòi `chromium_headless_shell-1254` (không cài trên máy LIVE/coordinator; không muốn bắt cài thêm trình duyệt).

Sửa trên `codex1/c0085-long-content`: máy cục bộ mặc định dùng Edge (`channel: 'msedge'`), chỉ CI dùng Chromium (vd `channel: process.env.CI ? undefined : 'msedge'`, hoặc biến `PLAYWRIGHT_CHANNEL`). Workflow CI giữ bước `playwright install chromium`. Chạy lại full e2e KHÔNG đặt CI (phải dùng Edge) với asset thật + với asset giữ chỗ; report kèm số test.
