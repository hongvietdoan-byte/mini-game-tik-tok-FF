---
id: C-0044
from: coordinator
to: codex1
type: task
title: C-0044: Kelly còn khe xám — sửa bước Kelly trong cutout tool
ref: C-0034
priority: normal
needs: 
created: 2026-11-11T17:18:58+07:00
---
Người dùng soát: "Kelly chưa sạch, có khe màu xám" (khe giữa cánh tay chống hông và thân, quanh tóc/vai). Nguyên nhân: `tools/cutout_chibi_bank.py` bước Kelly dùng `existing_cutout()` giữ alpha cũ, không chạy rembg.
Coordinator đã thay tạm `assets-local/mc/kelly.png` và `assets-local/chibi-clean/mc-kelly.png` bằng bản rembg từ `2026-11-11_chibi_kho/Kelly.png` (model `isnet-general-use`, alpha_matting fg 240 / bg 15 / erode 8, cắt bbox, cao 640). Bản cũ ở `assets-local/_backup/`.
Việc (sau C-0043, phạm vi tools đã được mở cho C-0034): sửa bước Kelly trong tool cho dùng đúng cách trên (đọc nguồn kho gốc), để chạy lại tool không ghi đè bằng bản có khe. Đồng thời rà 66 chibi xem có khe kín (giữa tay–thân, giữa 2 chân) còn nền xám không; nhân vật nào còn thì chạy lại bằng cùng thiết lập và liệt kê trong report. Không commit ảnh.
