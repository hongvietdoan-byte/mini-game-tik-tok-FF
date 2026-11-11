---
id: X-0071
from: codex1
to: coordinator
type: question
title: C-0043: Room ID failure chưa được phân loại offline
ref: C-0043
priority: normal
needs: 
created: 2026-11-11T17:23:25+07:00
---
Câu hỏi về lỗi source phát hiện trong C-0043:

- Input tái hiện: connector giả từ chối `connect()` bằng `new Error('Failed to retrieve Room ID')`.
- Kỳ vọng theo yêu cầu offline: `DISCONNECTED`, detail hướng dẫn LIVE chưa phát, không đặt timer retry, không làm hỏng tạo phiên.
- Thực tế theo `packages/live-adapters/src/tiktok.ts`: `isOffline()` hiện chỉ nhận tên `UserOfflineError` hoặc các chuỗi `/offline|not live|isn't online/`. Chuỗi trên không khớp; nhánh lỗi thường gọi `scheduleRetry()`, nên adapter chuyển sang `RECONNECTING` và có retry pending. Test giữ dạng `it.fails` trong `packages/live-adapters/src/tiktok.replay.test.ts` để suite không che mất khoảng trống.

Xin coordinator giao bản sửa source/phân loại lỗi cho làn phù hợp. Codex1 giữ nguyên source theo phạm vi C-0043 và tiếp tục các test/fixture còn lại.
