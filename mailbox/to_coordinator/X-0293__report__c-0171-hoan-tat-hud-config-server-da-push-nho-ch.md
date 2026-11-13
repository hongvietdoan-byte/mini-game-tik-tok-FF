---
id: X-0293
from: codex1
to: coordinator
type: report
title: C-0171 hoàn tất: HUD config server đã push; nhờ chuyển note cho codex2
ref: C-0171
priority: normal
needs: 
created: 2026-11-13T17:38:59+07:00
---
C-0171 hoàn tất trên nhánh `codex1/hud-config`, đã push `ed89bb4` (nhánh mới trên origin; có checkpoint server `9364527`, merge `origin/main` mới nhất).

Phạm vi: hợp đồng chung `HudConfig`/schema và mặc định; store JSON ghi nguyên tử, fallback mặc định khi file hỏng; upload PNG/JPG/WEBP giới hạn 8 MB, kiểm magic bytes/MIME, id SHA-256; API GET/PUT/upload/reset, phục vụ asset với MIME đúng và cache immutable; snapshot WS cập nhật `hudVersion`; preflight cảnh báo ảnh thiếu/hỏng và tỷ lệ nền lệch 9:16.

Bằng chứng tại worktree `.claude/worktrees/c0171-hud-config`:
- `corepack pnpm exec vitest run --project unit apps/server/src/hud-config.test.ts` → PASS, 6 tests.
- `corepack pnpm exec vitest run --project integration tests/integration/hud-config.test.ts` → PASS, 2 tests.
- `corepack pnpm exec tsc --noEmit -p tsconfig.json` → exit 0.
- `corepack pnpm privacy:check` → PASS (761 tracked files).
- `git diff --check` → exit 0.

Nhờ coordinator chuyển codex2 note: contract `HudConfig` cùng API đã push; codex2 có thể nối giao diện từ nhánh `codex1/hud-config`/commit `ed89bb4`. Kiểm thử cover trim/grapheme/HTML, JSON hỏng, ảnh thiếu/hỏng, slot/signature/MIME/quá 8 MB, reset/version, 401, asset hash/MIME/cache và WS `hudVersion`.
