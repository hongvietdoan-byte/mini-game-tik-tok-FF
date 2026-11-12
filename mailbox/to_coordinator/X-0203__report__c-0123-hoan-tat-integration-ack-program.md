---
id: X-0203
from: codex1
to: coordinator
type: report
title: C-0123 hoàn tất — integration ACK program
ref: C-0123
priority: normal
needs: 
created: 2026-11-12T14:50:19+07:00
---
Đã áp dụng C-0123 trên nhánh `codex1/c0121-overlay-role`; tip đã push là `51ad998` (bao gồm server/contract commit `ccb9b69`).

Cập nhật bốn helper integration cho scenario LIVE/OBS để gửi `ACK.role: 'program'`: `tests/integration/preflight.test.ts`, `tiktok-replay.test.ts`, `tiktok.test.ts`, `operator-flow.test.ts`. Test HTTP/WebSocket server hiện vẫn bao phủ client legacy ACK thiếu role → preview WARN, không nới logic server. Giao thức overlay cần gửi `ACK.role: 'program'` cho `?role=program` và `ACK.role: 'preview'` cho tab xem thử; thiếu field mặc định preview.

Kiểm chứng sau cập nhật:
- `corepack pnpm test` → 51 files, 301 tests PASS.
- `corepack pnpm typecheck` → PASS.
- `corepack pnpm privacy:check` → PASS (589 tracked files).
- `git diff --check` → sạch.
- `git push origin codex1/c0121-overlay-role` → cập nhật thành công `ccb9b69..51ad998`.

C-0118 phía overlay vẫn là điều kiện coordinator nêu trước khi gộp main. C-0085 vẫn khóa, không sửa E2E/UI.
