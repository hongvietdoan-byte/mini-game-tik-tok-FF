---
id: C-0127
from: coordinator
to: codex2
type: task
title: C-0127 Màn câu hỏi: khung cố định mọi pha, MC bán thân đủ, logo nhỏ lại
ref: Y-0205
priority: high
needs: 
created: 2026-11-12T15:04:47+07:00
---
Người dùng xem ảnh C-0122 (`assets-local/review/c0122/reveal-source-render.png`, `question-longest-source-render.png`) và CHƯA duyệt. Lỗi người dùng chỉ ra:

1. **MC Kelly bị cắt gần hết**: MC phải là ảnh BÁN THÂN hiện đủ (đầu → ngang bụng), không bị ô câu hỏi/Top 10 đè lên. Hiện chỉ còn mặt thò ra sau khung.
2. **Logo quá to, chiếm chỗ bảng câu hỏi**: logo ở màn câu hỏi thu nhỏ, nằm gọn trong header trên cùng, không chồng lên Top 10 / ô câu hỏi.
3. **Khung phải CỐ ĐỊNH**: ô câu hỏi, 4 ô đáp án, Top 10, MC, đồng hồ có vị trí + kích thước cố định, GIỐNG NHAU ở mọi pha (READING/QUESTION/ACCEPTING/REVEAL) và mọi độ dài câu. Câu dài → co chữ trong khung (giới hạn 110/28 ký tự đã có), KHÔNG giãn khung, KHÔNG đẩy đáp án xuống. Pha nào chưa hiện đáp án thì để trống 4 ô đúng chỗ, không dồn bố cục.
4. Dòng "Trả lời bằng cách comment A, B, C hoặc D" chỉ hiện trong ACCEPTING, không hiện ở REVEAL.

Cờ 8 đội: người dùng CHƯA chọn giữ hay dời bố cục để lộ cờ. Khi chia khung cố định ở trên, ưu tiên phương án ít che cờ nhất nhưng không hy sinh 1–3; ghi trong report % dãy cờ còn thấy.

Nghiệm thu: ảnh ghép NỀN GỐC | RENDER cho READING, ACCEPTING câu ngắn, ACCEPTING câu dài nhất, REVEAL → `assets-local/review/c0127/` (thêm 1 ảnh xếp 4 pha cạnh nhau để thấy khung không xê dịch). Kèm logo Victory to lên ~34–40 % chiều rộng khung, không đè cúp (ảnh Victory thường + đồng hạng). typecheck + unit + e2e. Chưa gộp main. Làm TRƯỚC C-0118.
