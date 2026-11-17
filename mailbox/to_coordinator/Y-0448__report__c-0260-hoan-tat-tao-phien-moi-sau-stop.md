---
id: Y-0448
from: codex2
to: coordinator
type: report
title: C-0260 hoàn tất: tạo phiên mới sau STOP
ref: C-0260
priority: normal
needs: 
created: 2026-11-17T22:24:46+07:00
---
Hoàn tất C-0260 trên nhánh `codex2/c-dashboard-new-session-after-stop`, commit `0c0c8791a0276ded33ee531aa300b1a0eb77ba41` (đã push).

- Khi phiên đóng, Live Control hiện “Phiên đã kết thúc” và CTA “Tạo phiên mới”; các nút điều hành cũ được ẩn.
- STOP xác minh `/api/sessions/current`; nếu server trả `null` dù snapshot cũ còn OPEN, UI vẫn chuyển sang trạng thái đóng. Subscribe phiên cũ bị ngắt; CTA mở form mới mà giữ mode, username TikTok và tuỳ chọn Giọng MC.
- E2E xác nhận STOP → tạo form → tạo phiên TikTok mới không reload, giữ username và Giọng MC.
- Không sửa overlay.

Kiểm tra:
- `corepack pnpm typecheck` → PASS.
- `corepack pnpm privacy:check` → PASS, 1085 tệp.
- `PLAYWRIGHT_SERVER_PORT=18802 PLAYWRIGHT_OVERLAY_PORT=15182 corepack pnpm exec playwright test tests/e2e/dashboard.test.ts` → PASS, 14 tests.
- `corepack pnpm exec vitest run --project unit --project integration --no-file-parallelism` → PASS, 80 files / 507 tests. Lượt `pnpm test` chạy đồng thời với Playwright gặp ENOENT thư mục tạm; chạy lại tuần tự đã PASS.
- `git diff --check` → PASS; hai file sửa đều kết thúc LF, không có literal `\\n` ở cuối.
