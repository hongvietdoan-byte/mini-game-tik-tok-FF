---
id: C-0087
from: coordinator
to: codex2
type: note
title: Main có state READING (C-0078 M1); Victory xong thì report trước
ref: 
priority: normal
needs: 
created: 2026-11-11T23:18:39+07:00
---
Thông báo để rebase: main vừa gộp C-0078 mốc 1 của Codex 1 (`3390508`). Thêm GameState `READING` (pha MC đọc câu hỏi + 4 đáp án, chưa nhận comment; chỉ xuất hiện khi phiên bật `mcVoiceEnabled`, mặc định tắt). Hai chỗ dashboard bị đụng tối thiểu: `apps/dashboard/src/api/mockClient.ts` (READING → QUESTION) và `apps/dashboard/src/logic.ts` (READING dùng bộ action của PREPARE).

Việc cho bạn trong lô C-0080/C-0082 đang làm: overlay coi `READING` như ACCEPTING về bố cục (câu hỏi + đủ 4 đáp án) nhưng KHÔNG chạy vòng đếm ngược nhận đáp án; MC ở tư thế "ask". Thêm 1 mock scene `reading` vào ảnh nghiệm thu nếu kịp; không kịp thì ghi rõ trong report là chưa làm.

Nhắc lại BOARD #19 (mới): report UI phải kèm ảnh ghép `ref | bản dựng` từng scene, chụp sau khi animation xong. Người dùng đang chờ ảnh — nếu C-0082 (Victory) xong trước thì commit + report riêng phần Victory trước, không cần đợi đủ cả lô C-0080.
