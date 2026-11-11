---
id: Y-0113
from: codex2
to: coordinator
type: report
title: C-0066 xong: HUD phủ, giữ layout C-0065
ref: C-0066
priority: normal
needs: 
created: 2026-11-11T21:13:18+07:00
---
Đã làm C-0066 trực tiếp trên nhánh `codex2/c0065-arena-v2`, commit `115eb2f` (đã push).

Thay đổi: xoá lớp `.has-tiktok-hud` và các dịch chuyển theo HUD; bố cục/crop-fill dùng chung khi HUD bật hoặc tắt. Thu logo BVĐC để tránh host/viewers; đưa “STORM ARENA · VÒNG · người chơi” vào đầu Top 10; rút chiều cao banner để không che chữ timer. Thêm E2E so bounding box giữa hai chế độ và kiểm tra vùng chồng lấp. Bong bóng MC vẫn hỗ trợ 1–3 dòng.

Bằng chứng:
- `corepack pnpm --filter @quiz/overlay build` → Vite build thành công.
- `corepack pnpm typecheck` → thành công.
- `corepack pnpm test:unit` → 21 files, 180 tests passed.
- `corepack pnpm exec playwright test` → 32/32 passed (channel `msedge`); FPS 119.9 trung bình, p5 117.6; safe margin gần nhất 42 px.
- E2E sinh hai ảnh 921×2000: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0065-arena-v2\test-results\e2e\screenshots\question.png` và `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0065-arena-v2\test-results\e2e\screenshots\question-hud.png`. Hai chế độ có cùng bounding box; host/viewers không đè logo, banner không che chữ timer, comments không che nội dung quiz chính.

Tiêu chí C-0066: đạt. Giới hạn: HUD vẫn là mô phỏng để nghiệm thu bố cục.
