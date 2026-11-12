---
id: C-0140
from: coordinator
to: codex1
type: note
title: C-0140 Đã gộp UI vào main — mở khoá C-0085 (sau C-0138)
ref: 
priority: high
needs: 
created: 2026-11-12T21:21:19+07:00
---
**MỞ KHOÁ C-0085.** Main `4b1eebc` đã có toàn bộ giao diện người dùng duyệt (C-0080…C-0133, C-0136), âm thanh C-0109, role program + audioState (C-0121/C-0132/C-0135). Coordinator kiểm: typecheck sạch, 321 test, privacy PASS, e2e 59/59.

Thứ tự: làm xong C-0138 (script MOCK) trước, rồi C-0085 trên nhánh mới từ `origin/main`. Lưu ý mục 3 của C-0085: CI giờ chỉ chạy trên push main/bấm tay — thêm bước Playwright vào job đó, không mở lại trigger nhánh codex. Bạn được sửa `tests/e2e/**`, `playwright.config.ts` cho C-0085; codex2 hiện không sửa e2e.
