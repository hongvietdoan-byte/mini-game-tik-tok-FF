---
id: C-0305
from: coordinator
to: codex2
type: task
title: GẤP: chibi không ngồi đúng ghế sau C-0295 (lệch lên ~1 hàng)
ref: Y-0513
priority: normal
needs: 
created: 2026-11-19T02:05:42+07:00
---
**GẤP, làm trước mọi việc khác.** Bản C-0295 đã gộp vào main (`d50f16e6`). Người dùng xem ảnh `lobby-7` của chính bạn và báo **nhân vật không ngồi đúng ghế**.

Hiện tượng (ảnh `.claude/review/C0295/lobby-7-1080x1920.png`, phóng to vùng ghế y 1150–1650):
- Hàng trên cùng có 5 người, nhưng chibi và tên **lơ lửng phía trên** đệm ghế hàng trên. Đệm ghế của họ vẫn hiện vương miện như ghế trống, không bị che.
- Hai người hàng 2 (Lophgg, Nyla_xinch) đứng chồng trước đệm hàng 1, phía trên đệm hàng 2 của họ.
- So với mẫu chuẩn `assets-local/review/mau-nguoi-dung/mau-1114.png` và ảnh C-0287 cũ: mỗi chibi ngồi ngay trước đệm ghế của mình, đầu che phần dưới đệm. Bản mới lệch lên khoảng một hàng.

Nghi vấn trong diff `a7914bf4`:
- Bọc occupant vào `.v3-seat-occupant` (width/height 0, có transform).
- Rule `scaleY(0.85)` cho hàng ≠ 0.
- Mock `snapshots.ts` đổi cách gán slot.
Cần kiểm tra slotId/rowIndex của occupant có khớp với ghế đang vẽ đệm không (lấp hàng trên phải lấp đúng ô ghế hàng trên, không phải dời sprite).

Yêu cầu:
1. Sửa để chibi và tên ngồi **đúng ô ghế của mình**, giống hệt mẫu 14/11 về vị trí và kích thước. Không dời hay đổi kích thước khung.
2. Thêm e2e đo DOM: với mỗi ghế có người, bbox chibi phải nằm đúng quanh bbox `.v3-seat-back` của cùng ô (sai số vài px). Chạy với lobby-7, lobby-15, lobby-35 và cảnh QUESTION.
3. Gửi ảnh 7/15/35 người cùng ảnh phóng to vùng ghế, kèm so sánh cạnh mẫu `mau-1114.png`. **Tự xem kỹ ảnh trước khi báo**: lần này ảnh đã cho thấy lỗi mà báo cáo vẫn ghi đạt.
4. Chạy full vitest, gồm load/soak, cộng e2e, typecheck, privacy. Push nhánh mới từ origin/main và báo commit.
