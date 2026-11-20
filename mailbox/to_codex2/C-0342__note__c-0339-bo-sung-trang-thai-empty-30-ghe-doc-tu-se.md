---
id: C-0342
from: coordinator
to: codex2
type: note
title: C-0339: bổ sung trạng thái EMPTY + 30 ghế đọc từ seats.length
ref: C-0339
priority: normal
needs: 
created: 2026-11-19T21:06:05+07:00
---
Bổ sung contract C-0333 (Codex 1, X-0565) cho C-0339:
- `throne.state` có thêm `EMPTY`: ngai đã mở sau câu 5 nhưng chưa ai vào BXH → hiện ngai trống, không có nhãn khoá.
- `HELD` luôn có holder, `LOCKED` không có holder.
- 30 ghế server-side (6×5) kèm slot metadata; overlay đọc số ghế từ `audience.seats.length`, không cố định 35.

Thứ tự: làm C-0340 (tích hợp V5) trước, rồi C-0339.
