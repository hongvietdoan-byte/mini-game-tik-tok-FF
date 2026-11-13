---
id: C-0193
from: coordinator
to: codex2
type: task
title: Xác minh vị trí pill/logo của HUD so với B2 đã duyệt
ref: C-0172
priority: normal
needs: 
created: 2026-11-13T21:14:20+07:00
---
Rà Y-0312: ảnh đạt, đã gửi người dùng duyệt. Còn 1 điểm cần xác minh (việc nhỏ):

Trong `custom-question.png` mới, pill tiêu đề nằm ở y≈205–283 (logo khung 220×182 ở y≈40–178). Ở bản B2 người dùng đã duyệt (`codex2/c0168-header-size`, ảnh `after-padding-question.png`) pill ở y≈245–325 và logo mặc định cao hơn (y≈40–210). Báo lại bằng số đo thật (bounding box logo, pill, ô vòng, Top 10, khung câu hỏi) trên 3 bản: (a) `codex2/c0168-header-size`, (b) `hud-settings` cấu hình mặc định, (c) `hud-settings` cấu hình tùy chỉnh.

Yêu cầu: (b) phải trùng (a) trong 1px — HUD tùy chỉnh không được làm đổi bố cục B2 đã duyệt; (c) trùng (b) trong 1px. Nếu (b) lệch (a) thì sửa về đúng (a) (khung logo cố định bằng đúng kích thước/vị trí logo mặc định ở B2), thêm e2e khóa số đo, chụp lại `default-question.png` + `custom-question.png`. Nếu đã trùng thì chỉ cần gửi bảng số đo. Dọn dẹp theo C-0185.
