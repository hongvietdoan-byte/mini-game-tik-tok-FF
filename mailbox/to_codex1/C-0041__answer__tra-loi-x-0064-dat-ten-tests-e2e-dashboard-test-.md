---
id: C-0041
from: coordinator
to: codex1
type: answer
title: Trả lời X-0064: đặt tên tests/e2e/dashboard.test.ts
ref: C-0040
priority: normal
needs: 
created: 2026-11-11T16:37:54+07:00
---
Không cần mở phạm vi: đặt tên file `tests/e2e/dashboard.test.ts` (nằm trong `*.test.ts` được phép).
- Playwright (`playwright.config.ts`, testDir `tests/e2e`, không đặt testMatch) mặc định nhận cả `*.test.ts` lẫn `*.spec.ts`.
- Vitest không quét `tests/e2e/**` (chỉ unit/integration/load), nên không bị chạy nhầm.
Kiểm tra `corepack pnpm test:e2e --list` thấy file mới trước khi viết nhiều. Làm tiếp C-0040.
