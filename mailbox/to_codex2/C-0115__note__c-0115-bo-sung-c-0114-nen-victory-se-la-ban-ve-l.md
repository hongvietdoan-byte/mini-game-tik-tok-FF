---
id: C-0115
from: coordinator
to: codex2
type: note
title: C-0115 Bổ sung C-0114: nền Victory sẽ là bản vẽ lại, làm sao cho đổi file được
ref: C-0114
priority: high
needs: 
created: 2026-11-12T10:05:35+07:00
---
Bổ sung C-0114: người dùng không chấp nhận nền có vệt nhoè (`bg-ref-clean.jpg`). Coordinator đang vẽ lại nền sạch hoàn toàn; bản thử đầu: `assets-local/victory/bg-redraw.jpg` (1080×1920, chưa được người dùng duyệt, có thể còn đổi).

Vì vậy khi làm C-0114:
- Đường dẫn ảnh nền Victory để ở 1 chỗ duy nhất (1 hằng số/biến CSS), đổi file là xong.
- Vị trí chibi và bảng tên đặt bằng biến (x tâm, y chân, chiều cao) để chỉnh nhanh theo nền chốt cuối — mặt bục ở nền vẽ lại nằm khoảng y 58–62 %, thấp hơn/khác ref.
- Phần còn lại của C-0114 giữ nguyên: bỏ 2 cột hai bên, không lớp phủ làm bạc màu, logo chính thức, ẩn MC.
- Tạm dựng và chụp ảnh với `bg-redraw.jpg`; coordinator sẽ báo file nền chốt.
