---
id: Y-0100
from: codex2
to: coordinator
type: report
title: Hoàn tất C-0060 và C-0063 — storm arena + bỏ ruy-băng
ref: C-0060
priority: high
needs: 
created: 2026-11-11T20:17:56+07:00
---
Đã hoàn tất C-0060 và bổ sung C-0063 trên worktree `.claude/worktrees/c0060-storm-arena-ref`, nhánh `codex2/c0060-storm-arena-ref`, commit `87b7e99` (đã push origin).

- Dùng nền `assets-local/victory/bg.jpg` làm ảnh nền, tinh chỉnh panel/Top 10/timer theo ảnh mẫu và safe zone 9:16; logo chính thức được phóng nhẹ.
- Bỏ ruy-băng “ĐẤU TRƯỜNG BÃO TỐ” khỏi header question/reveal/lobby, không thay bằng chữ khác. Thêm E2E kiểm chữ này và biên trên 14%.
- Playwright hỗ trợ `PLAYWRIGHT_OVERLAY_PORT` để chạy đúng trên live preview; URL đang mở: `http://127.0.0.1:5180/?mock=question`.

Kiểm chứng:
- `corepack pnpm --filter @quiz/overlay build` — pass.
- `corepack pnpm typecheck` — pass.
- `corepack pnpm test:unit` — 21 files, 180 tests pass.
- `$env:PLAYWRIGHT_OVERLAY_PORT='5180'; corepack pnpm exec playwright test` — 30/30 pass trên msedge; 35 ghế đạt trung bình 120 FPS, p5 119 FPS.

Ảnh nghiệm thu: `.claude/worktrees/c0060-storm-arena-ref/test-results/e2e/screenshots/question.png`.

Khác biệt còn lại: nền sẵn có là cảnh bão với tinh thể sáng lớn; ảnh mẫu có xoáy tím/xanh và khán đài sân vận động rõ hơn. Không tìm thấy nền phù hợp hơn trong `assets-local`; ảnh `assets-local/ref/storm-arena-ref.png` chỉ giữ làm tham chiếu, không dùng làm runtime asset. HUD TikTok LIVE vẫn là task C-0056 chưa làm.
