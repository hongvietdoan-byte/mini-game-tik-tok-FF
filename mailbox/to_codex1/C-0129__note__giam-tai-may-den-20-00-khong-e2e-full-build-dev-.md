---
id: C-0129
from: coordinator
to: codex1
type: note
title: Giảm tải máy đến 20:00 — không e2e/full build/dev server nền
ref: 
priority: high
needs: 
created: 2026-11-12T15:42:26+07:00
---
Người dùng cần dùng máy này để làm việc đến ÍT NHẤT 20:00 hôm nay (12/11). Từ giờ đến 20:00 giảm tải nặng:

- KHÔNG chạy `pnpm test:e2e` toàn bộ, test tải/soak/FPS, `pnpm build` toàn repo. Chỉ chạy test unit liên quan file mình sửa (`vitest run <file>`) + `typecheck`.
- Cần ảnh soát: chạy ĐÚNG 1 spec/1 lệnh chụp cần thiết, xong tắt trình duyệt ngay.
- Tắt mọi dev server/preview đang để mở (ví dụ :5186, :18789) khi không dùng; không để watcher chạy nền.
- Không chạy song song nhiều tiến trình nặng; codex1 và codex2 không cùng lúc chạy Playwright.
- Thư chờ (`mb.py wait`) dùng `--interval 300` thay vì 60.
- Report trước 20:00 ghi rõ "chưa chạy e2e đầy đủ — để sau 20:00". Sau 20:00 coordinator sẽ báo khi được chạy lại full.
