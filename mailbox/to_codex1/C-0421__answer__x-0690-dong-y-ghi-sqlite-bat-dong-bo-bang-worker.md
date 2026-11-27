---
id: C-0421
from: coordinator
to: codex1
type: answer
title: X-0690: đồng ý ghi SQLite bất đồng bộ bằng worker cho C-0420
ref: C-0420
priority: high
needs: 
created: 2026-11-27T19:27:32+07:00
---
Trả lời X-0690: **ĐỒNG Ý mở rộng C-0420 sang ghi SQLite bất đồng bộ bằng worker.** Mục tiêu 20.000 người là yêu cầu của người dùng, nên ta giữ nguyên nghiệm thu, không hạ ngưỡng. Thử xếp hàng/yield trên luồng chính thất bại là hợp lý vì việc ghi vẫn chạy trên event loop; worker mới tách được hẳn việc ghi.

## Thiết kế bắt buộc
1. **Bộ nhớ luồng chính là nguồn sự thật trong lúc chơi.** Nhận đáp án, chống trùng `eventId`, kiểm tra deadline, chấm điểm, xếp hạng, ghế/ngai và snapshot Overlay đều làm trong RAM như hiện nay. Thứ tự chốt câu dựa trên **số thứ tự nhận (seq) và thời điểm server nhận ở luồng chính**, KHÔNG dựa vào thứ tự hay rowid trong DB. Như vậy việc ghi bất đồng bộ không làm đổi kết quả chốt câu.
2. **Worker ghi DB:** dùng `node:worker_threads` với kết nối SQLite riêng, bật WAL và `busy_timeout`. Luồng chính gom lô (≤ 100 ms hoặc ≤ 2.000 dòng, điều kiện nào đến trước thì gửi) qua `postMessage`. Worker ghi mỗi lô trong 1 transaction rồi gửi ack kèm seq cuối đã ghi.
3. **Rào chốt câu (flush barrier):** trước các mốc bền vững (chốt kết quả câu / sang câu tiếp / VICTORY / lưu session cuối vòng), luồng chính `await flush()` để chờ worker ack hết lô đang chờ. Chỉ được chờ bằng await, không chặn luồng chính. Nếu quá 5 giây thì log cảnh báo và vẫn chạy tiếp game; KHÔNG làm treo vòng chơi.
4. **Không mất dữ liệu khi worker lỗi:** các dòng chưa được ack phải giữ ở luồng chính. Worker chết thì khởi động lại rồi gửi lại các dòng đó; cách ghi phải idempotent (dùng khóa sẵn có hoặc `INSERT OR IGNORE` theo `eventId`/khóa duy nhất). Khi tắt server thì drain hết rồi mới đóng DB. Ghi rõ trong report: nếu process chết cứng thì mất tối đa bao nhiêu (≈ 1 lô).
5. **Giữ nguyên schema DB, luật chơi, UI và cách chấm điểm.** Các chỗ chỉ đọc (Dashboard, analytics) chấp nhận trễ ≤ 1 lô. Chỗ nào cần đọc ngay sau khi ghi thì lấy từ RAM hoặc gọi sau flush.
6. **Chế độ đồng bộ dự phòng** qua biến môi trường (ví dụ `QUIZ_PERSIST_MODE=sync`) để test unit/fixture cũ vẫn chạy. Mặc định khi chạy thật là `worker`.
7. Không thêm dependency mới nếu `worker_threads` cùng thư viện SQLite hiện có đã đủ dùng.

## Đo lại
- Sau khi tách ghi, chạy `--cpu-prof` lượt 20k. Nếu p99 vẫn ≥ 100 ms thì xử lý điểm nóng tiếp theo (chấm/xếp hạng 20k đáp án, sanitize, phát WS), vẫn theo cách đơn giản nhất.
- Giữ đủ nghiệm thu và ca biên của C-0420, thêm 3 ca:
  - giết worker giữa ANSWER → 0 đáp án mất;
  - DB bị khóa tạm thời (`busy`);
  - tắt server khi còn lô chưa ghi → sau khi khởi động lại, dữ liệu đủ tới lô đã ack.
- Báo tiến độ giữa chừng: khi worker chạy xong lượt đo 20k đầu tiên, gửi số liệu event-loop theo pha, chưa cần đủ test.
- Nếu làm hết hướng này mà vẫn không đạt: giao nhánh kèm số đo trung thực, ghi rõ ngưỡng nào còn trượt và nguyên nhân từ profile. Không đánh dấu đạt.

Các mục giao hàng giữ như C-0420: không commit ảnh/log/profile; merge origin/main trước khi báo; report có bảng trước/sau và lệnh để coordinator tự đo lại.
