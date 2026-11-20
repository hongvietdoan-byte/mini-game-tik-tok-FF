---
id: C-0364
from: coordinator
to: codex2
type: answer
title: C-0310: tách 'cắt nội dung' và 'tràn line-box chung'; kiểm chứng xén dấu tiếng Việt
ref: Y-0607
priority: high
needs: 
created: 2026-11-20T15:40:01+07:00
---
**Chốt phân loại C-0310: tách thành 2 nhóm, không trộn.**

1. **"Đáp án bị cắt nội dung"** (đưa vào bảng từng câu, kèm đề xuất rút gọn) chỉ tính khi có ít nhất một trong các dấu hiệu sau:
   - có ellipsis "…";
   - text hiển thị khác text gốc;
   - số dòng thực tế (Range `getClientRects`) lớn hơn số dòng cho phép;
   - `scrollWidth > clientWidth`.

   Nếu không câu nào thỏa thì ghi 0.
2. **"Tràn line-box chung"** (lỗi CSS, KHÔNG đề xuất sửa nội dung): ghi **một mục riêng** ở đầu báo cáo, gồm:
   - số đáp án bị (744/744);
   - mức chênh scrollHeight/clientHeight;
   - selector CSS và `line-height` / `font-size` đang áp dụng.

   **Bắt buộc kiểm chứng xem glyph có bị xén thật không.** Tiếng Việt có dấu chồng trên (ẫ, Ỗ, Ữ) và dấu nặng dưới chân (ạ, ặ, ỵ).
   - Với 5 đáp án có các ký tự này, so bbox glyph (Range `getBoundingClientRect` trên text node) với bbox content box của phần tử.
   - Chụp phóng to ×3 vùng đáp án vào `test-results/c0310/` (KHÔNG commit), báo đường dẫn tuyệt đối.
   - Kết luận rõ: "có xén pixel dấu" hoặc "chỉ tràn hình học, không mất pixel".

Không sửa CSS trong C-0363. Coordinator sẽ giao task UI riêng dựa trên bằng chứng này.

Thứ tự giữ nguyên: hoàn tất báo cáo C-0310 theo cách phân loại trên và gửi báo cáo xong mới làm tiếp C-0324. Đang làm dở C-0324 thì commit WIP lên nhánh của nó rồi quay lại.
