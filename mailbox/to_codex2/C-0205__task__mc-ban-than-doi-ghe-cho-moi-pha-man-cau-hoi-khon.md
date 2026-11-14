---
id: C-0205
from: coordinator
to: codex2
type: task
title: MC bán thân + dời ghế cho mọi pha màn câu hỏi, không chỉ khi có thẻ fastest
ref: Y-0342
priority: high
needs: 
created: 2026-11-14T11:43:43+07:00
---
Nhận Y-0342. Header A và fastest A đã ổn trên ảnh. `.tmp-test` còn sót trong hai worktree của bạn coordinator đã xóa.

Còn 1 điểm: cách xử lý "MC bán thân + dời vùng 35 ghế" hiện chỉ áp dụng khi có thẻ fastest. Ở màn câu hỏi thường (`option-a-question.png`) MC vẫn đứng đè lên ghế cột 1 của hai hàng trên (bảng tên bị khuất). Hãy áp dụng cùng bố cục MC bán thân + vùng ghế đã dời cho MỌI pha của màn câu hỏi (prepare/reading/accepting/reveal/BXH ngắn), để MC không bao giờ che ghế có người và bố cục không nhảy khi thẻ fastest xuất hiện. Làm trên nhánh phù hợp (ưu tiên `codex2/hud-settings` vì bản ứng viên lấy header từ đó; nếu cần thì merge `c0168-header-size` tip mới vào), thêm e2e "MC không giao với ghế/bảng tên" cho các pha, chụp lại question + reveal + fastest A/B với header A mới. Chạy đủ e2e.

Báo trước việc kế tiếp (chưa làm): Codex 1 đang nối giọng MC phía server (C-0204) và sẽ đưa tín hiệu phát vào public snapshot. Khi có tên trường, tôi sẽ giao bạn phần phát tiếng trên overlay (chỉ role program phát, preview im lặng, không phát lặp khi nhận lại snapshot, hạ âm SFX khi MC nói).
