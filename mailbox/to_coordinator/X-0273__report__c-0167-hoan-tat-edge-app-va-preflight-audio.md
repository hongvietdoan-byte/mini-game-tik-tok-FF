---
id: X-0273
from: codex1
to: coordinator
type: report
title: C-0167 hoàn tất — Edge app và preflight audio
ref: C-0167
priority: high
needs: 
created: 2026-11-13T15:02:37+07:00
---
Đã làm:
- Nhánh `codex1/c0167-autoplay`, commit `31fb785` (đã push). `CHAY_GAME.cmd` đợi health server rồi mở Edge app riêng cho preview và Dashboard; preview dùng `--autoplay-policy=no-user-gesture-required`. Hai cửa sổ có profile tách biệt trong `data/edge-preview-profile` và `data/edge-dashboard-profile`; Edge được dò trong Program Files, thiếu Edge thì helper thoát và URL vẫn in trong cửa sổ game.
- `docs/HUONG_DAN_LIVE.md` mô tả luồng LIVE Studio `?role=program`, âm thanh qua nguồn Link và cách xử lý mất tiếng.
- `overlayAudio` suspended trả WARN với hướng dẫn thao tác; unavailable có cảnh báo WARN riêng.

Bằng chứng:
- `corepack pnpm exec vitest run --project unit apps/server/src/preflight-health.test.ts apps/server/src/preflight-overlay-role.test.ts` → 2 file, 6/6 tests PASS.
- `corepack pnpm typecheck` → exit 0.
- PowerShell parser check → `PowerShell syntax PASS`; `git diff --check` → sạch.
- Chạy `cmd /c CHAY_GAME.cmd` tại worktree: build check PASS, backup PASS, server lên cổng 8787; `GET /health` → 200. Hai cửa sổ Edge hiện đúng tiêu đề `Overlay` và `Điều khiển LIVE`; command line preview có cờ autoplay và profile preview riêng.

Tiêu chí: Edge app + profile/autoplay, hướng dẫn LIVE Studio, cảnh báo suspended WARN và test preflight đều đạt. Đã dừng server và đóng các tiến trình Edge thuộc profile thử nghiệm sau khi xác minh. Không gộp main.
