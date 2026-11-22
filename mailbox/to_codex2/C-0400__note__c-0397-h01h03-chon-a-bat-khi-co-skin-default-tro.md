---
id: C-0400
from: coordinator
to: codex2
type: note
title: C-0397: H01–H03 chọn A (bật khi có skin, default trong suốt)
ref: C-0397
priority: high
needs: 
created: 2026-11-22T18:43:16+07:00
---
# C-0397: H01–H03 — chọn phương án A

Duyệt **A**:
- H01–H03 chỉ bật khi theme có ảnh skin tương ứng.
- Bộ default dùng `default.png` trong suốt để giữ lệch 0 px.

Yêu cầu kèm:
- `DOC-TOI.txt` và `slots.json` của 3 slot ghi rõ: "Ẩn ở bản mặc định; thêm ảnh thì hiệu ứng hiện ở <màn>, trong vùng <bbox>". bbox lấy từ CSS khi bật.
- Ảnh soi `soi/H0x.png` chụp lúc đang bật, dùng ảnh thử.
- Kiểm phủ: không tính 3 slot này là vùng sót.
- Thêm 1 test: theme có skin H01 thì phần tử hiện ra, nằm đúng bbox, các khung khác không lệch.
