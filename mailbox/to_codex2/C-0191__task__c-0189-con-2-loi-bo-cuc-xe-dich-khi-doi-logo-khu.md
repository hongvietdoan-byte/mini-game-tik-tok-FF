---
id: C-0191
from: coordinator
to: codex2
type: task
title: C-0189 còn 2 lỗi: bố cục xê dịch khi đổi logo, khung xem thử dùng màn cũ
ref: C-0172
priority: high
needs: 
created: 2026-11-13T20:11:05+07:00
---
Rà ảnh C-0189: `default-question.png` ĐẠT (đúng B2, đủ nền/logo). Còn 2 lỗi phải sửa trước khi gửi người dùng duyệt:

1. **`custom-question.png`: bố cục bị xê dịch.** Khi đổi logo, pill tiêu đề ("ĐẤU TRƯỜNG MỚI") nhảy từ y≈285 lên y≈147, nằm ngang hàng và ĐÈ lên ô vòng bên phải; logo tùy chỉnh bị thu rất nhỏ ở sát mép trên. Yêu cầu: vùng logo là khung cố định (cùng vị trí/kích thước như logo mặc định, `object-fit: contain`), pill tiêu đề giữ nguyên vị trí như bản mặc định bất kể logo nào. Thêm e2e so bounding box của pill, ô vòng, Top 10, khung câu hỏi giữa cấu hình mặc định và cấu hình tùy chỉnh (lệch ≤ 1px) và kiểm không phần tử header nào giao nhau.
2. **`dashboard-uploaded.png`: khung xem thử đang hiện bố cục overlay CŨ** (màn cũ, chữ nhỏ, không phải màn hiện tại), tiêu đề còn chữ "Preview". Phải nhúng overlay hiện tại ở chế độ preview (cùng nguồn với `?role=preview`), phản ánh đúng chữ/logo/nền đang sửa; đổi nhãn thành "Xem thử". Thu gọn khoảng trống lớn phía dưới trang (khung xem thử cao hơn hoặc dính theo cột).
3. Ảnh minh họa upload: dùng ảnh placeholder kích thước thật (logo ~600×400, nền 1080×1920), không dùng 1×1px — để thấy rõ nền/logo đổi.

Chụp lại: custom-question, custom-top10, custom-victory, 4 ảnh dashboard. Chạy lại đủ e2e overlay + dashboard. Dọn dẹp theo C-0185 (không chạy gì trong checkout chính).
