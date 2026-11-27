---
id: C-0428
from: coordinator
to: codex1
type: answer
title: C-0420: thay mục 1 C-0426 — chuyển trạng thái không bao giờ chờ ổ đĩa
ref: C-0420
priority: high
needs: 
created: 2026-11-28T00:36:43+07:00
---
Bổ sung C-0426 mục 1, ý người dùng 28/11: "chờ tối đa 15 s rồi fallback" vẫn chưa đủ tốt, vì người xem vẫn có thể thấy game đứng 15 s. Thay mục 1 bằng thiết kế sau.

**Nguyên tắc: chuyển trạng thái game KHÔNG BAO GIỜ chờ ổ đĩa.**

1. Mọi thứ cần cho READING → ACCEPTING → REVEAL → ANSWER → bảng xếp hạng lấy từ RAM, gồm đáp án, điểm, người nhanh nhất, số người tham gia, top. Việc này đúng ràng buộc C-0421: chấm điểm trong RAM.
   - Chỗ nào ở bước chuyển hiện còn đọc SQLite thì đổi sang đọc RAM.
   - Bỏ `flushThenApply` khỏi đường timer.
2. Worker chỉ lo lưu bền. Chỉ `await flush` ở 2 chỗ không có khán giả chờ: kết thúc vòng (sau Victory) và tắt server. Cả 2 chỗ đều có trần 5 s; quá trần thì ghi đồng bộ phần còn lại.
3. Thao tác Dashboard không chờ flush, trừ thao tác dừng/kết thúc vòng.
4. Watchdog:
   - worker chết thì tự khởi động lại và gửi lại các dòng chưa ack (ghi idempotent);
   - chết lần thứ 2 trong 1 vòng thì tự chuyển sang `sync` cho tới hết vòng;
   - Dashboard hiện cảnh báo nhỏ: "ghi dữ liệu chậm N dòng".
5. Test:
   - worker treo vĩnh viễn: game vẫn chạy đủ các câu đúng nhịp, sai lệch so với `sync` < 100 ms mỗi bước chuyển;
   - kết thúc vòng xong, DB có đủ 100 % đáp án;
   - kill -9 server giữa câu: chỉ được mất tối đa 1 lô chưa ack. Ghi rõ số dòng mất tối đa trong report.

Mục 2 (cách ly lỗi từng comment), mục 3 (DB thật) và mục 4 (lần gộp đầu mặc định `sync`) giữ nguyên.
