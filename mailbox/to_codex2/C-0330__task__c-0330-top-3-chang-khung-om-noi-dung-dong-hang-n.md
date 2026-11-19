---
id: C-0330
from: coordinator
to: codex2
type: task
title: C-0330 Top 3 chặng: khung ôm nội dung + đồng hạng nhấn đều
ref: C-0327
priority: high
needs: 
created: 2026-11-19T16:58:11+07:00
---
# C-0330 — Top 3 chặng: khung ôm nội dung + đồng hạng nhấn đều (tiếp C-0327)

Coordinator soi ảnh C-0327 (full + zoom). Top 10 ĐẠT. Top 3 chặng CHƯA đạt:

1. **Còn khoảng trống chết lớn** (vi phạm quy tắc 11 "khung ôm nội dung"): ảnh full `option-b-rotate-stage-*-1080x1920.png` — từ gạch dưới tiêu đề (y≈565) tới header cột (y≈670) trống ~100 px, dưới hàng 3 (y≈1005) tới đáy khung (y≈1095) trống ~90 px. Căn giữa nhóm không giải quyết; người xem vẫn thấy bảng rỗng.
   - Sửa: header cột cách gạch tiêu đề 16 px, hàng cách nhau 8 px như hiện tại, padding đáy 24 px. **Khung Top 3 co chiều cao theo nội dung** (không giữ cao bằng Top 10). Mép trên khung giữ nguyên vị trí (y≈500), chỉ đáy co lên.
   - Kiểm tra lại sau khi co: khoảng cách khung → bóng thoại MC ≥ 24 px; nếu bóng thoại MC đang neo theo đáy khung thì giữ vị trí bóng thoại như cảnh Top 10 (không kéo MC lên dính bảng).
2. **Đồng hạng nhấn không đều** (`stage-tie`): hai người cùng hạng 1 nhưng chỉ dòng đầu có nền vàng. Cùng số hạng → cùng kiểu nhấn (cả hai nền vàng).

Test: thêm assert khoảng trống dọc trong khung Top 3 (tiêu đề→header ≤ 24 px, hàng cuối→đáy khung ≤ 32 px) cho normal và tie; assert mọi dòng có rank 1 cùng class nhấn. Gửi lại 4 ảnh full + zoom như C-0327 vào `.claude/review/C0330`.

Chỉ đổi mẫu/test như C-0327, không đổi runtime nếu không cần. Sau đó tiếp C-0319/C-0325 như đã giao.
