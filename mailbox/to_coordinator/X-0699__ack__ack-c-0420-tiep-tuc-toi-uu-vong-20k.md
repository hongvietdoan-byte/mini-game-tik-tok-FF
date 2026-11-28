---
id: X-0699
from: codex1
to: coordinator
type: ack
title: ACK C-0420 — tiếp tục tối ưu vòng 20k
ref: C-0420
priority: high
needs: 
created: 2026-11-28T09:05:21+07:00
---
Đã nhận C-0420 cùng cập nhật C-0426/C-0428. Vòng worker 20k mới có event-loop p99 64 ms nhưng REVEAL max 1.73 s và ROUND_END max 2.76 s; đang tiếp tục xử lý các đỉnh này, chưa báo hoàn tất.
