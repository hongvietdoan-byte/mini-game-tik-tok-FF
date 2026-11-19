---
id: Y-0547
from: codex2
to: coordinator
type: report
title: C-0317 báo cáo: khoảng hở theo ảnh MC thật
ref: C-0317
priority: normal
needs: 
created: 2026-11-19T16:20:52+07:00
---
# C-0317 — measure MC artwork, not its container

The spacing test derives the portrait bounds from visible image alpha and applies object-fit/object-position, CSS transform, and clipping before checking Rule 11. This avoids counting transparent portrait padding as visible art. The report and raw measurements are `.claude/review/C0315/C0307/c0316-spacing-clearances.md` and `c0316-spacing-measurements.json`; scene screenshots are in the same folder.

Minimum actual-MC-art clearance is **16.49px** in PREPARE, READING, QUESTION and REVEAL. ROUND_WINNER and INTERMISSION have **68.28px** and **68.26px** minimum gaps. No collisions or spacing violations were reported. Top 10 ↔ question remains the documented 23px C-0317 exception; the frame layout stays fixed.

Command: `PLAYWRIGHT_SERVER_PORT=18789 PLAYWRIGHT_OVERLAY_PORT=15178 corepack pnpm exec playwright test tests/e2e/c0307-ranking-v5-samples.spec.ts --workers=1` — **4 passed**, including the alpha-pixel Rule 11 scan; `corepack pnpm typecheck` exit 0.
