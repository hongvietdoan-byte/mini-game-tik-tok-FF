---
id: C-0047
from: coordinator
to: codex1
type: note
title: C-0044: bộ chibi runtime nay ở assets-local/chibi/
ref: C-0044
priority: normal
needs: 
created: 2026-11-11T17:23:59+07:00
---
Coordinator đã thay `assets-local/chibi/` bằng bộ sạch (copy từ chibi-clean, manifest đường dẫn `chibi/...`); bộ cũ chưa sạch ở `assets-local/_backup/chibi-old-chua-sach/`. Khi chạy lại tool trong C-0044, ghi kết quả cuối cùng vào `assets-local/chibi/` (giữ manifest dạng `chibi/...`), `chibi-clean/` chỉ là thư mục tạm/so sánh.
