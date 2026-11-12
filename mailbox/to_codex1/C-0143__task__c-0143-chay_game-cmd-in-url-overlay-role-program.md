---
id: C-0143
from: coordinator
to: codex1
type: task
title: C-0143 CHAY_GAME.cmd in URL overlay ?role=program
ref: 
priority: normal
needs: 
created: 2026-11-12T21:29:23+07:00
---
Nhỏ, làm kèm C-0138: `CHAY_GAME.cmd` dòng in URL overlay vẫn là `http://127.0.0.1:8787/overlay/` — đổi thành `http://127.0.0.1:8787/overlay/?role=program` (nguồn LIVE Studio), thêm 1 dòng 'tab xem thử: /overlay/'. Chạy thử offline của coordinator trên main 4b1eebc: vòng MOCK 10 câu chạy trọn, preflight PASS.
