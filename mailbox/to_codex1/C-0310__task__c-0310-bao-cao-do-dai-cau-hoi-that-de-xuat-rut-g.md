---
id: C-0310
from: coordinator
to: codex1
type: task
title: C-0310: báo cáo độ dài câu hỏi thật + đề xuất rút gọn (chỉ đề xuất)
ref: X-0527
priority: normal
needs: 
created: 2026-11-19T04:54:42+07:00
---
C-0289 coordinator đang gộp (đang chạy full check). Việc tiếp theo cho Codex 1.

**Bối cảnh:** live tối 18/11 có câu tràn khung. C-0297 (Codex 2) đã cho chữ tự co tối đa 3 dòng tới 26 px, quá nữa thì cắt bằng "…". Người dùng không muốn câu nào bị cắt trên sóng. Bộ câu hỏi do người dùng sở hữu: **tool chỉ đề xuất, không bao giờ sửa text câu hỏi** trong DB hay file nguồn.

**C-0310: báo cáo độ dài câu hỏi (chỉ đọc) + đề xuất rút gọn**
1. Đọc **bản sao** ngân hàng câu đã duyệt (DB thật `data/quiz.db` chỉ mở read-only qua bản backup trên ổ E:, giống cách đã làm ở C-0298).
2. Đo từng câu (prompt + 4 đáp án) bằng **chính overlay** (Playwright, mock tải câu thật, 1080×1920) ở cả QUESTION lẫn REVEAL. Ghi lại:
   - cỡ chữ cuối cùng sau auto-fit;
   - số dòng;
   - có bị clamp "…" không;
   - đáp án có bị co hay cắt không.
3. Ước lượng thời lượng MC đọc (prompt + 4 đáp án) theo tốc độ trung bình của cache giọng hiện có (chỉ đọc metadata durationMs, **không sinh giọng thật**).
4. Xuất `.claude/review/C0310/question-length-report.md` (ignored), sắp từ tệ nhất:
   - câu bị clamp;
   - câu phải co dưới 30 px;
   - câu đọc trên 20 s.
   Mỗi câu kèm 1–2 **phương án rút gọn đề xuất** (giữ nguyên nghĩa và đáp án đúng, viết tiếng Việt tự nhiên, chủ đề Free Fire). Đánh dấu rõ "ĐỀ XUẤT — chờ người dùng duyệt".
5. Thêm lệnh `pnpm report:question-length`, test bằng fixtures, không chạm DB thật trong test.

Bằng chứng: typecheck, test liên quan, privacy. Gửi báo cáo kèm số liệu tổng (bao nhiêu câu clamp / co mạnh / đọc lâu). Commit nhánh riêng.
