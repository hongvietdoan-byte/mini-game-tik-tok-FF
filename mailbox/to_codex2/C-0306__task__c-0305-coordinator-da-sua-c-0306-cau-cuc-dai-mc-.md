---
id: C-0306
from: coordinator
to: codex2
type: task
title: C-0305 coordinator đã sửa; C-0306: câu cực dài + MC che INTERMISSION/ROUND_WINNER
ref: C-0305
priority: normal
needs: 
created: 2026-11-19T02:33:25+07:00
---
**C-0305 (chibi lệch ghế): coordinator đã tự sửa, main `5684c687`. Bạn KHÔNG cần làm phần ghế nữa.** Nếu đã sửa dở trên nhánh thì bỏ phần ghế đó đi, rebase lên main mới.

Nguyên nhân: luật C-0295 `.v3-seat[data-row-index]:not([data-row-index="0"]) .v3-chibi-img { scaleY(0.85); transform-origin: 50% 0% }` ép dẹt chibi các hàng 1–6 và kéo chân lên. Đo chân chibi so với mép trên đệm ghế: bản cũ +11…+20 px (đè lên đệm, đúng mẫu), bản lỗi −21 px (lơ lửng).

Đã làm:
- Bỏ luật trên.
- Đổi bất biến trong `tests/e2e/c0295-top-row-seating.spec.ts`. Bất biến cũ ("tên hàng dưới không được chạm chibi hàng trên") **trái với mẫu 14/11**, nơi tên chạm thân chibi hàng trên là đúng. Bất biến mới: chibi phải đè lên đệm ghế của chính ô đó 5–40 px và canh giữa ±6 px.
- Đã gắn lại luật lỗi để thử: test FAIL đúng. Bỏ luật thì PASS.

**Rút kinh nghiệm cho mọi việc UI sau:**
- Khi một bất biến test buộc phải đổi giao diện khác mẫu đã duyệt, thì đó là bất biến sai. Báo coordinator, không chỉnh giao diện cho qua test.
- Ảnh review phải tự phóng to vùng vừa đổi và đặt cạnh mẫu trước khi báo PASS.

**Việc tiếp theo (C-0306), làm trước Phase 4b.** Coordinator đã chụp main và thấy 3 lỗi:
1. **Câu hỏi cực dài** (`?mock=question-longest`):
   - Dòng cuối bị cắt sát mép dưới khung câu hỏi. Ellipsis phải nằm trọn trong khung.
   - Nhãn đỏ "CÂU HỎI QUÁ DÀI – CẦN RÚT GỌN" đang hiện **trên overlay người xem**. Nhãn này chỉ được hiện trên Dashboard, hoặc ở overlay `role=preview` nếu cần, không bao giờ ở `role=program`.
2. **INTERMISSION** (`?mock=intermission`): bong bóng MC che đồng hồ đếm ngược nghỉ giữa vòng. Lời trong bóng là "Trả lời bằng cách comment A, B, C hoặc D…", sai ngữ cảnh. Yêu cầu:
   - Đồng hồ phải lộ đủ.
   - Lời MC ở cảnh này phải hợp ngữ cảnh (nghỉ giữa vòng, chuẩn bị chặng sau).
   - Không dời hay đổi kích thước khung chính. Nếu bắt buộc phải dời bong bóng thì gửi 2 phương án ảnh để người dùng chọn trước.
3. **ROUND_WINNER** (`?mock=round-winner`): bong bóng MC cũng mang lời "Trả lời bằng cách comment…", sai ngữ cảnh, và che cúp. Sửa lời cho đúng ngữ cảnh. Vị trí MC gửi phương án ảnh như mục 2.

Test cần có:
- e2e đo bbox: ellipsis/text nằm trong khung; đồng hồ INTERMISSION không bị phần tử nào che; nhãn cảnh báo không có trong `role=program`.
- Ảnh phóng to từng vùng, đặt cạnh mẫu.

Chạy full vitest (gồm load), e2e, typecheck, privacy. Push nhánh mới, báo commit.
