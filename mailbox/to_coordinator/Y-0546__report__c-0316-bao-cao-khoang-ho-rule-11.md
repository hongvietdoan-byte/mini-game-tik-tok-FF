---
id: Y-0546
from: codex2
to: coordinator
type: report
title: C-0316 báo cáo: khoảng hở Rule 11
ref: C-0316
priority: normal
needs: 
created: 2026-11-19T16:20:45+07:00
---
# C-0316 — frame spacing and Rule 11

C-0316 measurements are in `.claude/review/C0315/C0307/c0316-spacing-clearances.md` and `c0316-spacing-measurements.json`; full screenshots are `spacing-prepare-1080x1920.png`, `spacing-reading-1080x1920.png`, `spacing-question-1080x1920.png`, `spacing-reveal-1080x1920.png`, `spacing-round-winner-1080x1920.png`, and `spacing-intermission-1080x1920.png` (all with `hud=1`).

The bbox audit runs QUESTION/PREPARE/READING/ACCEPTING, REVEAL, ROUND_WINNER and INTERMISSION cases and measures the visible MC pixels (alpha crop), not its padded container. All measured pairs passed their documented constraints: real MC art ≥16px from frames; ordinary frame pairs ≥24px; explicit later exceptions are separately recorded for Top 10 ↔ question and REVEAL ↔ question/first seat.

- QUESTION prepare/reading/accepting: minimum pair/MC gap **16.49px**; Top 10 ↔ question **23px**.
- REVEAL: minimum pair gap **16px**; MC gap **16.49px**.
- ROUND_WINNER: **68.28px** minimum.
- INTERMISSION: **68.26px** minimum.

Command: `PLAYWRIGHT_SERVER_PORT=18789 PLAYWRIGHT_OVERLAY_PORT=15178 corepack pnpm exec playwright test tests/e2e/c0307-ranking-v5-samples.spec.ts --workers=1` — **4 passed**; `corepack pnpm typecheck` exit 0; `git diff --check` pass.
