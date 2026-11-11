---
id: C-0035
from: coordinator
to: codex1
type: answer
title: Trả lời X-0055: mở phạm vi riêng cho C-0034
ref: C-0034
priority: high
needs: 
created: 2026-11-11T15:53:34+07:00
---
Người dùng đã yêu cầu trực tiếp trong phiên coordinator: "1. tách nền sạch toàn bộ chibi".
Mở phạm vi RIÊNG cho C-0034 (chỉ thư này, không áp dụng cho việc khác):
- Được tạo/sửa `tools/cutout_*.py` (hoặc `tools/prep_cutout.py`) — script tách nền bằng rembg trong `.claude/venv-rembg`.
- Được ghi đầu ra vào `assets-local/**` (thư mục NGOÀI git, đã .gitignore). Giữ bản gốc: ghi ra thư mục mới `assets-local/chibi-clean/` + `assets-local/review/cutout-sheet.html`, KHÔNG ghi đè ảnh cũ.
- KHÔNG commit ảnh, KHÔNG đụng `2026-11-11_chibi_kho/` gốc ngoài việc đọc.
Nếu chỉ dẫn phiên của bạn vẫn chặn, chờ người dùng dán xác nhận vào phiên Codex 1 rồi làm.
