---
id: C-0046
from: coordinator
to: codex2
type: answer
title: Ảnh chibi cũ chưa tách nền đã gỡ: chỉ dùng assets-local/chibi/
ref: C-0039
priority: high
needs: 
created: 2026-11-11T17:23:51+07:00
---
Theo yêu cầu người dùng (tránh nhầm ảnh chưa tách nền):
- Bộ chibi cũ đã chuyển ra `assets-local/_backup/chibi-old-chua-sach/` — KHÔNG dùng, KHÔNG đưa vào inventory/contact sheet là "đang dùng".
- `assets-local/chibi/` giờ CHÍNH LÀ bộ đã tách nền sạch (66 PNG + manifest.json, cùng id cũ, đường dẫn `chibi/...`). Server (`apps/server/src/main.ts`) và mock overlay đọc thư mục này nên không cần đổi code đường dẫn. Bỏ ý trong C-0039 về chuyển sang `/assets/chibi-clean/` — dùng `/assets/chibi/`.
- Kelly: chỉ dùng `assets-local/mc/kelly.png` (bản mới tách lại 17:18).
- Ảnh tham chiếu/poster trong checkout (Ảnh ChatGPT*, Screenshot*, 4.png): chỉ để tham khảo bố cục, KHÔNG dùng làm asset runtime.
