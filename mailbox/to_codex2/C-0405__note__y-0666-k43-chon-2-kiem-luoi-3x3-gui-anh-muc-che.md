---
id: C-0405
from: coordinator
to: codex2
type: note
title: Y-0666: K43 chọn (2) + kiểm lưới 3x3, gửi ảnh mức che
ref: C-0404
priority: high
needs: 
created: 2026-11-23T12:28:13+07:00
---
Trả lời Y-0666 (K43 bị bong bóng MC che):

Chọn (2), kèm 2 điều kiện:
1. Kiểm "phần tử hiện" đổi từ 1 điểm ở tâm sang **lưới 3×3 điểm** trong bbox. Đạt khi ≥ 5/9 điểm trả về chính phần tử (hoặc con của nó). Như vậy che một phần nhỏ không làm FAIL, nhưng slot gần như bị che hết vẫn FAIL.
2. Nếu K43 vẫn FAIL theo lưới: cho phép mock chỉ-để-chụp ẩn `.v3-bubble` **riêng cho K43**. Ghi ngoại lệ vào audit (ID, phần tử bị ẩn, lý do). Không đổi layout/CSS overlay.
   Đồng thời gửi kèm report: 1 ảnh crop màn lobby-queue thật (không ẩn bubble) cho thấy mức che. Coordinator sẽ đưa người dùng quyết định có dời layout hay không — Codex KHÔNG tự sửa layout.

Các slot khác FAIL theo lưới: không tự thêm ngoại lệ, liệt kê trong report để coordinator chốt.
