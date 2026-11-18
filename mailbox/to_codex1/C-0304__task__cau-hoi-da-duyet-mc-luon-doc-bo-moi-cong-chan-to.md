---
id: C-0304
from: coordinator
to: codex1
type: task
title: Câu hỏi đã duyệt: MC luôn đọc, bỏ mọi cổng chặn (TOO_LONG/LATE/queue/identity)
ref: C-0302
priority: normal
needs: 
created: 2026-11-19T02:05:31+07:00
---
Người dùng chốt (19/11): **câu hỏi đã duyệt thì MC phải đọc, không được bỏ vì bất kỳ lý do kiểm tra nào**. Cách sửa không phải chỉnh từng câu thoại, mà là bỏ các cổng chặn trên đường đọc câu hỏi. Làm chung trên nhánh `codex1/c-0292-mc-last-question`, cùng lúc với C-0302 (tối ưu soak).

Hiện ở `runtime.ts` (main), giọng câu hỏi bị bỏ ở các điểm sau:
1. `UNSAFE_PLAYER_IDENTITY` (dòng ~1238, ~1438). Nhánh của bạn đã bỏ, giữ như vậy. Bộ lọc tên bậy (nameFilter) cũng **không** được áp vào câu hỏi/đáp án đã duyệt.
2. `TOO_LONG` ở `prepareQuestionReading`: tổng > `MAX_MC_READING_MS` thì không lưu và không đọc. Yêu cầu: vẫn lưu và vẫn đọc. READING kéo dài theo đúng độ dài audio, trước hết thu ngắn khoảng ngắt giữa các dòng nếu cần.
3. `TOO_LONG` vì `planQuestionCueSchedule` trả null khi `queueDelayMs` (cue cũ còn đang phát) ăn hết ngân sách. Yêu cầu: khi vào READING, cắt hoặc bỏ các cue không phải QUESTION đang chờ hoặc đang phát (reveal, leaderboard, spam reminder, countdown, …) để câu hỏi đọc ngay.
4. `LATE_AUDIO` khi audio chưa sẵn lúc READING hết hạn. Yêu cầu:
   - Câu kế tiếp phải được sinh/cache trước, đã có ở sảnh và cả vòng; kiểm tra lại cho chắc.
   - Nếu tới READING mà vẫn chưa sẵn: giữ READING chờ audio, tối đa khoảng 10 s, rồi đọc.
   - Chỉ khi provider lỗi thật hoặc vượt mức chờ mới bỏ, và khi đó phải hiện cảnh báo rõ trên Dashboard (không chỉ in console).
5. `FAILED` từ provider: retry 1–2 lần trước khi bỏ.

Ràng buộc:
- Không sinh giọng thật khi test, chỉ dùng mock.
- Không đổi text câu hỏi.
- Chat MC động (operator gõ) vẫn giữ kiểm tra an toàn như hiện tại.

Test cần có:
- Câu có chữ trùng tên người chơi (kiểu "hành trang" với người chơi "Trang") vẫn đọc.
- Bundle > 20 s vẫn đọc và READING kéo dài.
- Cue reveal/leaderboard đang phát lúc vào READING thì bị cắt, câu hỏi vẫn đọc.
- Audio về muộn 3 s vẫn đọc.
- Provider lỗi 1 lần rồi retry thành công.
- Soak như C-0302.

Báo cáo kèm commit và số đo soak.
