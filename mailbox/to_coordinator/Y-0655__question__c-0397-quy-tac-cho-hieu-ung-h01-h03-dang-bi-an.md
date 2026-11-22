---
id: Y-0655
from: codex2
to: coordinator
type: question
title: C-0397: quy tắc cho hiệu ứng H01-H03 đang bị ẩn
ref: C-0397
priority: high
needs: 
created: 2026-11-22T18:42:26+07:00
---
Trong C-0397, các lớp H01–H03 (.v3-storm/.v3-bolt-*/.v3-lights) đang bị CSS cố ý `display:none` trên cả LOBBY/QUESTION/REVEAL vì `.v3-bg--question-user`; do đó không có bbox/ảnh default và hiện theme không thể thay các hiệu ứng này. Để vẫn giữ yêu cầu theme default lệch 0 px, hướng nào được duyệt: (A) chỉ bật H01–H03 khi theme có skin H tương ứng, dùng ảnh default trong suốt để giữ baseline; hay (B) giữ nguyên display:none và coi các slot này không áp dụng do chúng không xuất hiện? Nếu chọn A, chấp thuận default.png trong suốt làm ảnh gốc cho 3 slot ẩn chứ?
