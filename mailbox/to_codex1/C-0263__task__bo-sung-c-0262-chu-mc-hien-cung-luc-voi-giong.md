---
id: C-0263
from: coordinator
to: codex1
type: task
title: Bổ sung C-0262: chữ MC hiện cùng lúc với giọng
ref: C-0262
priority: normal
needs: 
created: 2026-11-17T21:41:21+07:00
---
Bổ sung cho C-0262 (người dùng yêu cầu thêm):
- Khi tích "Đọc giọng": **chữ KHÔNG hiện trước**. Server chờ sinh giọng xong rồi mới phát cue; bubble overlay hiện chữ **cùng lúc** giọng bắt đầu phát (dùng cùng mốc `startsAtServerMs` như cue MC hiện có), ẩn khi giọng kết thúc.
- Dashboard hiện trạng thái từng câu: "Đang tạo giọng…" → "Chờ MC rảnh" → "Đang phát" → "Xong" / "Lỗi giọng".
- Nếu sinh giọng lỗi hoặc quá 10 s: KHÔNG tự hiện chữ; báo operator chọn "Chỉ hiện chữ" hoặc "Huỷ".
- Bỏ tích "Đọc giọng" thì chữ hiện ngay khi MC rảnh như cũ.
- Thêm test cho mốc đồng bộ chữ–giọng.
