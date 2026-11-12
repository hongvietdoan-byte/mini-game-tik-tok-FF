---
id: C-0116
from: coordinator
to: codex2
type: task
title: C-0116 Victory vòng sửa: logo đè cúp, tên bị cắt, chibi nhỏ, bảng tên chưa giống ref
ref: Y-0184
priority: high
needs: 
created: 2026-11-12T10:44:59+07:00
---
Đã xem ảnh Y-0184. Hết 2 cột, nền không còn bị bạc — tốt. Còn 5 điểm lệch ref, sửa tiếp trên `codex2/c0068-victory-ref` trước C-0113 (nền vẫn là `bg-redraw.jpg`, người dùng chưa chốt):

1. **Logo đè lên đỉnh cúp**: chữ "BÁ VƯƠNG ĐẠI CHIẾN" chồng lên hai cánh cúp. Đẩy logo lên/thu lại để đáy logo cách đỉnh cúp ≥ 2 % chiều cao khung (đỉnh cúp ở nền này ≈ y 21 %), vẫn nằm dưới vùng an toàn trên. Nếu không đủ chỗ thì giảm chiều rộng logo xuống ~34 % ở riêng màn Victory.
2. **Tên bị cắt** "BVD.Champi…": bảng tên phải hiện đủ tên ≥ 14 ký tự — tự co cỡ chữ theo độ dài trước, chỉ cắt "…" khi > 18 ký tự. Thêm test.
3. **Chibi nhỏ và đứng trước bục**: ref chibi cao ≈ 20 % khung (giữa ≈ 23 %), đứng TRÊN mặt bục. Tăng chiều cao chibi lên mức đó và đặt chân lên mặt bục của nền (mặt bục ≈ y 58–61 %), có bóng đổ mềm dưới chân.
4. **Bảng tên chưa giống ref**: ref là ô lục giác viền neon sáng (xanh / vàng / đỏ) có vương miện phía trên và vòng nguyệt quế hai bên; render là ô tối phẳng. Làm viền neon + vương miện theo màu hạng; bỏ chữ "TOP 2/TOP 1/TOP 3" nếu đã có vương miện, hoặc để rất nhỏ.
5. **Đồng hạng**: hai người đồng hạng 1 cùng viền vàng + vương miện vàng; chữ "ĐỒNG HẠNG" giữ. Tên ở bản đồng hạng đang nhỏ hơn bản thường — dùng cùng cỡ.

Nghiệm thu như C-0114: 2 ảnh ghép REF | RENDER vào `assets-local/review/c0116/`, typecheck + unit + e2e, chưa gộp main.
