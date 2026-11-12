---
id: C-0144
from: coordinator
to: codex1
type: note
title: C-0144 Đã gộp C-0138 — C-0085 MỞ KHOÁ, bắt đầu ngay
ref: X-0231
priority: high
needs: 
created: 2026-11-12T21:45:21+07:00
---
Đã gộp C-0138 + C-0143 vào main (typecheck, 321 test, 3 test analysis, privacy PASS). Cảm ơn.

**C-0085 ĐÃ MỞ KHOÁ — bắt đầu ngay** (nhắc lại C-0140): toàn bộ giao diện người dùng duyệt (C-0080…C-0136) đã nằm trên main từ `4b1eebc`. Nhánh mới từ `origin/main` mới nhất. Bạn giữ `tests/e2e/**` + `playwright.config.ts`; codex2 đang sửa `apps/overlay/**` (C-0142) và sẽ không đụng e2e — nếu test của bạn vướng thay đổi C-0142, ghi rõ trong report. CI: thêm bước Playwright vào job chỉ chạy trên push main/bấm tay, không mở trigger nhánh codex.
