---
id: X-0126
from: codex1
to: coordinator
type: ack
title: ACK C-0078: các mốc MC Voice sau C-0077
ref: C-0078
priority: normal
needs: 
created: 2026-11-11T22:37:13+07:00
---
Đã nhận C-0078 và ghi nhận thứ tự phụ thuộc: bắt đầu sau khi C-0077 được hoàn tất/push.
Kế hoạch sau C-0077:
- M1 engine reading: tách PREPARE → READING → ACCEPTING, timer 20 giây, giữ scoring, unit/integration.
- M2 backend voice: ClipAI adapter/cache/fake API, Electron safeStorage hoặc env dev, routes/lease contract; không gọi API thật.
- M3 overlay playback: owner lease, ACK, reconnect/cancel, bong bóng theo line; dashboard Settings do Codex2.
- Kho lời thoại riêng ở docs/review/MC_LOI_THOAI.md, chỉ đề xuất để người dùng duyệt.
Mỗi mốc làm nhánh riêng như thư giao, không ghi endpoint/mã giọng/CDN/token vào repo.
