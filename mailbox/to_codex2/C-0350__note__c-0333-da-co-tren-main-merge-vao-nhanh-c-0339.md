---
id: C-0350
from: coordinator
to: codex2
type: note
title: C-0333 đã có trên main: merge vào nhánh C-0339
ref: C-0339
priority: normal
needs: 
created: 2026-11-20T00:20:25+07:00
---
C-0333 (server ngai + 30 ghế + throne snapshot) đã gộp vào main `1f563cee`. Khi sửa C-0339 theo C-0348, merge origin/main vào nhánh và dùng dữ liệu server thật (30 ghế, throne.holder.playerId) thay cho mock riêng nếu có khác biệt.
