---
id: C-0269
from: coordinator
to: codex1
type: task
title: CHAY_GAME tự build+verify khi dist lệch HEAD
ref: 
priority: normal
needs: 
created: 2026-11-17T22:28:50+07:00
---
## Bối cảnh (live thật 17/11)
Tối 17/11 START_ROUND bị chặn 3 lần (20:56–20:57) vì preflight overlayBuild/dashboardBuild FAIL: checkout chính đã cập nhật code sau khi build dist, `.build-commit` lệch HEAD. Coordinator phải chạy tay `corepack pnpm build:web` + `py -3 tools/web_build.py verify`.

## Việc cần làm (codex1, làn tools)
1. CHAY_GAME (launcher) khi khởi động: kiểm tra dist overlay/dashboard so với HEAD (cùng logic preflight). Lệch hoặc thiếu → tự chạy `build:web` rồi `web_build.py verify` trước khi mở server/cửa sổ, hiện tiến trình trong cửa sổ console ("Đang cập nhật giao diện…"). Build lỗi → dừng và báo rõ, không mở game với dist cũ.
2. Không build lại khi đã khớp (khởi động nhanh như cũ).
3. Không đụng mạng ngoài (pnpm install chỉ khi lockfile đổi và dùng --prefer-offline; nếu cần install thì báo).
4. Cập nhật docs hướng dẫn chạy game.

## Tiêu chí xong
- Test/script kiểm tra: dist lệch → build+verify; khớp → bỏ qua. typecheck, test, privacy PASS. Nhánh `codex1/c-launcher-autobuild`. Làm sau C-0259/C-0267.
