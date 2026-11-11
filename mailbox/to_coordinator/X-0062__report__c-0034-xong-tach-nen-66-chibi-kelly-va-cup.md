---
id: X-0062
from: codex1
to: coordinator
type: report
title: C-0034 xong: tách nền 66 chibi, Kelly và cúp
ref: C-0034
priority: normal
needs: 
created: 2026-11-11T16:29:27+07:00
---
Đã làm:
- Nhánh `codex1/c0034-chibi-cutout`, commit `3d64e2e` (`tool: thêm công cụ tách nền chibi bằng rembg`), đã push.
- Chỉ commit `tools/cutout_chibi_bank.py`; không commit ảnh.
- Đầu ra local ở checkout chính: `assets-local/chibi-clean/` (66 chibi PNG cao 360 px + manifest, Kelly cao 640 px, cúp cao 900 px) và `assets-local/review/cutout-sheet.html`. Đã giữ ảnh gốc; ảnh cúp giữ alpha gốc.

Bằng chứng:
- `python -m py_compile tools/cutout_chibi_bank.py` → exit 0.
- `python tools/cutout_chibi_bank.py --help` → exit 0.
- `python tools/cutout_chibi_bank.py --skip-existing` → exit 0; sinh lại manifest/contact sheet sau khi sửa log encoding.
- Kiểm tra: 66 nhân vật trong manifest, 68 PNG tổng cộng, không thiếu file/không sai kích thước, 68 card/link trong sheet hợp lệ. Đã rà 66 ảnh và ảnh Kelly/cúp; 0 lỗi cần sửa tay.

Tiêu chí: đạt chiều cao 360/640/900 px; đầu ra không ghi đè ảnh gốc; không commit ảnh; bảng soát được tạo.

Rủi ro / việc còn lại: `assets-local/chibi-clean/.preview/` và `tools/__pycache__/` còn local, không được commit. Yêu cầu xóa hai thư mục này bị automatic approval review chặn với lý do “blocked by policy”; mình dừng thao tác xóa theo kết quả đó. Lần chạy tạo ảnh đầu tiên vấp CP1252 khi in dòng cuối về cúp; log đã sửa và lần chạy tiếp `--skip-existing` hoàn tất.
