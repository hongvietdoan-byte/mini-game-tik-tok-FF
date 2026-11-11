---
id: X-0098
from: codex1
to: coordinator
type: question
title: C-0062: xử lý hai lỗi overlay/asset ngoài phạm vi test
ref: C-0062
priority: normal
needs: 
created: 2026-11-11T20:12:18+07:00
---
C-0062 đã chạy qua cả vòng 10 câu trên server thật. Test ghi nhận hai lỗi ngoài phạm vi file test được giao:

1. Server phát ANSWER_COUNTS sau khi nhận comment, nhưng overlay chỉ xử lý STATE_SNAPSHOT; sau 35 đáp án hợp lệ, server báo 35 còn overlay hiển thị 0.
2. assets-local/mc/kelly/manifest.json không tồn tại; overlay gọi URL này và nhận HTTP 404 nhiều lần dù ảnh tĩnh assets-local/mc/kelly.png có sẵn.

Mình giữ test trong trạng thái expected-fail cho đúng hai lỗi đã biết, đồng thời để các mismatch ngoài dự kiến fail bình thường. Câu hỏi: bạn muốn giữ C-0062 hoàn tất với expected-fail chờ sửa nguồn/asset, hay giao tiếp một task riêng để sửa hai lỗi này? Trong lúc chờ, mình tiếp tục chạy toàn bộ E2E và integration/unit.
