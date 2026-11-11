---
id: Y-0142
from: codex2
to: coordinator
type: report
title: C-0080 đã hoàn tất: overlay ref review, READING và Victory
ref: C-0080
priority: high
needs: 
created: 2026-11-12T00:28:13+07:00
---
Đã hoàn tất C-0080, gộp phần Victory C-0082 và các cập nhật ưu tiên cao C-0089 trên nhánh `codex2/c0068-victory-ref`.

Commits đã push: `1d6bbd8` (Victory vòng 2), `540168f` (question/READING và kiểm tra tổng thể).

Đã xử lý:
- Question timer nằm riêng trên viền, không chạm chữ prompt dài; danh sách dài chuyển một cột, chữ co vừa thẻ. E2E kiểm cả hai lựa chọn kết thúc bằng “hành trang” và “bộ sưu tập”, đo tối đa 3 dòng và không tràn khung.
- READING giữ câu hỏi + bốn lựa chọn, ẩn timer nhận đáp án/bộ đếm, hiện “MC ĐANG ĐỌC”; MC chạy state ask.
- Bỏ tia sét trong ô MC; CSS có idle/welcome/ask/react/celebrate để tạo chuyển động theo phase từ ảnh Kelly hiện có.
- Mock bảng xếp hạng dùng tên và điểm mẫu sự kiện; XSS được tách thành `top10-xss` để ảnh nghiệm thu phản ánh nội dung người xem.
- Victory theo C-0089: bảng tên sáng/rộng 320px sát chân, chữ 34px/điểm 28px, vương miện và laurel theo màu hạng, phản chiếu điểm, bỏ medal tròn, cúp phóng ngang 1,5×, nền trên tối hơn, confetti lớn/dày hơn, ẩn MC.
- Safe-zone test được cập nhật cho READING, logo ≥40% chiều ngang và Victory không còn MC.

Kiểm tra trên Edge (`channel: msedge`):
- `corepack pnpm --filter @quiz/overlay build` — thành công, 49 modules.
- `corepack pnpm typecheck` — thành công.
- `corepack pnpm test:unit` — 23 files, 196 tests passed.
- `corepack pnpm exec playwright test` — 48 passed (dashboard, server replay, scene overlay, FPS, safe-zone).

Ảnh 1080×1920 và so sánh ref/render nằm trong `test-results/c0080-review/`: `question-longest.png`, `question-long-answer.png`, `question-hud.png`, `reveal.png`, `top10.png`, `reading.png`, `victory.png`, `victory-tie.png`; các cặp so sánh là `comparison-question-longest.png`, `comparison-question-long-answer.png`, `comparison-question-hud.png`, `comparison-reveal.png`, `comparison-top10.png`, `comparison-reading.png`, `comparison-victory.png`, `comparison-victory-tie.png`.

Các lệch còn lại so với ref:
1. Header dùng logo BVĐC SVG/CSS hiện có, rộng khoảng 40,7%; không thêm chữ Free Fire theo chốt C-0089. Bố cục logo nhiều lớp trong ref chưa có asset độc lập tương ứng.
2. Background question còn là hiệu ứng bão CSS; ref có sân vận động, mây/sét và ánh sáng raster phức tạp. Không dùng ảnh ref toàn màn làm nền vì đó là ảnh mẫu đã chứa toàn bộ UI, không phải asset nền riêng.
3. Top10/question/answer giữ cấu trúc hiện tại của app, chưa đạt hình khung panel và neon chi tiết như ref.
4. Kelly dùng ảnh bán thân hiện có nên không có đúng pose chỉ tay như ref; CSS tạo nhịp chuyển động nhưng không thay pose ảnh. Ghế audience hiển thị chibi phía trước thay vì tóc/gáy như ref do kho chibi hiện tại không có bộ ảnh lưng đầu.
5. Victory background và nhân vật khác ref; theo C-0089 coordinator chấp nhận hai khác biệt này. Logo giữ BVĐC và không thêm Free Fire; MC đã ẩn theo yêu cầu mới.

Preview live đang mở: `http://127.0.0.1:5181/?mock=victory`.
