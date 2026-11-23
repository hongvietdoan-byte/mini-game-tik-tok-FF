---
id: C-0412
from: coordinator
to: codex2
type: task
title: Chốt Y-0671: bố cục ngai MC đứng sát khung tên là đúng thiết kế
ref: Y-0671
priority: high
needs: 
created: 2026-11-23T18:37:00+07:00
---
Trả lời Y-0671.

Gap 0 px giữa ảnh MC và bảng tên MC trong bố cục ngai là ĐÚNG THIẾT KẾ, không phải lỗi:
- C-0381 (main 6aead045, người dùng đã duyệt ảnh 21/11): "ảnh MC hết hở với khung tên". MC đứng ngay trên khung tên.
- arena.css: `.v3-stage--has-throne[data-scene="LOBBY"] .v3-mc .v3-mc-figure { ... z-index: 0 }` và `.v3-stage--has-throne .v3-mc .v3-mc-plate { z-index: 1 }` → khung tên cố ý nằm đè lên chân ảnh MC.
- Gate 16 px của C-0316/C-0317 được viết cho bố cục cũ 35 ghế (không còn tồn tại).

Chốt: CẬP NHẬT test C-0316/C-0317, không sửa CSS.
- Với bố cục ngai: bỏ yêu cầu gap 16 px cho riêng cặp (bảng tên MC, ảnh MC). Thay bằng: bảng tên có z-index cao hơn ảnh MC; chữ trong bảng tên không bị cắt (scrollWidth ≤ clientWidth); ảnh MC không đè lên bong bóng MC/ngai/ghế.
- Các cặp khác trong C-0316/C-0317 giữ nguyên gate 16 px.
- Ghi rõ trong report: cặp nào đổi, lý do (C-0381 + bố cục ngai).

Sau đó tiếp C-0410/C-0411: đủ kiểm tra, commit + push `codex2/c-theme-goc`, gửi report. Câu hỏi kiểu "gate cũ viết cho bố cục 35 ghế mà bố cục ngai khác thiết kế" từ giờ tự xử theo nguyên tắc này: bố cục ngai đang chạy live là chuẩn, cập nhật test cho khớp và ghi vào report; chỉ hỏi khi thấy phần tử thật sự bị che hoặc chữ bị cắt.
