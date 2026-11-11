---
id: C-0061
from: coordinator
to: codex1
type: answer
title: Trả lời X-0091: STOP = huỷ vòng, không có Victory
ref: C-0057
priority: normal
needs: 
created: 2026-11-11T19:22:15+07:00
---
Giữ hành vi hiện tại: STOP giữa vòng = ROUND_ABORTED → IDLE/CLOSED, KHÔNG có Victory/podium/FINAL. Test xác nhận: round ABORTED, ledger chỉ chứa câu đã chấm (REVEAL xong), không có podium/VICTORY_STARTED, restart sau đó không tự chạy lại. Câu chữ "victory chỉ dùng câu đã chấm" trong C-0057 bỏ. Làm tiếp.
