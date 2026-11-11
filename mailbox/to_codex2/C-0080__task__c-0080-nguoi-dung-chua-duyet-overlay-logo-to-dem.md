---
id: C-0080
from: coordinator
to: codex2
type: task
title: C-0080: Người dùng chưa duyệt overlay — logo to, đếm ngược che chữ, đáp án bị cắt, bỏ icon sét, Victory, MC nhiều tư thế
ref: 
priority: high
needs: 
created: 2026-11-11T22:19:54+07:00
---
Người dùng vừa chạy thử overlay (sau C-0065) và chưa duyệt. Gộp các ý dưới đây vào lô đang làm (C-0068 Victory, C-0073 logo, C-0076 safe zone): **một nhánh, một report**. Report cần ảnh 1080×1920 các màn question (câu dài nhất), question-hud, reveal, victory, victory-tie, top10, đặt cạnh `assets-local/ref/storm-arena-ref.png` và `ref/victory-ref-2.webp`.

1. **Bám ref toàn cảnh** (`ref/storm-arena-ref.png`). Tự so từng vùng theo thứ tự header → khung câu hỏi → Top10 → MC + ô thoại → khán đài. Liệt kê trong report các điểm còn lệch so với ref, kèm lý do nếu không làm được.
2. **Logo trên cùng quá bé.** Làm to như ref, chiều ngang khoảng ≥40 % khung. Logo được miễn luật safe-zone (quyết định của người dùng).
3. **Vòng đếm ngược che chữ câu hỏi dài.** Ví dụ thật: "Trong giao tiếp của trò chơi, từ 'squad' thường chỉ điều gì khi người chơi cùng nhau tham gia một trận?". Cách sửa:
   - Đưa vòng đếm ra khỏi vùng chữ: ngồi trên viền khung hoặc cùng hàng với nhãn "CÂU HỎI n".
   - Hoặc chừa padding phải cho vùng chữ.
   - Dù chọn cách nào: không chồng lên chữ ở bất kỳ độ dài câu nào.
4. **Ô đáp án bị cắt chữ.** "…bộ sưu tập" và "…hành trang" bị cụt dòng cuối. Đáp án phải hiện đủ: tự co font hoặc tăng chiều cao ô, tối đa 3 dòng. Thêm test e2e với đáp án dài nhất trong gói DEMO.
5. **Bỏ icon sét trong ô thoại MC.** Nó chiếm chỗ mà không có tác dụng. Ô thoại co theo nội dung và chữ to hơn. Sau này ô thoại hiện kèm voice (M16).
6. **Victory chưa có trên bản đang chạy.** Ưu tiên chốt C-0068: chibi toàn thân đứng TRÊN bục, bảng tên lục giác dưới chân, đúng `ref/victory-ref-2.webp`.
7. **MC cần nhiều tư thế theo nhịp chương trình.** Hiện chỉ có 1 ảnh tĩnh, các thư mục `assets-local/mc/kelly/{welcome,ask,react,celebrate,idle}` đang trống, người dùng sẽ bổ sung PNG.
   - Trong lúc chờ: ảnh tĩnh phải đổi chuyển động theo phase:
     - welcome: vẫy / nhún;
     - ask: nghiêng người tới;
     - reveal: giật mình / phóng to;
     - leaderboard / victory: nhảy ăn mừng;
     - idle: thở.
   - Có thể dùng thêm ảnh thứ hai từ `assets-local/cards/the-chien-dau-ffvn-kelly.png` (cắt nền) nếu hợp.
   - Khi có thư mục pose nào thì tự dùng thư mục đó, không cần sửa code.

Không đụng engine / server. Giữ test xanh (typecheck, test, e2e).
