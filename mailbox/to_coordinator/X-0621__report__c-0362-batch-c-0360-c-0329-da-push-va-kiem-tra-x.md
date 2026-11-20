---
id: X-0621
from: codex1
to: coordinator
type: report
title: C-0362 batch C-0360+C-0329 đã push và kiểm tra xong
ref: C-0362
priority: high
needs: 
created: 2026-11-20T21:02:14+07:00
---
Hoàn tất batch C-0329 + C-0360 trên `codex1/batch-0360-0329`; đã push commit `c12c485d12b906b828ed7820b112af48821c7b52`.

Thay đổi (5 file):
- `apps/server/src/voice/mc-chat.test.ts`, `apps/server/src/voice/welcome.test.ts`: thay chờ theo thời gian/polling bằng latch gắn với cue hoặc snapshot event; nguyên nhân là assertion quan sát trạng thái trước khi event bất đồng bộ phát ra, khiến kết quả phụ thuộc tải/thời điểm.
- `fixtures/questions.ts`, `fixtures/fixtures.test.ts`, `tests/e2e/c0319-hud-tall.spec.ts`: archive demo-001/demo-023; kiểm định 34 câu APPROVED trên 36 fixture; phép đo câu dài chỉ xét APPROVED và xác nhận không cắt quá 3 dòng.
- demo-004/demo-029 cập nhật chính xác theo nội dung v3 của C-0371, giữ nguyên ID, thứ tự lựa chọn và đáp án đúng.

Bằng chứng:
- Baseline `origin/main`: `mc-chat.test.ts` 20/20 lần (mỗi lần 6/6), `welcome.test.ts` 20/20 (mỗi lần 1/1); không lần nào fail.
- Batch: hai file trên lần lượt 20/20 (6/6 từng lượt) và 20/20 (1/1 từng lượt). Vòng lặp đã gọi `corepack pnpm exec vitest run <file>` cho từng lượt; log mỗi lượt ở `.claude/review/C0360-baseline/` và `.claude/review/C0360-batch/` trong worktree tương ứng.
- `corepack pnpm -s typecheck`: PASS.
- `corepack pnpm -s privacy:check`: PASS, 1444 tệp theo dõi.
- `corepack pnpm exec vitest run --project unit --project integration --pool=forks --maxWorkers=2`: PASS, 644/644.
- Playwright toàn bộ, asset thật: 142 passed, 0 failed, 0 skipped, 0 did not run.
- Playwright toàn bộ, `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`: 141 passed, 0 failed, 1 skipped, 0 did not run.
- Sau khi merge thay đổi test Dashboard C-0376 mới nhất từ main: `playwright test tests/e2e/dashboard.test.ts` PASS 19/19 với asset thật và 19/19 với placeholder.
- `git diff --check`: PASS; `git diff --stat origin/main` trước commit chỉ có 5 file nêu trên, không có ảnh/asset đầu vào. Nhánh đã fast-forward merge `origin/main` mới nhất trước khi push.

Setup Wizard thuộc nhánh Codex2 theo C-0373; batch không tự sửa `tests/e2e/dashboard.test.ts`. Bản sửa Dashboard sau đó được merge từ main theo C-0376 và được kiểm tra riêng cả hai bộ asset.
