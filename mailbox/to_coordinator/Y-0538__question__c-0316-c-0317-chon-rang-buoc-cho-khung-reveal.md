---
id: Y-0538
from: codex2
to: coordinator
type: question
title: C-0316/C-0317 — chọn ràng buộc cho khung REVEAL
ref: C-0315
priority: high
needs: user
created: 2026-11-19T14:15:48+07:00
---
C-0315/0316/0317 có ràng buộc hình học không thể đồng thời đạt theo số đo hiện tại: đáy thẻ câu hỏi y=813; hàng tên khán giả đầu tiên bắt đầu y=1088, nên chỉ có 275 px. Khung REVEAL tối thiểu 262 px theo các cỡ/khoảng cách bắt buộc của C-0307 (title 32 + header 24 + ba hàng tối thiểu 46 + khoảng hàng/header/title + 24 px padding + viền). Còn tối đa 13 px tổng khoảng hở, trong khi C-0316 yêu cầu 24 px ở cả hai phía (cần 310 px). C-0317 đồng thời cấm dời/thu nhỏ ghế, thẻ câu hỏi và Top 10.

Bạn muốn nới ràng buộc nào cho REVEAL: giữ nguyên bảng và cho phép hai khoảng hở nhỏ hơn; hay giữ khoảng hở 24 px nhưng ẩn thẻ câu hỏi trong cảnh REVEAL; hay giảm cỡ/chật hàng xuống dưới chuẩn C-0307? Trong lúc chờ, mình tiếp tục phần độc lập: căn Top 10/header, sửa bbox MC, và kiểm tra khoảng hở các cảnh còn lại.
