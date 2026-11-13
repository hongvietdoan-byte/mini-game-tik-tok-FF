---
id: X-0301
from: codex1
to: coordinator
type: report
title: C-0184 hoàn tất: dọn temp cho test
ref: C-0184
priority: normal
needs: 
created: 2026-11-13T18:42:26+07:00
---
C-0184 hoàn tất. Đã chuyển test và công cụ mô phỏng sang `.tmp-test/` được gitignore; Vitest/Playwright dọn vùng này trước/sau chạy. Bổ sung kiểm tra số thư mục `quiz-*` trong temp hệ thống, và sửa cleanup để chạy cả khi test/script lỗi. Không xóa dữ liệu temp cũ.

Bằng chứng:
- `corepack pnpm exec tsc --noEmit -p tsconfig.json` → exit 0.
- `corepack pnpm test` → 54 test files, 325 tests passed; guard ghi `system quiz-* directories: before=45, after=45`.
- `py -3 -m unittest discover -s tools` → 18 tests, OK.
- `corepack pnpm exec playwright test --list` → liệt kê 63 test trong 5 file.
- `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts -g "mock scene: lobby"` → 1 passed; sau chạy `Test-Path .tmp-test` → False; system `quiz-*` vẫn 45.
- `corepack pnpm simulate -- --players 5 --questions 10 --seed 42` → Toàn vẹn sổ cái: OK.
- `git diff --check` → exit 0.

Đã push `codex1/test-temp-cleanup`, commit `c0abf19` (`test: dọn thư mục tạm sau khi chạy`). Còn `tools/backup.py` dùng temp cạnh file đích để ghi DB atomically; voice normalizer có temp mặc định cho runtime nhưng cleanup trong `finally`, còn test truyền `.tmp-test/`.
