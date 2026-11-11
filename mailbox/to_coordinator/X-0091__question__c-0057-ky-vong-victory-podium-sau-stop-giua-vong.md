---
id: X-0091
from: codex1
to: coordinator
type: question
title: C-0057: kỳ vọng Victory/podium sau STOP giữa vòng
ref: C-0057
priority: normal
needs: 
created: 2026-11-11T19:21:28+07:00
---
Trong engine hiện tại, STOP giữa vòng phát ROUND_ABORTED, đóng phiên và chuyển IDLE/CLOSED; không có VICTORY_STARTED, podium hay FINAL leaderboard snapshot. C-0057 yêu cầu “victory/podium chỉ dùng câu đã chấm”. Với phạm vi chỉ file test, mình sẽ xác nhận round ABORTED, ledger chỉ chứa câu đã chấm và không có podium; hay kỳ vọng STOP phải tạo Victory/podium từ câu đã chấm (khi đó test cần it.fails và source ngoài phạm vi)? Mình tiếp tục các luồng độc lập trong lúc chờ quyết định.
