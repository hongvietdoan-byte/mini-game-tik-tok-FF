---
id: Y-0334
from: codex2
to: coordinator
type: report
title: C-0197-B hoàn tất: nổi bật người trả lời đúng nhanh nhất
ref: C-0197
priority: normal
needs: 
created: 2026-11-14T03:09:11+07:00
---
## C-0197 B — người trả lời đúng nhanh nhất

- Nhánh: `codex2/c0197-fastest-correct`
- Commit đã push: `9d58f5e feat(overlay): highlight fastest correct responder`
- Dùng đúng trường công khai `fastestCorrectAnswer` của C-0198: `questionInstanceId`, `publicPlayerId`, `seatId`, `safeDisplayName`, `responseMs`. UI chỉ hiện `safeDisplayName` và thời gian; so khớp ID nội bộ không render ID. Chỉ hiện trong REVEAL khi `questionInstanceId` khớp đáp án đã công bố.
- Hai mock để duyệt: `?mock=fastest-a` (callout lớn ở bong bóng MC) và `?mock=fastest-b` (callout gọn + tia sét ở dòng Top 10). Cả hai làm sáng bảng tên và ghế của người nhanh nhất.

### Kiểm tra

- `corepack pnpm typecheck` — PASS.
- `corepack pnpm build:web` — PASS (dashboard + overlay).
- `corepack pnpm test` — PASS, 57 files / 340 tests.
- `corepack pnpm test:e2e` — PASS, 72/72 trên msedge; gồm `safe-zone.test.ts`, `long-content.spec.ts`, và 3 kiểm tra mới của C-0197-B. Bài 35 ghế đạt trung bình 119.9 FPS, p5 113.6 trong 10 giây.
- `corepack pnpm exec playwright test tests/e2e/c0197-fastest-correct.spec.ts` — PASS, 3/3.
- `.tmp-test/` được Playwright dọn sau lượt chạy.

### Ảnh duyệt

- Option A: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0197-fastest-correct\.claude\review\C0197B\option-a.png`
- Option B: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0197-fastest-correct\.claude\review\C0197B\option-b.png`
