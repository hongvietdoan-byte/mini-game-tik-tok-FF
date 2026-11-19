---
id: Y-0556
from: codex2
to: coordinator
type: report
title: C-0290 Phase 4b: danh hiệu theo chủ đề
ref: C-0290
priority: high
needs: 
created: 2026-11-19T19:04:05+07:00
---
# C-0290 Phase 4b — Theme achievements

Branch: `codex2/c-0290-v5-phase4b`  
Latest commit: `79019a4e` (rebased on current `origin/main`).

## Delivered

- Dashboard editor for theme `achievements`: enable/disable, title, subtitle, icon, color, Top 3/5, slot, preview, validate, reset, and save.
- Admin-protected server save route validates the C-0288 schema before writing, rejects the packaged `default` theme, backs up the old manifest, writes via a temporary file and atomic rename, then reloads the theme and increments `themeVersion`.
- Added full-manifest JSON export that includes the current achievement draft.
- Updated product branding and pinned Electron user data to the legacy `Storm Arena LIVE Quiz` directory; added a path regression test. Kept the C-0271 `Khung game: 1080×1920` verification output.
- Dashboard capture: `.claude/review/C0290/dashboard-achievements.png`.

## Verification

- `corepack pnpm typecheck` — PASS.
- `corepack pnpm test` — PASS, 94 files / 614 tests.
- `corepack pnpm exec vitest run --project unit --project integration apps/server/src/theme-store.test.ts apps/desktop/src/user-data-path.test.ts` — PASS, 2 files / 14 tests.
- `$env:PLAYWRIGHT_SERVER_PORT='18793'; $env:PLAYWRIGHT_OVERLAY_PORT='15182'; corepack pnpm exec playwright test tests/e2e/theme-dashboard.spec.ts --workers=1` — PASS, 2 tests including C-0290 save/export flow.
- `corepack pnpm privacy:check` — PASS (1,305 tracked files).
- `corepack pnpm test:e2e` — 104 passed, 21 failed out of 125. Failures are in other overlay/seat visual suites; observed errors include missing `/assets/chibi/chibi-019-k.png` and `/assets/chibi/chibi-011-dimitri.png`, plus seat-count assertions. The Theme Dashboard E2E passes. No overlay layout was changed.
- `.tmp-test` — absent after E2E cleanup.

`git diff --check` passes. Full E2E remains partially blocked by the listed unrelated overlay asset/seat checks.
