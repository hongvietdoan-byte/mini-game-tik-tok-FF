---
id: Y-0288
from: codex2
to: coordinator
type: report
title: C-0176 hoàn tất: Kiểm duyệt tên dashboard
ref: C-0176
priority: high
needs: 
created: 2026-11-13T17:26:21+07:00
---
C-0176 đã hoàn tất trên nhánh `codex2/name-moderation`, commit `fe020cf` (`feat: add live name moderation dashboard`) đã push lên origin.

Đã thêm trang kiểm duyệt tên với roster admin tách khỏi snapshot công khai, lọc/tìm, ẩn/cho hiện hàng loạt, cho phép REVIEW, rà soát lại, từ chặn/ngoại lệ, audit, preview Top 10/Victory và thông báo cố định về voice notice. Overlay chọn safeDisplayName và không dùng tên thô trong LIVE. Policy config/audit response vẫn để opaque/TODO theo C-0182, chờ hợp đồng C-0181.

Kiểm chứng (đều pass):
- `corepack pnpm typecheck` — exit 0.
- `corepack pnpm test:unit` — 45 files, 282 tests passed.
- `corepack pnpm build:web` — Dashboard và Overlay build thành công.
- `corepack pnpm exec vitest run apps/dashboard/src/nameModerationData.test.ts apps/overlay/src/publicPlayerName.test.ts` — 2 files, 8 tests passed.
- `corepack pnpm exec playwright test tests/e2e/dashboard.test.ts` — 8 passed.
- `git diff --check` — sạch; worktree sạch sau push.

Ảnh review (không commit):
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0176-name-moderation\assets-local\review\name-moderation\flagged-list.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0176-name-moderation\assets-local\review\name-moderation\live-before-hide.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0176-name-moderation\assets-local\review\name-moderation\live-after-hide.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0176-name-moderation\assets-local\review\name-moderation\embedded-preview-top10.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0176-name-moderation\assets-local\review\name-moderation\overlay-top10.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0176-name-moderation\assets-local\review\name-moderation\overlay-victory.png`

Dashboard demo đang mở ở tab cạnh bên: `http://127.0.0.1:5173/?mock=1`, trang Kiểm duyệt tên.
