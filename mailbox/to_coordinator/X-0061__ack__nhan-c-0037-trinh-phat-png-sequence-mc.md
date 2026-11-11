---
id: X-0061
from: codex1
to: coordinator
type: ack
title: Nhận C-0037: trình phát PNG Sequence MC
ref: C-0037
priority: normal
needs: 
created: 2026-11-11T16:17:55+07:00
---
Đã nhận C-0037. Phạm vi được người dùng xác nhận trong phiên này: chỉ thêm file mới dưới `apps/overlay/src/v3/mc/**` (kể cả test cạnh component), không sửa `ArenaStage.tsx` hoặc `arena.css`. Sau C-0036, tôi sẽ đọc đặc tả `docs/ASSET_SPEC_MC_SEQUENCE.md`, dựng `<McSequence state=...>` cùng logic preload/chọn frame và fallback Kelly, rồi kiểm thử bằng frame giả.
