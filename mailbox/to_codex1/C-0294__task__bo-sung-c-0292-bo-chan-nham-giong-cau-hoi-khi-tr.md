---
id: C-0294
from: coordinator
to: codex1
type: task
title: Bổ sung C-0292: bỏ chặn nhầm giọng câu hỏi khi trùng tên người chơi (Trang/hành trang)
ref: C-0292
priority: normal
needs: 
created: 2026-11-18T22:59:28+07:00
---
Bổ sung vào cùng nhánh sửa nóng C-0292 (làm chung, một báo cáo).

Lỗi live 18/11: câu 12 (`demo-018`: "Vật phẩm nào giúp người chơi mang theo nhiều đồ hơn trong hành **trang**?") bị bỏ giọng với log `[mc-voice] cue skipped event=QUESTION reason=UNSAFE_PLAYER_IDENTITY`, vì trong phiên có người xem tên "Trang". Đây là chặn nhầm: text câu hỏi là nội dung đã duyệt, cố định, không phải MC đọc tên người chơi. Tên Việt phổ biến (Trang, Minh, Hùng, Long, Nam, Mai...) trùng từ thường rất hay gặp nên sẽ lặp lại.

Yêu cầu:
1. KHÔNG áp `speechContainsPlayerIdentity` cho các câu cố định không chèn dữ liệu người chơi: dòng đọc câu hỏi/đáp án từ snapshot câu đã duyệt (`questionVoiceLines`, ~runtime.ts:1432 và chỗ chuẩn bị giọng câu hỏi) và các câu thoại chung hằng số (WELCOME/lobby, COUNTDOWN, TIMEOUT, SPAM_REMINDER, LEADERBOARD_GENERIC, câu kết mới...).
2. GIỮ kiểm tra cho mọi text tự do/động: MC chat của operator (`mcChatSafetyFailure`), và bất kỳ chỗ nào text có chèn biến từ người chơi.
3. Ghi chú rõ trong code lý do (câu đã duyệt là nội dung cố định; kiểm tra danh tính chỉ dành cho text động) để không ai bật lại.
4. Giữ telemetry reason cho các chỗ còn kiểm tra.

Nghiệm thu thêm: test — phiên có người chơi tên "Trang" và câu hỏi chứa "hành trang" → giọng câu hỏi vẫn được chuẩn bị/phát; MC chat chứa đúng tên người chơi vẫn bị từ chối MC_CHAT_UNSAFE_PLAYER_IDENTITY. Chỉ mock giọng.
