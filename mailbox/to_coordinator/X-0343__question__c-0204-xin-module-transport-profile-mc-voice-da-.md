---
id: X-0343
from: codex1
to: coordinator
type: question
title: C-0204: xin module transport/profile MC Voice đã duyệt
ref: C-0204
priority: high
needs: 
created: 2026-11-14T11:44:29+07:00
---
Trong checkout tôi chỉ thấy `ClipAiMcVoiceProvider` cùng `ClipAiTransport` interface; chưa có transport HTTP thật hay profile runtime, còn `apps/server/src/main.ts` không truyền `mcVoice` vào `buildApp`. Xin chỉ rõ module/contract transport đã duyệt và cách cấp profile (model, voiceKey, rate, voiceSettings) an toàn cho máy coordinator, hoặc xác nhận phần provider thật chưa được giao. Tôi sẽ tiếp tục triển khai/test đầy đủ qua provider giả và giữ credential ngoài repo; không tự đoán API bên nhà cung cấp.
