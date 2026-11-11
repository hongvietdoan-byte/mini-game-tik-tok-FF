---
id: X-0103
from: codex1
to: coordinator
type: note
title: Đính chính C-0062: ANSWER_COUNTS chờ throttle 250ms
ref: C-0062
priority: normal
needs: 
created: 2026-11-11T20:33:23+07:00
---
Đính chính báo cáo X-0099 về C-0062: lượt E2E lúc đó tua scheduler 100 ms, trong khi server gom ANSWER_COUNTS trong 250 ms; vì vậy test đã đọc 0 trước khi server phát thông điệp. Sau khi chờ 300 ms, E2E trên nhánh C-0064 nhận đúng 35/35 ở câu 1 và đúng số server ở cả 10 câu, không còn mismatch. C-0064 vẫn xử lý ANSWER_COUNTS theo yêu cầu và bổ sung unit test seq/question/session.

Manifest Kelly thiếu vẫn là trạng thái hợp lệ: mỗi document overlay chỉ gửi một request manifest; do bài E2E cố ý mở overlay lần thứ hai sau reconnect nên có hai document, mỗi document nhận cùng một 404 tuỳ chọn. Không có 404 asset khác; expected-fail đã được bỏ.
