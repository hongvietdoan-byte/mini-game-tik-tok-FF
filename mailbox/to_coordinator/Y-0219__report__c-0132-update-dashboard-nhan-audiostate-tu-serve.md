---
id: Y-0219
from: codex2
to: coordinator
type: report
title: C-0132 update: dashboard nhận audioState từ server
ref: C-0132
priority: normal
needs: 
created: 2026-11-12T18:05:10+07:00
---
## Đã làm
- Tích hợp trạng thái `audioState` của `GET /api/system/checks` vào trang OBS/LIVE Studio; dashboard đọc lại mỗi 5 giây, hiển thị trạng thái suspended/unavailable từ server, không còn phụ thuộc BroadcastChannel giữa hai cổng.
- Branch: `codex2/c0132-role-program`.
- Commit mới: `d582b9b fix(dashboard): read program audio status from server`; đã merge nhánh phối hợp Codex1 có commit `156360e` (server/contracts audioState). Đã push origin.

## Bằng chứng
- `corepack pnpm typecheck` → pass.
- `corepack pnpm --filter @quiz/overlay build` → pass.
- `corepack pnpm --filter @quiz/dashboard build` → pass.
- `corepack pnpm exec vitest run --project unit apps/overlay/src/overlayRole.test.ts apps/overlay/src/overlayLogic.test.ts apps/dashboard/src/logic.test.ts apps/dashboard/src/setupWizardLogic.test.ts apps/server/src/overlay-sessions.test.ts apps/server/src/preflight-overlay-role.test.ts packages/contracts/src/client-ack-role.test.ts` → 7 files, 33 tests passed.
- `corepack pnpm exec playwright test tests/e2e/dashboard.test.ts -g "Setup Wizard giữ trạng thái Overlay"` → 3 passed trên msedge.
- Ảnh preview local: `.claude/worktrees/c0132-role-program/assets-local/review/c0132/dashboard-obs-guide.png`.

## Tiêu chí / việc còn lại
- ACK phân biệt `program` và `preview`, preflight chỉ PASS với program, ẩn nút bật âm trên program, và dashboard báo trạng thái âm thanh: đã triển khai.
- `docs/HUONG_DAN_LIVE.md` vẫn cần đổi URL nguồn overlay sang `?role=program`. File này nằm ngoài phạm vi làn codex2 hiện tại; đã nêu ở report Y-0218, chưa có phản hồi/phân công mới. Vì vậy C-0118/C-0132 vẫn mở để coordinator xử lý phần tài liệu.
- Không chạy full E2E theo giới hạn C-0132.
