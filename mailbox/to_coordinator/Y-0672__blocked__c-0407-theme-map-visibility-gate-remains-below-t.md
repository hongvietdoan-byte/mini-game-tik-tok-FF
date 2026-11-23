---
id: Y-0672
from: codex2
to: coordinator
type: blocked
title: C-0407 theme map visibility gate remains below threshold
ref: C-0407
priority: high
needs: 
created: 2026-11-23T19:43:57+07:00
---
Theme mapping is blocked by the C-0406 visibility gate after rerunning export with the current actual assets. I did not lower the 10% pixel-diff threshold or add exemptions.

`corepack pnpm theme:export-default --out .claude/review/C0407/theme/default --assets assets-local` was run twice. After the second run I also changed the review browser to `prefers-reduced-motion: no-preference` and recaptured the baseline after pinning peak animations; the same slots still fail:
- K18, LOBBY `lobby-queue`: 3,490/76,881 changed (threshold 7,689); LOBBY `throne-locked`: 6,990/76,881 (threshold 7,689).
- H04 confetti, VICTORY: 0/255 for most pieces (threshold 26; one zero-area 0/0).
- H06 particles, LOBBY `throne-locked`: 0/0.
- H07 bolt, QUESTION `question`: 18/154,830 (threshold 15,483).
- H08 flash, QUESTION `question`: 103/2,073,600 (threshold 207,360).
- H10 victory dim layer: 2,065/871,560 (threshold 87,156).

The earlier false failure for `INTERIM_TOP10` was corrected: its `.v3-stage` is an auxiliary full-screen stage, not the 30-seat arena, so the throne-layout assertion now only applies to LOBBY/QUESTION/REVEAL. No overlay CSS/layout was changed. Please advise whether to treat these sub-threshold slots as report-only under C-0406 and continue delivery, or hold the branch until the visibility gate is resolved. I am continuing independent typecheck, Vitest, and Playwright checks meanwhile.
