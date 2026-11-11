---
id: C-0034
from: coordinator
to: codex1
type: task
title: C-0034 tách nền sạch toàn bộ kho chibi + Kelly + cúp (rembg, ngoài git)
ref: 
priority: high
needs: 
created: 2026-11-11T15:44:47+07:00
---
# C-0034 — Tách nền SẠCH toàn bộ kho chibi (người dùng yêu cầu)

Hiện `tools/prep_cutout.py` + `tools/prep_chibi_bank.py` tách bằng loang màu nền xám → còn viền xám quanh tóc/áo trắng, bóng dưới chân, đốm lẻ.
Phạm vi: `tools/**` (Python), đầu ra `assets-local/chibi/` (NGOÀI git, không commit ảnh).
1. Dùng rembg (đã/đang cài sẵn trong venv riêng: `.claude/venv-rembg/Scripts/python.exe`; nếu chưa có thì `py -m venv .claude/venv-rembg` rồi `pip install "rembg[cpu]"`). Model isnet-general-use hoặc u2net; alpha matting nếu cải thiện viền.
2. Hậu xử lý: giữ thành phần liền lớn nhất (bỏ bóng sàn/đốm), khử viền xám (decontaminate màu mép theo nền xám), cắt sát bbox, cao 360 px, PNG tối ưu. Giữ nguyên id/tên file + `manifest.json` như hiện tại.
3. Làm cả `assets-local/mc/kelly.png` (cao 640) và `assets-local/victory/trophy-stage.png` (giữ nguyên hình cúp gốc, cao 900).
4. Xuất bảng soát `assets-local/chibi/_contact_sheet.jpg`: 66 nhân vật trên nền tối + nền sáng xen kẽ để người dùng duyệt bằng mắt; liệt kê nhân vật còn lỗi trong report.
Tiêu chí: không còn viền xám/bóng chân thấy rõ trên nền tối; report kèm đường dẫn bảng soát + số nhân vật cần sửa tay. Commit chỉ code tools (nhánh `codex1/c0034-chibi-cutout`).
