---
id: C-0401
from: coordinator
to: codex2
type: task
title: C-0397 chưa đạt: sơ đồ/ảnh soi/tên thư mục/nhóm cũ/default.png/test
ref: C-0397
priority: high
needs: 
created: 2026-11-22T21:45:26+07:00
---
# C-0397: coordinator soi kết quả, CHƯA ĐẠT, sửa 6 điểm

Đã xem `assets-local/review/c-theme-full/`. Phần tách 43 khung K có hướng tốt, nhưng **chưa gửi người dùng được**:

1. **Sơ đồ đọc không được.** `SO-DO/QUESTION.png` gần như phủ kín một màu vàng/cam. Các khung chính (K11 câu hỏi, K14 đáp án, K04 Top 10) không nhìn thấy, nhãn mờ, các slot gần như cùng tông màu.
   Sửa:
   - nền là **ảnh chụp thật** của màn, giữ rõ;
   - mỗi slot chỉ vẽ **viền 3 px màu riêng** (bảng màu xen kẽ, tương phản cao) + nhãn ID có nền đặc, chữ ≥ 18 px, đặt ở góc trong bbox, không đè nhãn khác;
   - **không phủ màu kín**;
   - slot toàn màn (nền, H08…) chỉ ghi chú trong chú thích bên cạnh, không vẽ viền;
   - mỗi màn có bảng chú thích ID → tên tiếng Việt.

2. **Ảnh soi vô dụng.** `soi/K14.png` chỉ là một nền gradient xanh, không thấy ô đáp án nào.
   Sửa: ảnh chụp thật của màn, phần ngoài slot làm tối ~70 %, slot giữ sáng + viền đỏ + đường đo kích thước (rộng × cao) + toạ độ x, y. **Mỗi slot một ảnh soi**, không chỉ 5 ảnh mẫu.

3. **Tên thư mục và ID.**
   - Tên đang là tên class CSS (`I05-v3-question-top3-v3-top3-row-data-rank-1-v3-top3`). Đổi thành tên ngắn tiếng Việt không dấu, ví dụ `K14-o-dap-an`, `I04-huy-hieu-hang`.
   - **ID đang trùng:** I01 (2 thư mục), I04 (2), I05 (2), H04 (2), K27 (2). Mỗi ID chỉ một thư mục; trạng thái khác nhau là file khác nhau trong cùng thư mục (`thuong.png`, `dung.png`, `sai.png`, `mo.png`).
   - `DOC-TOI.txt` thêm dòng "Tên: <mô tả tiếng Việt>".

4. **Nhóm N/V/L/A chưa xếp lại.** `arena/`, `brand/`, `chibi/`, `mc/`, `throne/`, `victory/`, `audio/` vẫn để thư mục cũ, chưa đánh số. Xếp lại theo brief (`assets/N-nen/N01-nen-sanh/`…, `V-nhan-vat/`, `L-thuong-hieu/`, `A-am-thanh/`), mỗi món có `DOC-TOI.txt`. Theme cũ vẫn chạy được (migrate tự động hoặc đọc cả đường dẫn cũ).

5. **Ảnh `default.png` cắt sai lớp.** Mỗi ảnh chỉ được chứa đúng phần tử đó, phần ngoài hình phải trong suốt:
   - K12/K13 đồng hồ: chỉ có ô vuông, **thiếu vòng tròn**;
   - K22/K33 ngai: ô vuông tối, không ra hình ngai;
   - K27-v3-full-row: ảnh RGB, không có kênh alpha;
   - K19, K24, K28, K29, K30, K34: dính nền tối đặc, có vẻ chụp lẫn nền sân khấu.

   Kiểm từng ảnh: ghép lên nền xám phải thấy đúng hình khung với viền và góc bo. Gửi kèm ảnh ghép tất cả `default.png` trên nền xám (`default-contact.png`).

6. **Test:**
   - vitest phải chạy **đủ** unit + integration (lần này chỉ chạy 3 file);
   - Playwright asset thật chạy **2 lần liên tiếp**, đều 0 failed (yêu cầu ở C-0398).

Làm xong thì push cùng nhánh và báo lại kèm đường dẫn ảnh duyệt mới.
