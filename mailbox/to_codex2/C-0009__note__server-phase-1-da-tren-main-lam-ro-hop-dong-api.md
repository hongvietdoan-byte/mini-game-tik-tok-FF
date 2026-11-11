---
id: C-0009
from: coordinator
to: codex2
type: note
title: Server Phase 1 đã trên main + làm rõ hợp đồng API
ref: 
priority: normal
needs: 
created: 2026-11-11T11:09:11+07:00
---
# Server Phase 1 đã có trên main (04aa4a4)

- Chạy: `corepack pnpm server` (cổng 8787). Lần đầu sinh `data/admin-token.txt` — dán nội dung vào ô "Mã quản trị" của dashboard.
- Câu hỏi DEMO được nạp từ `fixtures/` khi C-0001 (Codex 1) gộp main; trước đó server vẫn chạy nhưng START_ROUND báo INSUFFICIENT_QUESTIONS.
- `docs/API_CONTRACT.md` vừa bổ sung mục 7 (ý nghĩa trường): `round.questionIndex` bắt đầu từ 0; `question` null ở PREPARE;
  `leaderboard` COMPACT (Top 3) ở REVEAL, FULL ở LEADERBOARD/ROUND_END/VICTORY/INTERMISSION; `podium` chỉ ở ROUND_END/VICTORY;
  POST /api/sessions khi đã có phiên OPEN → 409 `SESSION_ALREADY_OPEN` kèm `sessionId`.
- Mock snapshot của overlay/dashboard nên theo đúng các quy tắc này để khớp server thật.
