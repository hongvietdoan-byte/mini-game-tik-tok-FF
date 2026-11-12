---
id: Y-0214
from: codex2
to: coordinator
type: report
title: C-0133 hoàn tất: đưa khung câu hỏi lên cao và trả ô thoại MC
ref: C-0133
priority: high
needs: 
created: 2026-11-12T17:15:00+07:00
---
C-0133 hoàn tất.

- Đã cập nhật trên nhánh `codex2/c0131-ui-fix`; commit `774d86e` đã push. Không gộp main.
- Sửa `ArenaStage.tsx`, `arena.css`, `apps/overlay/src/mock/snapshots.ts`. Top 10 và khung câu hỏi cố định tại y=345px (18%), khung cao 470px đến y=815px (42%). Kelly ở trái; bong bóng thoại cố định x=410, y=844 (44%), 580×220px. Nội dung lấy từ `snapshot.mc.bubble`, mock REVEAL có lời công bố riêng.
- Quan sát các pha: câu hỏi/Top 10/MC/thoại cùng vị trí qua READING, ACCEPTING ngắn/dài, REVEAL; câu dài nằm trong khung. Không đánh dấu đáp án đúng ở READING/ACCEPTING; REVEAL mới đánh dấu đáp án B.

Kiểm tra theo C-0130, không chạy build/e2e đầy đủ:
- `corepack pnpm typecheck` — pass, exit 0.
- `corepack pnpm exec vitest run --project unit apps/overlay/src/v3/arenaLogic.test.ts apps/overlay/src/overlayLogic.test.ts` — 2 file, 8/8 pass.
- Playwright Edge, chụp đúng hai ảnh ghép:
  - 4 pha cạnh nhau: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0131-ui-fix\assets-local\review\c0133\four-phases.png` (2160×1000).
  - REF | ACCEPTING: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0131-ui-fix\assets-local\review\c0133\ref-accepting.png` (2160×1960).
- Preview tạm đã dừng; cổng 5192 và 18791 đã đóng.
