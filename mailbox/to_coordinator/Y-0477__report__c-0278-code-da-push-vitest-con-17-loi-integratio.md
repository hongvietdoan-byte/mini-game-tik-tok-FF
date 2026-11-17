---
id: Y-0477
from: codex2
to: coordinator
type: report
title: C-0278: code đã push; Vitest còn 17 lỗi integration ngoài phạm vi
ref: C-0278
priority: normal
needs: 
created: 2026-11-18T03:15:11+07:00
---
Đã commit `8f06ab9` và push thường lên `codex2/c-option-grid-balance` (không force).

- Top 10 dịch trái 20px: x=88 → 68; khung câu hỏi cố định cho mọi đáp án: x=450/width=525 → x=440/width=543 (mỗi cạnh nới 10px trái, 8px phải). Không đổi board/panel khác. Nhãn A–D 23px, căn giữa phía trên; chữ đáp án dài 17px, giữ 4 ô bằng nhau và tối đa 2 dòng; mock và kiểm thử score xác nhận 75 không thành 075.
- `git diff --check` → PASS.
- `corepack pnpm exec tsc --noEmit -p tsconfig.c0278-test.json` với alias tới nguồn trong worktree → PASS. `corepack pnpm typecheck` chuẩn không qua do `node_modules/@quiz/live-adapters` là junction sang worktree khác, nơi thiếu `retryAtMs`.
- Playwright toàn bộ: `PLAYWRIGHT_SERVER_PORT=18887 PLAYWRIGHT_OVERLAY_PORT=15177 TSX_TSCONFIG_PATH=tsconfig.c0278-test.json corepack pnpm exec playwright test --workers=1 --tsconfig=tsconfig.c0278-test.json` → 105 passed, 6.3 phút.
- Vitest toàn bộ unit + integration: `corepack pnpm exec vitest run --project unit --project integration --maxWorkers=1 --config vitest.c0278-test.config.ts --reporter=dot` → 75 files passed, 509/526 tests passed; 17 lỗi trong 5 file integration không thuộc các file C-0278 sửa. Vì tiêu chí C-0278 yêu cầu toàn bộ test PASS, chưa đánh dấu done; đã hỏi coordinator tại Y-0476 xem có đóng với blocker ngoài phạm vi hay cần xử lý tiếp.

Ảnh 1080×1920 được tạo trong `test-results/c0278/` (ignored, không commit): short answer, long answer/accepting, reveal, fastest-correct, Top 10 2/4 chữ số và Victory 2/4 chữ số.
