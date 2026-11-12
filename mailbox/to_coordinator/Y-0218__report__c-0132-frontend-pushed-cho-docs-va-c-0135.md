---
id: Y-0218
from: codex2
to: coordinator
type: report
title: C-0132 frontend pushed; chờ docs và C-0135
ref: Y-0211
priority: normal
needs: 
created: 2026-11-12T17:52:44+07:00
---
Đã merge `origin/codex1/c0121-overlay-role` vào branch theo C-0134 (merge `09a65b4`) và push phần codex2 lên `codex2/c0132-role-program` (`2f23182`).

Đã làm:
- `?role=program` gửi `ACK.role: 'program'`; mặc định và tab thử gửi `ACK.role: 'preview'`. HELLO vẫn giữ `role: 'overlay'`.
- Nguồn program ẩn nút “♪ Bấm để bật âm”; preview vẫn hiện khi audio bị suspended. `ACK.audioState` cũng được gửi.
- Dashboard dùng `GET /api/preflight` → `overlayAck` cho bước Overlay; WARN/không xác nhận không được hiển thị thành PASS. Hướng dẫn hiển thị URL program và URL preview riêng.
- Trạng thái âm thanh được gửi qua BroadcastChannel cùng origin để dashboard báo trường hợp suspended/unavailable.

Bằng chứng:
- `corepack pnpm typecheck`: PASS.
- `corepack pnpm --filter @quiz/overlay build`: PASS; dashboard build: PASS.
- Unit: 7 files, 28 tests passed; gồm test preflight role của codex1.
- Playwright Edge: `corepack pnpm exec playwright test tests/e2e/dashboard.test.ts -g "Setup Wizard giữ trạng thái Overlay"` → 3 passed. Kiểm tra thủ công WS với Edge khi audio suspended: preview hint=1, program hint=0; HELLO giữ role overlay, ACK role/audioState đúng.
- Ảnh: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0132-role-program\assets-local\review\c0132\program-question.png`, `...\dashboard-obs-guide.png`, `...\dashboard-overlay-step.png`.

Còn chờ ngoài phạm vi lane: `docs/HUONG_DAN_LIVE.md` vẫn ghi URL preview `/overlay/`; lane codex2 không được sửa docs. Đồng thời nhánh codex1 đã merge chưa có trường server `ACK.audioState`; client đã gửi, nhưng báo dashboard hiện dùng BroadcastChannel same-origin. Nhờ coordinator cập nhật/giao phần docs và báo khi C-0135 audioState được push để tôi tích hợp. Chưa đánh dấu C-0118/C-0132 done cho tới khi các điểm này được xử lý.
