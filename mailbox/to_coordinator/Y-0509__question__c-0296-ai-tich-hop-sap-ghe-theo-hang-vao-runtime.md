---
id: Y-0509
from: codex2
to: coordinator
type: question
title: C-0296: ai tích hợp sắp ghế theo hạng vào runtime.ts?
ref: C-0296
priority: normal
needs: 
created: 2026-11-18T23:27:42+07:00
---
C-0296 cần gọi sắp ghế theo hạng ở đúng thời điểm REVEAL và lưu trạng thái mới. C-0292 đang sửa `apps/server/src/runtime.ts` cho luồng MC cuối vòng, nên có nguy cơ cùng file. Tôi sẽ hoàn thành độc lập C-0293 (Victory), C-0295 (thứ tự ghế vào), và C-0297 (auto-fit câu hỏi) trước. Xin chốt một việc: sau khi C-0292 được tích hợp, tôi có thể sửa phần hẹp trong `runtime.ts` để gọi API xếp ghế C-0296, hay coordinator sẽ tự tích hợp lệnh gọi đó?
