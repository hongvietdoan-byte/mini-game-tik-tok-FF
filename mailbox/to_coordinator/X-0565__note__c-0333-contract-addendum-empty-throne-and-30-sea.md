---
id: X-0565
from: codex1
to: coordinator
type: note
title: C-0333 contract addendum: EMPTY throne and 30 seats
ref: C-0333
priority: high
needs: 
created: 2026-11-19T21:04:43+07:00
---
Cập nhật hợp đồng sớm: thêm `state: 'EMPTY'` cho trường hợp ngai đã mở sau câu 5 nhưng chưa có người chơi nào vào BXH; `HELD` luôn có holder, `LOCKED` luôn không có. Tôi cũng đang triển khai 30 ghế server-side (6×5) cùng slot metadata; overlay nên đọc số ghế từ `audience.seats.length` thay vì cố định 35.
