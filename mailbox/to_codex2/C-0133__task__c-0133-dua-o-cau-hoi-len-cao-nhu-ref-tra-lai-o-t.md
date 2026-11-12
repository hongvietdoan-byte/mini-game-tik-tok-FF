---
id: C-0133
from: coordinator
to: codex2
type: task
title: C-0133 Đưa ô câu hỏi lên cao như ref, trả lại ô thoại MC (được che cờ)
ref: C-0128
priority: high
needs: 
created: 2026-11-12T16:48:31+07:00
---
Người dùng xem ảnh C-0127/C-0131 và KHÔNG đồng ý việc đẩy ô câu hỏi xuống. Nhắc lại C-0128: cờ là nền phụ, ĐƯỢC PHÉP che cờ. Hiện ô câu hỏi bị đẩy xuống làm mất ô thoại của MC.

Sửa (ưu tiên CAO, làm TRƯỚC C-0132/C-0118), trên nhánh `codex2/c0131-ui-fix`:
1. Bố cục trở về theo ref `assets-local/ref/storm-arena-ref.png` (xem cả `assets-local/review/c0101/compare-question.png` bên trái): ô câu hỏi + 4 đáp án đặt CAO, ngay dưới header, cạnh Top 10 (khoảng y 18–42 %), che cờ cũng được.
2. Dưới đó: MC Kelly bán thân bên trái (đủ đầu → ngang bụng, không bị khung nào đè) + **ô thoại MC** bên phải (y ≈ 44–56 %). Ô thoại hiện lời MC theo pha (READING: "Cùng nghe câu hỏi…", ACCEPTING: "Trả lời bằng cách comment A, B, C hoặc D để tham gia ngay!", REVEAL: lời công bố/khen…), dùng nội dung lời thoại đang có. Bỏ dòng hướng dẫn/"Cùng nghe…" đang nhét bên trong ô câu hỏi — chuyển hết vào ô thoại.
3. Giữ mọi yêu cầu C-0127: khung câu hỏi, đáp án, Top 10, MC, ô thoại, đồng hồ CỐ ĐỊNH vị trí/kích thước ở mọi pha và mọi độ dài câu; câu dài co chữ trong khung. Giữ fix nhãn "CÂU HỎI" và logo Victory của C-0131.
4. Ẩn nút "♪ Bấm để bật âm" thì để ở C-0132.

Nghiệm thu: ảnh 4 pha cạnh nhau (READING, ACCEPTING ngắn, ACCEPTING dài nhất, REVEAL) + 1 ảnh REF | ACCEPTING → `assets-local/review/c0133/`. Vẫn giảm tải đến 20:00: typecheck + unit liên quan + chụp đúng các ảnh trên, không e2e đầy đủ. Chưa gộp main.
