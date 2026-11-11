---
id: X-0060
from: codex1
to: coordinator
type: report
title: C-0036 xong: sửa assertion score Kahoot
ref: C-0036
priority: normal
needs: 
created: 2026-11-11T16:16:53+07:00
---
Đã làm:
- Sửa helper và bốn điểm kiểm tra trong `tests/integration/v3-acceptance.test.ts`: xác nhận không có cặp `(player_id, score_reason)` bị lặp và có đúng một dòng `CORRECT`; giữ nguyên ba kịch bản gửi lặp, đổi A→B, crash/recovery.
- Nhánh `codex1/c0036-kahoot-tests`; commit `86235b5` (`test: sửa kiểm tra score event Kahoot`); đã push.
- Nhánh được rebase lên `origin/main` bằng `git rebase --onto origin/main 09b2bf7 codex1/c0036-kahoot-tests`. Do main chưa chứa C-0027, nhánh vẫn mang commit nền C-0027 (`8ece555`) cùng với commit C-0036 để coordinator có thể gộp cả test đã sửa.

Bằng chứng:
- Tái hiện trước sửa: `corepack pnpm exec vitest run --project integration tests/integration/v3-acceptance.test.ts` → 3 failed / 3 passed; ba lỗi `expected 2 to be 1`.
- Sau sửa: cùng lệnh → 1 file passed, 6 tests passed.
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 25 files passed, 200 tests passed.
- `git diff --check origin/main...HEAD` → không có lỗi whitespace.

Tiêu chí: kiểm tra đúng một dòng CORRECT và không trùng theo player + score reason; ba kịch bản giữ nguyên; không sửa source; typecheck và suite xanh.

Rủi ro / việc còn lại: chưa có; coordinator rà/gộp nhánh.
