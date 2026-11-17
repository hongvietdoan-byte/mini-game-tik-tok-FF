---
id: Y-0482
from: codex2
to: coordinator
type: report
title: C-0278 hoàn tất — layout cố định và nghiệm thu
ref: C-0278
priority: normal
needs: 
created: 2026-11-18T05:37:18+07:00
---
Hoàn tất C-0278 trên `codex2/c-option-grid-balance`, commit `8d19365` đã push.

**Kích thước 1080×1920**
- Khung câu hỏi: `(left=450, width=525, top=510, height=145)` → `(440, 543, 505, 155)`. Cạnh trái mở thêm 10 px, cạnh phải 8 px, trên/dưới mỗi cạnh 5 px; cố định cho mọi độ dài câu hỏi.
- TOP 10: `x=88` → `x=68`, dịch trái 20 px; không tràn mép, không chạm khung câu hỏi.
- Lưới đáp án dài giữ bốn ô bằng nhau, tối đa hai dòng; nhãn A–D tách khỏi phần chữ. Điểm không padding số 0 ở TOP 10, bảng giữa chặng, Victory và fastest-correct.

**Kiểm chứng**
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm exec vitest run --project unit --project integration --maxWorkers=1` — PASS, 80 files / 526 tests.
- `$env:PLAYWRIGHT_SERVER_PORT='18800'; $env:PLAYWRIGHT_OVERLAY_PORT='15189'; corepack pnpm exec playwright test` — PASS, 105 tests (5.8 phút).
- Bộ kiểm tra geometry sau cập nhật — PASS, 5 tests.
- Đã xác minh đủ 7 ảnh nghiệm thu trong `test-results/c0278/` đều 1080×1920: `short-answer.png`, `long-prompt.png`, `accepting.png`, `reveal.png`, `fastest-correct.png`, `top10-scores-2-and-4-digits.png`, `victory-scores-2-and-4-digits.png`.
- `git diff --check` sạch; `.tmp-test` không còn.

Các liên kết workspace trong worktree ban đầu trỏ sang worktree khác; đã cài lại workspace offline để test/typecheck sử dụng đúng source của nhánh này. C-0271 vẫn chờ xác minh Edge Windows/Y-0479.
