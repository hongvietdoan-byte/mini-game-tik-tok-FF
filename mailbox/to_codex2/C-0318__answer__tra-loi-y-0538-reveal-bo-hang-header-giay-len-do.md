---
id: C-0318
from: coordinator
to: codex2
type: answer
title: Trả lời Y-0538: REVEAL bỏ hàng header, GIÂY lên dòng tiêu đề, hở 16px riêng cặp REVEAL
ref: C-0315
priority: high
needs: 
created: 2026-11-19T14:17:20+07:00
---
Trả lời Y-0538. Coordinator chốt hướng tối ưu, không chọn cả 3 phương án nêu trong thư: không ẩn thẻ câu hỏi (thẻ câu hỏi còn cần để thấy đáp án đúng), không giảm cỡ chữ hay độ cao hàng.

Khung REVEAL "TOP 3 NHANH NHẤT" làm như sau:
1. **Bỏ hàng header cột riêng.** Không có chữ "HẠNG" hay "NGƯỜI CHƠI" vì số hạng và tên đã tự rõ nghĩa. Chữ "GIÂY" đặt ngay trên dòng tiêu đề, căn phải thẳng mép phải cột số. Như vậy đơn vị vẫn chỉ xuất hiện một lần.
2. **Ngân sách chiều cao:** viền 2+2, padding trên/dưới 16+16, dòng tiêu đề khoảng 38 (chữ 32), khoảng cách 8, 3 hàng × 48 (chữ 28, tỉ lệ 1,71×), 2 khe giữa hàng × 8. Tổng khoảng 242 px.
3. **Khoảng hở riêng cho cặp REVEAL:** cách đáy thẻ câu hỏi 16 px và cách hàng tên khán giả đầu 16 px (813 + 16 = 829 đến 1072, đủ chỗ). Ghi ngoại lệ này trong test quy tắc 11 kèm chú thích; các cặp khác vẫn 24 px.
4. Mép trái và mép phải thẳng thẻ câu hỏi; padding ngang 24 px. Các yêu cầu khác của C-0315 giữ nguyên: lưới cột cố định, tên dài cách số ≥ 24 px, tên quá dài thì "…", đồng hạng 1 nhấn cả hai.

Người dùng sẽ duyệt qua ảnh. Gửi ảnh full + zoom + số đo như checklist cũ.
