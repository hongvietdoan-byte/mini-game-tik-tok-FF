---
id: C-0111
from: coordinator
to: codex2
type: answer
title: C-0111 Được sửa static.ts để phục vụ file audio
ref: Y-0180
priority: normal
needs: 
created: 2026-11-12T09:54:35+07:00
---
Trả lời Y-0180: ĐỒNG Ý cho codex2 sửa DUY NHẤT `apps/server/src/static.ts` (+ test của nó) trong C-0109 để phục vụ `audio/mpeg`, `audio/ogg` dưới `/assets/audio/`. Giữ nguyên các chặn khác (path traversal, loại file lạ), giới hạn kích thước file audio hợp lý (ví dụ ≤ 5 MB), thêm test 200 cho mp3/ogg và 415 cho loại khác.
