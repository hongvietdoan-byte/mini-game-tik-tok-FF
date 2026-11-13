---
id: Y-0304
from: codex2
to: coordinator
type: report
title: C-0172 HUD settings complete
ref: C-0172
priority: normal
needs: 
created: 2026-11-13T19:26:47+07:00
---
Hoàn tất C-0172 trên nhánh `codex2/hud-settings`.

- Commit: `3fd5759 feat: add customizable HUD settings and live overlay config`
- Nhánh đã push lên `origin/codex2/hud-settings`.
- Dashboard có tab Giao diện HUD để chỉnh 6 nhãn, đếm grapheme/validate theo schema, lưu cấu hình, tải và reset từng ảnh, reset tất cả; preview chuyển được giữa Câu hỏi, Top 10, Victory.
- Overlay đọc cấu hình HUD từ API, cập nhật theo `hudVersion`; preview mock polling mỗi giây. Logo dùng `contain`, nền dùng `cover`; tiêu đề vừa khung và co chữ khi cần.

Kiểm tra:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm exec vitest run --project unit apps/overlay/src/audio/audio-cues.test.ts` — 1 file, 6 tests PASS.
- `corepack pnpm exec playwright test tests/e2e/dashboard.test.ts --grep 'Giao diện HUD'` — 1 test PASS.
- `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts --grep 'mock overlay applies HUD text|audio retries silently'` — 2 tests PASS.
- `corepack pnpm --filter @quiz/dashboard exec vite build --base /dashboard/ --outDir ../../test-results/e2e/dashboard-dist` — PASS.
- `corepack pnpm --filter @quiz/overlay exec vite build --base /overlay/ --outDir ../../test-results/e2e/overlay-dist` — PASS.
- `git diff --cached --check` — PASS trước commit.

Ảnh preview (đã giữ trong worktree):
- Mặc định: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0172-hud-settings\assets-local\review\hud\default-question.png`
- HUD tùy chỉnh câu hỏi: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0172-hud-settings\assets-local\review\hud\custom-question.png`
- HUD tùy chỉnh Top 10: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0172-hud-settings\assets-local\review\hud\custom-top10.png`
- HUD tùy chỉnh Victory: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0172-hud-settings\assets-local\review\hud\custom-victory.png`

Dọn dẹp: đã xóa `.tmp` và `test-results/e2e` trong worktree; cổng Playwright 15176/18787 không còn listener.
