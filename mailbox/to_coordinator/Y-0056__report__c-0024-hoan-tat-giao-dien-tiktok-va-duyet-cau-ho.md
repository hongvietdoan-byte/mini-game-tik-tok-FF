---
id: Y-0056
from: codex2
to: coordinator
type: report
title: C-0024 hoàn tất giao diện TikTok và Duyệt câu hỏi
ref: C-0024
priority: high
needs: 
created: 2026-11-11T15:53:54+07:00
---
## Đã làm
- Nhánh: `codex2/c0024-tiktok-ui`
- Commit: `04953206e34ba085e82b0243e8cbcd150641d226`
- Thêm tạo phiên Mock/TikTok LIVE, kiểm tra username và số câu đã duyệt, warning cố định; TIKTOK ẩn speedMultiplier/DEMO.
- Thêm Connection Manager hiển thị @username, trạng thái Chưa LIVE, live.detail và ba nút điều khiển.
- Bật lưu username ở Setup Wizard bước 4; thêm màn duyệt với lọc, xác nhận duyệt hàng loạt và yêu cầu lý do từ chối.
- Áp dụng C-0031: speedBonusMax 0–500, mặc định 50, ghi chú; hiển thị trần điểm Kahoot và công thức Classic. Chỉ sửa apps/dashboard/**.

## Bằng chứng
- `corepack pnpm --filter @quiz/dashboard exec vite build --base /dashboard/` → build thành công.
- `corepack pnpm typecheck` → thành công.
- `corepack pnpm test` → 24 file, 192 tests passed.
- `corepack pnpm test:e2e` → 17 passed (Playwright dùng msedge).
- Smoke server thật trên DB tạm: duyệt 10 câu trong UI, tạo phiên TikTok `@c2smokexyz9426`; Connection Manager hiện Chưa LIVE và đủ ba nút. Connector trả `Failed to retrieve Room ID from all sources.` làm live.detail, UI giữ nguyên chi tiết này.
- Tạo form TikTok: speedBonusMax=50, ẩn tốc độ Mock/DEMO, hiện warning và gate câu hỏi.

Ảnh local (không commit):
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0024-tiktok-ui\test-results\c0024\screenshots\01-question-review-pending.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0024-tiktok-ui\test-results\c0024\screenshots\02-question-review-approved-10.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0024-tiktok-ui\test-results\c0024\screenshots\03-tiktok-offline-status.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0024-tiktok-ui\test-results\c0024\screenshots\04-connection-manager.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0024-tiktok-ui\test-results\c0024\screenshots\05-session-tiktok-offline.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0024-tiktok-ui\test-results\c0024\screenshots\06-tiktok-create-form-speedbonus.png`

## Lưu ý
- Root `corepack pnpm build:web` gọi `vite` không có trong PATH tại root; dashboard được build trực tiếp bằng Vite của workspace dashboard như lệnh ở trên.
- Screenshot smoke xác nhận nhãn Chưa LIVE; do username thử nghiệm không trả UserOfflineError, chi tiết gốc của connector là lỗi lấy Room ID.
