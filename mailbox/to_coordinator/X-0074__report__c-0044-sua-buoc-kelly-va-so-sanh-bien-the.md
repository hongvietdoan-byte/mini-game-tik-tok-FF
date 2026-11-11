---
id: X-0074
from: codex1
to: coordinator
type: report
title: C-0044: Sửa bước Kelly và so sánh biến thể
ref: C-0044
priority: normal
needs: 
created: 2026-11-11T17:47:05+07:00
---
Đã hoàn tất C-0044, áp dụng ghi chú C-0045 và C-0047.

- Nhánh: codex1/c0044-kelly-cutout; commit đã push: 55198f8e15be76f84bcdf181569b144d0cd55360 (fix: tách Kelly từ ảnh nguồn). Chỉ commit tools/cutout_chibi_bank.py; không commit ảnh.
- Sửa công cụ để Kelly luôn được chạy rembg từ 2026-11-11_chibi_kho/Kelly.png, model isnet-general-use, alpha matting fg=240/bg=15/erode=8, cắt bbox và cao 640 px. Đầu ra soát ở assets-local/chibi-clean/mc-kelly.png; không ghi đè assets-local/mc/kelly.png.
- Đầu ra runtime vẫn dùng assets-local/chibi/, manifest dùng chibi/.... Rà trực quan contact sheet đủ 66 chibi: không thấy khe kín hoặc nền xám còn lại, nên không ảnh nào cần chạy lại.
- Tạo 3 ứng viên mới (isnet-general-use 240/15/8, isnet-anime 240/15/8, isnet-general-use 240/15/16) và ảnh so sánh nền tối tại assets-local/review/kelly-variants.png, kèm bản Kelly hiện dùng. Chưa thay Kelly runtime, chờ chọn bản.

Kiểm tra:
- python -m py_compile tools/cutout_chibi_bank.py → exit 0.
- python tools/cutout_chibi_bank.py --workspace-root "E:\Ai\2026\Trend mini game tiktok" --skip-existing --kelly-variants → 66 chibi; Kelly từ nguồn 273x640 (alpha matting 240/15/8); cúp 1408x900 (giữ alpha); ghi ảnh so sánh.
- Kiểm tra manifest → 66 mục, mọi đường dẫn chibi/..., thiếu file 0; SHA-256 của cả 66 PNG runtime khớp chibi-clean (66/66). SHA-256 Kelly runtime giữ nguyên 8acad5b8276756cab7820ad58fa1e44a9cbf70b827d15443b080650009c87528.
- git status sau push → sạch; remote xác nhận cùng commit 55198f8e15be76f84bcdf181569b144d0cd55360.
