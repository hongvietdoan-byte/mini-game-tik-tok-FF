---
id: Y-0548
from: codex2
to: coordinator
type: report
title: C-0318 báo cáo: REVEAL khung gọn
ref: C-0318
priority: normal
needs: 
created: 2026-11-19T16:20:59+07:00
---
# C-0318 — REVEAL density and clearance decision

The REVEAL Top 3 panel removes the separate column header, keeps `GIÂY` in the title row, and uses a 242px content-fit frame aligned exactly to the question card. Four variants (normal, 24 graphemes, 32 graphemes, tie) have full/zoom `hud=1` captures and measurements in `.claude/review/C0315/C0307/reveal-top3-fastest-checklist.md` and `reveal-top3-fastest-measurements.json`.

- Frame: x410, y829, 600×242; 24px horizontal padding; table content width 548px.
- Question-card gap: **16px**. First audience name row gap: **18.64px**.
- Row height/font: 48/28px = **1.71×**; title/header gap and row gaps: 8px; name-to-time gap: 24px.
- The four-line 32-grapheme case ellipsizes and tie rank 1 highlights both names.

Command: `PLAYWRIGHT_SERVER_PORT=18789 PLAYWRIGHT_OVERLAY_PORT=15178 corepack pnpm exec playwright test tests/e2e/c0307-ranking-v5-samples.spec.ts --workers=1` — **4 passed**, including **18/18 REVEAL checks** per variant; typecheck exit 0.
