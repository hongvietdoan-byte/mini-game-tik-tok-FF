---
id: Y-0577
from: codex2
to: coordinator
type: report
title: C-0339 throne UI and screenshot review
ref: C-0339
priority: normal
needs: 
created: 2026-11-20T00:05:12+07:00
---
# C-0339: Throne / Victory UI, screenshot review pending

Implementation is complete on codex2/c-0339-throne-ui, commit 34e5fa2a (feat(overlay): add throne and victory mock scenes). Branch has been pushed to origin. C-0339 remains open until the coordinator approves the screenshot set as required by the task.

## Scope
- Added throne state and mock scenes for locked lobby/question, held, empty, holder change, and tied Top10/Victory. Existing non-throne mocks retain 35 audience seats; throne scenes use 30 and exclude the holder from audience seating.
- Added throne holder/score display and top 1-3 role assets; handled tied ranks and vertical 1080x1920 layout.
- Added only the 9 exact placeholder asset paths to the privacy allowlist and related test per C-0346.
- Added Playwright coverage for states, identity, transitions, ties, bounds, typography, and assets.

## Verification
- corepack pnpm typecheck - PASS.
- corepack pnpm privacy:check - PASS, 1359 files.
- corepack pnpm exec vitest run scripts/privacy-check.test.ts - PASS, 12 tests.
- corepack pnpm exec playwright test tests/e2e/c0339-throne-ui.spec.ts - PASS, 3 tests (QUIZ_ASSETS_DIR=fixtures/assets-placeholder; server 18797; overlay 15186).
- Regression Playwright for C-0339 plus c0197-fastest-correct, c0207-fixed-layout, c0258-zero-score-ranking, and c0295-top-row-seating - PASS, 14 tests. C-0339 spec was rerun after the final CSS/DOM changes.
- corepack pnpm test:unit - 524/525 pass; the full suite had a timing failure in apps/server/src/voice/mc-chat.test.ts. Isolated corepack pnpm exec vitest run apps/server/src/voice/mc-chat.test.ts - PASS, 6 tests.

## Screenshots for review
Full 1080x1920 and detail images:
- Locked lobby: full tests/e2e/__screenshots__/c0339-review/throne-locked-1080x1920.png, detail tests/e2e/__screenshots__/c0339-review/throne-locked-detail.png
- Locked question: full tests/e2e/__screenshots__/c0339-review/throne-locked-question-1080x1920.png, detail tests/e2e/__screenshots__/c0339-review/throne-locked-question-detail.png
- Held: full tests/e2e/__screenshots__/c0339-review/throne-held-1080x1920.png, detail tests/e2e/__screenshots__/c0339-review/throne-held-detail.png
- Empty: full tests/e2e/__screenshots__/c0339-review/throne-empty-1080x1920.png, detail tests/e2e/__screenshots__/c0339-review/throne-empty-detail.png
- Holder change: full tests/e2e/__screenshots__/c0339-review/throne-change-1080x1920.png, detail tests/e2e/__screenshots__/c0339-review/throne-change-detail.png
- Tied Top10: full tests/e2e/__screenshots__/c0339-review/throne-tie-top10-1080x1920.png, detail tests/e2e/__screenshots__/c0339-review/throne-tie-top10-detail.png
- Tied Victory: full tests/e2e/__screenshots__/c0339-review/throne-tie-victory-1080x1920.png, detail tests/e2e/__screenshots__/c0339-review/throne-tie-victory-detail.png

Please review the screenshots and send any requested changes. I will mark C-0339 complete after approval.
