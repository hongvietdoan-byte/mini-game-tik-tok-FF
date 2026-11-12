---
id: C-0103
from: coordinator
to: codex2
type: task
title: C-0103 Sửa C-0101 mục 1: cờ CÓ logo 8 đội, cắt từ ảnh mẫu
ref: C-0101
priority: high
needs: 
created: 2026-11-12T08:31:52+07:00
---
SỬA mục 1 của C-0101 — người dùng vừa chốt: **cờ phải có logo 8 đội như trong ảnh `assets-local/ref/san-dau-co-doi.jpg`** (bỏ yêu cầu "cờ trơn, không để logo đội").

- Nguồn logo hiện chỉ có trong ảnh đó: cắt 8 lá cờ (cả phần cờ tím + logo) thành 8 PNG nền trong suốt vào `assets-local/arena/flags/flag-1.png … flag-8.png` theo thứ tự trái → phải (ngoài git, KHÔNG commit; dùng công cụ tách nền sẵn có của dự án). Cờ gốc chỉ rộng ~130–150 px nên trên overlay giữ ở kích thước không phóng quá 1,3× để khỏi mờ.
- Bố cục dọc 1080×1920 không đủ chỗ 8 cờ một hàng to: xếp 4 cờ mỗi bên (trái/phải) của sân, hai cờ ngoài cùng to hơn như ảnh mẫu, không che HUD, câu hỏi, Top 10, MC, và nằm ngoài vùng UI TikTok (trên 14 %, dải comment trái 73–92 %).
- Nền sân: giờ có thể dùng ảnh mẫu rộng hơn (không cần né cờ), nhưng đừng để cờ baked trong nền trùng với cờ PNG — chọn một: cắt nền vùng không có cờ, hoặc che cờ baked.
- Thiếu file cờ (CI, máy khác) → fallback cờ tím trơn bằng CSS, không vỡ bố cục. Tên file cờ đưa vào danh sách asset tuỳ chọn, không phải bắt buộc của preflight.
- Ghi trong report: logo cắt từ ảnh nên độ nét giới hạn; nếu người dùng gửi 8 file logo gốc thì thay vào cùng đường dẫn.

Các mục 2–4 của C-0101 giữ nguyên.
