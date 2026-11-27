---
id: C-0426
from: coordinator
to: codex1
type: answer
title: C-0420: 4 rủi ro phải sửa trước report (treo game, mất lô, DB thật, mặc định sync)
ref: C-0420
priority: high
needs: 
created: 2026-11-28T00:01:10+07:00
---
Coordinator đã soát diff chưa commit trong worktree c-quiz-20k. Người dùng yêu cầu: KHÔNG được làm hỏng game đang chạy tốt ở các lần live thật gần nhất (main 13205268). Hướng tối ưu vẫn đúng, nhưng phải sửa 4 điểm rủi ro sau trước khi report.

1. **Treo game nếu worker không hồi phục** (`runtime.ts` `flushThenApply`).
   - Hiện tại: vòng `while` chờ flush mãi, nên timer không chuyển trạng thái. Worker chết hoặc DB khóa kéo dài là game kẹt ở cuối câu trên live.
   - Yêu cầu: đặt trần cứng, ví dụ 5 s cảnh báo và 15 s fallback. Hết trần thì ghi đồng bộ các dòng còn treo trên luồng chính (đường `sync`), rồi apply chuyển trạng thái.
   - Test: worker treo vĩnh viễn → game vẫn qua REVEAL trong ≤ 20 s và không mất đáp án.

2. **Mất cả lô bình luận vì 1 lỗi** (`ingestBatch`).
   - Bản cũ có try/catch từng comment: một event lỗi không kéo theo cả tick. Bản mới bỏ, nên 1 comment ném lỗi là rơi cả lô (hàng trăm đáp án).
   - Yêu cầu: khôi phục cách ly lỗi từng comment ở cả chế độ worker lẫn sync.
   - Test: lô 1.000 comment có 1 comment hỏng → 999 được chấm.

3. **Tương thích DB thật** (`createPlayerIfAbsent`, id `${source}:${userId}`).
   - Yêu cầu: chạy trên BẢN SAO `data/quiz.db` thật, chép sang `E:\temp\codex1-c0420-*`, không đụng bản gốc.
   - Người chơi cũ phải giữ đúng id, điểm tích lũy và danh hiệu; không tạo trùng người chơi; kết quả lọc tên giống main.
   - Ghi trong report: số người chơi trước và sau, và số trùng (phải bằng 0).

4. **Mặc định khi gộp.**
   - `main.ts` đang để mặc định `worker`. Lần gộp đầu, mặc định phải là `sync` (giống main). `QUIZ_PERSIST_MODE=worker` chỉ bật khi đặt biến.
   - Coordinator sẽ chuyển mặc định sang worker sau khi người dùng chạy thử live và duyệt.
   - Cả hai chế độ đều phải qua đủ test và đủ E2E.

Thêm: thao tác Dashboard đang `await flush` trước `dispatch`. Ghi trong report độ trễ nút bấm tệ nhất (p99) ở 20k.

Nghiệm thu cuối giữ nguyên ngưỡng event-loop ở 10k và 20k (mỗi mức 2 lượt), cộng thêm:
- full test và full E2E, 2 lượt xanh, chạy ở cả `sync` lẫn `worker`;
- `tools/mock_round_check` trọn vòng trên bản sao DB thật;
- không commit `.tmp-c0420-*`, profile, DB; xóa các thư mục đó khi xong.

Coordinator sẽ tự đo lại và chỉ gộp khi người dùng không live.
