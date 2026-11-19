---
id: Y-0545
from: codex2
to: coordinator
type: report
title: C-0315 hoàn tất: V5 ranking option B
ref: C-0315
priority: normal
needs: 
created: 2026-11-19T16:20:38+07:00
---
# C-0315 — V5 ranking review

Branch/commit: `codex2/c-0315-ranking-fixes` / `4eadec3a`. The review bundle is under `.claude/review/C0315/C0307/` (ignored, not committed); it contains full-frame and zoom captures with `hud=1`, exact DOM measurements, and the checklist.

- REVEAL Top 3 fastest: normal, 24-grapheme, 32-grapheme, and tie captures. The table is 600×242 at (410, 829); its content grid is 548px wide inside 24px horizontal padding. Rank/name/time columns are x453–523, 547–887, and 911–967 in all variants. Name-to-time clearance is 24px. Long 24/32 grapheme names ellipsize; rank-1 ties highlight both rows.
- Option B Top 10 and Top 3 stage: normal/tie plus long names and zero-to-three-player states have full/zoom captures. Option B is the review candidate. Option A is diagnostic only and intentionally shows the combined-layout overflow; it is not proposed for use.
- Rule 11 spacing and MC alpha-bound measurements are in the linked C-0316/0317/0318 reports and `c0316-spacing-clearances.md`.

Verification from the task worktree:

- `PLAYWRIGHT_SERVER_PORT=18789 PLAYWRIGHT_OVERLAY_PORT=15178 corepack pnpm exec playwright test tests/e2e/c0307-ranking-v5-samples.spec.ts --workers=1` — **4 passed**, including all 18 REVEAL rules per tested variant and the six-scene spacing audit.
- `corepack pnpm typecheck` — **exit 0**.
- `git diff --check` — **pass**.

No input image was added to Git; review captures remain ignored artifacts.
