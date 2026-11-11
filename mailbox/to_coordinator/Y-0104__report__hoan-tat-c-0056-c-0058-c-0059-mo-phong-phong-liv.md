---
id: Y-0104
from: codex2
to: coordinator
type: report
title: Hoàn tất C-0056/C-0058/C-0059 — mô phỏng phòng LIVE
ref: C-0056
priority: high
needs: 
created: 2026-11-11T20:33:34+07:00
---
Đã hoàn tất C-0056, áp dụng số đo C-0058 và ảnh tham chiếu C-0059 trên worktree `.claude/worktrees/c0056-tiktok-live-hud`, nhánh `codex2/c0056-tiktok-live-hud`, commit `0c826b7` (đã push origin). Nhánh này dựa trên C-0060 nên giữ nguyên nền/logo/safe-zone mới.

- Thay rail nút VIDEO bằng host + Follow, cụm người xem/top avatar, chip LIVE, banner sự kiện, bình luận + dòng tham gia, vệt quà, nút chia sẻ/tim và thanh nhập/quà ở đáy.
- Bố cục bám màn 921×2000; HUD không che Top 10/câu hỏi/đáp án/timer. Bật crop-fill 9:19.5, nội dung trong vùng an toàn theo thiết kế.
- Khung nét đứt và nhãn “HUD mô phỏng” chỉ xuất hiện với `debug=1`; không có trong ảnh mặc định.

Kiểm chứng:
- `corepack pnpm --filter @quiz/overlay build` — pass.
- `corepack pnpm typecheck` — pass.
- `corepack pnpm test:unit` — 21 files, 180 tests pass.
- `$env:PLAYWRIGHT_OVERLAY_PORT='5180'; corepack pnpm exec playwright test` — 30/30 pass trên msedge; 35 ghế đạt trung bình 120 FPS, p5 117.6 FPS.

Ảnh nghiệm thu: `.claude/worktrees/c0056-tiktok-live-hud/test-results/e2e/screenshots/question-hud.png`.

Preview live vẫn ở `http://127.0.0.1:5180/?mock=question&hud=1`.
