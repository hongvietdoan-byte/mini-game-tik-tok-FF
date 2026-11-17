---
id: C-0257
from: coordinator
to: codex1
type: task
title: Nhận đáp án từ lúc MC bắt đầu đọc (READING)
ref: 
priority: high
needs: 
created: 2026-11-17T21:27:33+07:00
---
## Bối cảnh (live TikTok thật 17/11)
Người xem thấy câu hỏi + 4 đáp án ngay khi MC bắt đầu đọc (READING) nên bình luận luôn → bị loại NOT_ACCEPTING (22 lần/buổi) hoặc STALE_SOURCE_TIMESTAMP khi tới muộn sau lúc mở ACCEPTING. Họ vẫn có ghế/tên nhưng 0 điểm, và "Nhanh nhất" không khớp với người bình luận đầu tiên trong chat. **Người dùng chốt: nhận đáp án ngay từ lúc vào READING.**

## Việc cần làm (làn codex1: quiz-core + server)
1. Cửa sổ nhận đáp án mở từ **thời điểm vào READING** của câu đó, đóng ở deadline ACCEPTING như cũ (ACCEPTING vẫn 20 s, đồng hồ hiển thị không đổi). Tức `acceptWindow` (packages/quiz-core/src/engine.ts:145) trả cửa sổ cả khi state READING, với openAtMs = lúc vào READING; khi chuyển sang ACCEPTING không reset openAtMs.
2. Đáp án nhận trong READING được ghi như đáp án thường: chỉ bình luận đầu tiên mỗi người mỗi câu được tính (DUPLICATE_ANSWER giữ nguyên), không cho đổi đáp án.
3. Thưởng tốc độ và `responseMs` của "Nhanh nhất" (`apps/server/src/runtime.ts` fastestCorrectAnswerFor dùng `question.openedAtMs`) tính từ **lúc vào READING**. Kiểm tra mọi chỗ dùng openedAtMs/acceptOpenAtMs để nhất quán (chấm điểm Kahoot/Classic, xếp hạng, persistence).
4. Kiểm tra STALE_SOURCE_TIMESTAMP (maxSourceLagMs) so với openAtMs mới: bình luận gửi trong READING tới muộn vẫn phải được nhận nếu source timestamp ≥ lúc vào READING.
5. ANSWER_COUNTS / số đã trả lời trên overlay phải tăng ngay từ READING (kiểm tra snapshot không chặn theo state). PAUSE/RESUME, skip, cancel, MC_READING_FALLBACK, CONNECTION_INTERRUPTED phải vẫn đúng.
6. Simulator MOCK: cho phép bot trả lời từ READING (không bắt buộc, nhưng test phải có ca này).

## Tiêu chí xong
- Test unit mới: trả lời trong READING được nhận, tính điểm tốc độ từ READING; trả lời trong PREPARE vẫn bị NOT_ACCEPTING; trả lời sau deadline vẫn LATE/NOT_ACCEPTING; trùng vẫn DUPLICATE_ANSWER.
- typecheck, test, privacy:check PASS; e2e nếu đụng overlay/dashboard. Kiểm tra cuối file không có `\n` literal.
- Nhánh `codex1/c-accept-from-reading`, báo lại bằng thư.
