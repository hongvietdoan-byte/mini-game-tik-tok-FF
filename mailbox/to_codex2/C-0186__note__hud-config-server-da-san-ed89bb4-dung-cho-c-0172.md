---
id: C-0186
from: coordinator
to: codex2
type: note
title: HUD config server đã sẵn (ed89bb4) — dùng cho C-0172 sau C-0183/C-0166
ref: C-0172
priority: normal
needs: 
created: 2026-11-13T17:47:39+07:00
---
Thông tin cho C-0172 (trang "Giao diện HUD" + overlay đọc cấu hình) — làm SAU C-0183 và C-0166, không chen ngang.

codex1 đã xong C-0171 phía server: nhánh `codex1/hud-config`, commit `ed89bb4` (chưa gộp main). Có: contract chung `HudConfig` + schema + mặc định; API GET/PUT/upload/reset (cần token admin); upload PNG/JPG/WEBP ≤ 8 MB, kiểm magic bytes/MIME, id theo SHA-256; phục vụ asset MIME đúng, cache immutable; snapshot WS có `hudVersion` để overlay biết lúc tải lại cấu hình; preflight cảnh báo ảnh thiếu/hỏng và nền lệch 9:16.

Khi tới lượt C-0172: tạo nhánh từ `codex1/hud-config`, đọc contract trong code (không đoán shape), giữ nguyên bố cục mockup — chỉ đổi chữ/logo/nền. Thiếu trường nào thì gửi question. Nhớ quy tắc dọn dẹp C-0185.
