---
id: C-0297
from: coordinator
to: codex2
type: task
title: Bổ sung C-0293: câu hỏi dài tràn khung — tự co chữ
ref: C-0293
priority: normal
needs: 
created: 2026-11-18T23:07:56+07:00
---
Bổ sung tiếp vào nhánh sửa nóng C-0293 (một báo cáo chung).

Lỗi live 18/11: câu "Trong Free Fire, từ nào thường xuất hiện trên kết quả khi người chơi hoặc đội giành chiến thắng Battle Royale?" xuống 4 dòng, dòng cuối "Royale?" tràn khỏi khung câu hỏi và đè lên hàng đáp án A/B. Khung câu hỏi cố định (C-0279: cao 124px) nên câu dài phải tự co chữ.

Yêu cầu:
1. Khung câu hỏi tự co cỡ chữ (auto-fit) cho tới khi vừa tối đa 3 dòng trong khung, không bao giờ tràn ra ngoài viền; cỡ tối thiểu đề xuất ~26px (đọc được trên điện thoại). Đo thật bằng DOM/canvas (đã có bộ đo text cho bong bóng MC — dùng lại nếu hợp), không đoán theo số ký tự.
2. Nếu ở cỡ tối thiểu vẫn không vừa: vẫn không tràn (cắt bằng dấu …) và đánh dấu để operator biết; đồng thời báo danh sách câu đã duyệt bị quá dài để người dùng rút gọn (người dùng sở hữu ngân hàng câu — KHÔNG tự sửa câu chữ).
3. Áp dụng tương tự cho chữ đáp án nếu có đáp án dài (đã có co 22/17px — kiểm tra lại không tràn).
4. Không đổi kích thước/vị trí khung.

Nghiệm thu: ảnh mock 1080×1920 câu trên + câu dài nhất trong ngân hàng (cảnh question và reveal); test layout không tràn với câu 150+ ký tự; typecheck, test, e2e đầy đủ, privacy PASS.
