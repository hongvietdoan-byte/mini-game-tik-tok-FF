---
id: C-0107
from: coordinator
to: cloud
type: task
title: C-0107 Soạn ~90 câu đề xuất: Bá Vương Đại Chiến, FFWS 2026, 8 đội, đội mạnh FFWS — có nguồn kiểm chứng
ref: 
priority: high
needs: 
created: 2026-11-12T09:09:12+07:00
---
Người dùng yêu cầu 12/11: soạn **khoảng 90 câu hỏi ĐỀ XUẤT** (số lượng linh hoạt) cho quiz, chủ đề Free Fire esports: (a) giải Bá Vương Đại Chiến, (b) giải FFWS 2026 đang diễn ra, (c) 8 đội dự Bá Vương Đại Chiến, (d) các đội mạnh của FFWS 2026. Đây chỉ là đề xuất — người dùng sửa/chọn/duyệt; KHÔNG ghi vào `fixtures/` hay DB.

Sản phẩm trên nhánh cloud: `docs/review/DE_XUAT_CAU_HOI_GIAI_DAU.md`, mỗi câu một khối:
- id tạm (gd-001…), nhóm (a/b/c/d), độ khó đề xuất (dễ/vừa/khó — mục tiêu tổng thể khoảng 42 dễ / 30 vừa / 18 khó, được lệch),
- câu hỏi ≤ 110 ký tự, 4 đáp án mỗi đáp án ≤ 28 ký tự, đúng MỘT đáp án đúng, đáp án nhiễu hợp lý và không gây tranh cãi,
- **nguồn kiểm chứng**: URL trang chính thức/đáng tin + ngày truy cập + câu trích ngắn (< 15 từ) chứng minh đáp án,
- mức tin cậy: ĐÃ KIỂM (có nguồn mở được hôm nay) / CẦN NGƯỜI DÙNG XÁC NHẬN.

Quy tắc bắt buộc:
1. KHÔNG bịa. Sự kiện về FFWS 2026 (thể thức, địa điểm, đội dự, kết quả) phải tra web hôm nay; giải đang diễn ra nên tránh câu có đáp án đổi theo ngày (bảng điểm hiện tại, "đội đang dẫn đầu") — ưu tiên dữ kiện đã chốt (thể thức, số đội, nước chủ nhà, nhà vô địch các mùa trước, đội đại diện từng khu vực, kỷ lục đã ghi nhận). Nếu môi trường cloud không truy cập được web: ghi rõ ở đầu file, chỉ soạn câu từ kiến thức chắc chắn và gắn toàn bộ là CẦN NGƯỜI DÙNG XÁC NHẬN.
2. Về Bá Vương Đại Chiến và 8 đội: repo không có dữ liệu (thể thức, đội hình, đội trưởng, thành tích). Không đoán. Soạn KHUNG câu hỏi với chỗ trống rõ ràng và liệt kê ở đầu file đúng những dữ kiện cần người dùng cung cấp (ví dụ: tên 8 đội, đội trưởng, thể thức, lịch, giải thưởng). Chỉ dùng tên đội khi người dùng đã cung cấp bằng chữ.
3. Không đưa thông tin cá nhân của tuyển thủ ngoài tên thi đấu công khai. Không nội dung công kích đội/tuyển thủ.
4. Tránh trùng 36 câu hiện có trong `fixtures/questions.ts`.
5. Cuối file: bảng tổng hợp số câu theo nhóm × độ khó × mức tin cậy, và danh sách câu bạn thấy rủi ro sai cao nhất.

Report kèm: có truy cập được web không, bao nhiêu câu ĐÃ KIỂM, cần người dùng cung cấp những gì.
