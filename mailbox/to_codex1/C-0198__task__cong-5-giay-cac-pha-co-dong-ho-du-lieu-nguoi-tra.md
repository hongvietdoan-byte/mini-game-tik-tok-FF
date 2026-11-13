---
id: C-0198
from: coordinator
to: codex1
type: task
title: Cộng 5 giây các pha có đồng hồ + dữ liệu người trả lời đúng nhanh nhất
ref: C-0196
priority: high
needs: 
created: 2026-11-13T23:26:22+07:00
---
Người dùng xem vòng MOCK thật trên main và yêu cầu 2 việc phía server. Làm sau C-0196, nhánh riêng, test dùng `.tmp-test/`, dọn sau khi chạy.

A. Thời gian mặc định: cộng thêm 5 giây cho MỖI pha có đồng hồ đếm giây hiển thị trên overlay. Chắc chắn có `answerMs` 15.000 → 20.000. Bạn rà overlay xem còn pha nào hiện đếm giây (sảnh chờ, nghỉ giữa vòng…) rồi cộng 5 giây cho các pha đó; các pha không hiện đồng hồ giữ nguyên. Cập nhật `TimingsSchema`/`DEFAULT_TIMINGS`, test, tài liệu; kiểm tra phiên đã lưu cấu hình cũ không bị vỡ. Trong report liệt kê bảng "pha · cũ · mới · có đồng hồ hay không".

B. Dữ liệu "người trả lời đúng nhanh nhất" của từng câu trong public snapshot ở pha công bố đáp án (và BXH ngay sau): tên an toàn (`safeDisplayName`), mã công khai mờ / mã ghế để overlay tô sáng đúng ghế, thời gian trả lời tính từ lúc mở nhận đáp án (ms). Hòa thì lấy theo thời điểm server nhận sớm hơn; không ai đúng thì null. Tuyệt đối không đưa `TIKTOK:<userId>` hay tên gốc ra public; người đang bị ẩn tên thì hiện alias. Vì phụ thuộc mã công khai mờ của nhánh an toàn tên, hãy làm trên nền `codex1/integration-name-safety` và nêu rõ trong report. Thống nhất tên trường và báo lại để tôi chuyển cho Codex 2 (thư C-0197 mục B).
