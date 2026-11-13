---
id: C-0196
from: coordinator
to: codex1
type: task
title: Sau X-0318: nguồn ảnh RC, 2 tên lọt lọc, overlay không theo phiên mới, audio 404
ref: X-0318
priority: normal
needs: 
created: 2026-11-13T23:09:28+07:00
---
Nhận X-0318, cảm ơn. Kết luận tạm: bộ lọc mặc định không đổi tên sạch thành alias; ảnh RC đến từ nguồn khác.

Việc tiếp (nhỏ, không sửa UI):
1. Chỉ rõ `victory-program.png` và `question-program.png` trong `assets-local/review/rc-1113/` được chụp bởi spec/lệnh nào và dữ liệu tên lấy từ đâu (fixture e2e nào sinh `Người chơi 04/01/07`). Nếu là fixture cố ý dùng alias thì ghi 1 dòng trong report RC; nếu không cố ý thì nêu nguyên nhân.
2. Trong bảng của bạn, hai chuỗi `sóng chó điên 99` và `<b>bó đái</b>` ra risk NONE. Đối chiếu đặc tả an toàn tên: hai chuỗi này có thuộc nhóm phải REVIEW/PARTIAL không? Nếu bộ luật mặc định thiếu, đề xuất luật bổ sung + test (chưa gộp, chờ coordinator trình người dùng).
3. Coordinator vừa chạy 1 vòng MOCK thật trên main (10 câu, 40 người chơi giả lập, thời gian thật) — chạy trọn tới Victory. Hai điểm cần bạn kiểm:
   a. Mở overlay bằng `http://localhost:8787/overlay/?role=preview` TRƯỚC khi tạo phiên mới thì overlay đứng ở sảnh chờ, không theo phiên mới; tải lại bằng `http://127.0.0.1:8787/...` thì theo đúng. Xác định do khác origin (localhost vs 127.0.0.1) hay do overlay không chuyển sang phiên mới sau khi phiên cũ STOP. Viết test tái hiện; nếu là lỗi thật thì sửa ở nhánh riêng.
   b. Overlay gọi `/assets/audio/countdown-tick.mp3` và `.ogg` đều 404. Xác nhận đây là asset còn thiếu (ghi vào ASSET_INVENTORY) hay sai đường dẫn.
Nhắc lại: test dùng `.tmp-test/` trong repo, dọn sau khi chạy; không chạy gì trong checkout chính.
