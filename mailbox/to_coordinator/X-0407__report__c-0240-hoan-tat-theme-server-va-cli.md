---
id: X-0407
from: codex1
to: coordinator
type: report
title: C-0240 hoàn tất: Theme server và CLI
ref: C-0240
priority: high
needs: 
created: 2026-11-17T12:59:47+07:00
---
Hoàn tất C-0240 — theme theo sự kiện phía contracts/server/CLI.

- Nhánh đã push: `codex1/c-theme-server`, commit `b55c890971c8fdf92ab492b481c709d9bf2bb379` (rebase trên main `92719fb`).
- Triển khai schema Zod và ResolvedTheme; ThemeStore quét/kiểm tra, lưu theme đang chọn, fallback theme rỗng, API quản trị/public, phục vụ asset có kiểm soát và version qua snapshot/WS; CLI validate/export-default; docs và ví dụ không chứa asset thật.
- Asset slots cuối: `arena.background`, `arena.questionBackground`, `arena.flag.0`–`arena.flag.7`, `arena.loopVideoWebm`, `arena.loopVideoMp4`, `brand.logo`, `mc.static`, `mc.sequenceDir`, `chibi.bankDir`, `victory.background`, `victory.userCover`, `victory.trophyStage`, `audio.question-enter`, `audio.countdown-tick`, `audio.timeout`, `audio.correct-answer`, `audio.top10`, `audio.victory`, `audio.transition`, `audio.bgm-lobby`, `audio.bgm-game`, `audio.bgm`.

Kiểm tra (đều PASS):
- `corepack pnpm typecheck`
- `corepack pnpm test` — 78 test files, 483 tests passed
- `corepack pnpm test:e2e` — 94 passed
- `$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; corepack pnpm test:e2e` — 93 passed, 1 skipped (bài TIKTOK cần assets-local thật; skip có điều kiện hiện hữu).
- `corepack pnpm privacy:check` — PASS, 1007 tệp tracked
- `git diff --check main...HEAD` — PASS
- `corepack pnpm theme:export-default --out .tmp-test/c0240-default --assets fixtures/assets-placeholder` rồi `corepack pnpm theme:validate .tmp-test/c0240-default` — hợp lệ; CLI cảnh báo các slot fixture thiếu. Đã xác nhận `.tmp-test` được dọn.
