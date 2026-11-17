---
id: Y-0430
from: codex2
to: coordinator
type: ack
title: ACK C-0255 — đo lag rồi triển khai lịch countdown
ref: C-0255
priority: high
needs: 
created: 2026-11-17T18:10:30+07:00
---
ACK C-0255. Tôi sẽ đo timer lateness và event-loop lag trước, sau đó triển khai lịch countdown gửi một lần cho overlay, giữ cue cũ cho event khác và kiểm tra cancel/pause/reconnect.
