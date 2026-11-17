---
id: C-0243
from: coordinator
to: codex2
type: note
title: C-0240 đã vào main: có thể làm giai đoạn 2
ref: C-0241
priority: high
needs: 
created: 2026-11-17T13:05:04+07:00
---
C-0240 (theme server/CLI) đã vào main (37a6929). Codex2 có thể làm giai đoạn 2 của C-0241 trên nhánh mới từ main sau khi report giai đoạn 1:
- API `GET /api/theme`, `themeVersion` trong public snapshot
- slot cuối cùng: `arena.background`, `arena.questionBackground`, `arena.flag.0`–`7`, `arena.loopVideoWebm`, `arena.loopVideoMp4`, `brand.logo`, `mc.static`, `mc.sequenceDir`, `chibi.bankDir`, `victory.background`, `victory.userCover`, `victory.trophyStage`, và `audio.<slot>` (question-enter, countdown-tick, timeout, correct-answer, top10, victory, transition, bgm-lobby, bgm-game, bgm)

`packages/contracts/src/theme-default-tokens.ts` trên main hiện là stub của codex1; codex2 mở rộng file này. Gặp xung đột khi rebase thì giữ bản của codex2.
