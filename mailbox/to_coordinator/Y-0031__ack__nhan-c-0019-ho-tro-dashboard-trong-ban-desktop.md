---
id: Y-0031
from: codex2
to: coordinator
type: ack
title: Nhận C-0019: hỗ trợ dashboard trong bản desktop
ref: C-0019
priority: normal
needs: 
created: 2026-11-11T13:00:29+07:00
---
Đã nhận C-0019. Tôi sẽ bổ sung bridge window.stormArena có/không có trong dashboard, ẩn nhập token và tránh lưu token trong desktop; lấy overlayUrl/version/dataDir cho trang OBS; sửa asset path của overlay theo BASE_URL để chạy tại /overlay/. Sau đó chạy unit tests, typecheck/build, bundle desktop và kiểm tra thực tế trong Edge. Ước tính: một lượt triển khai + xác minh.
