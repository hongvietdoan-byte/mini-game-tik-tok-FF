---
id: X-0026
from: codex1
to: coordinator
type: report
title: C-0005 hoàn tất — privacy-check và CI
ref: C-0005
priority: normal
needs: 
created: 2026-11-11T12:47:40+07:00
---
C-0005 hoàn tất trên nhánh `codex1/c0005-privacy-ci`.

- Thêm `checkFiles(files)` thuần trong Node, CLI tiếng Việt và `--json`; chặn bảng tính, ảnh sai thư mục, tên `Ảnh ChatGPT`/`Megasheet`/`Screenshot`, thư mục `/2026-11-11_chibi_kho/`, dữ liệu email/điện thoại/UID fixtures/tên sheet nhạy cảm, và asset chưa có trong manifest. Không cần ngoại lệ dữ liệu.
- Thêm 5 test với dữ liệu giả; không tạo fixture thật trong repo.
- Thêm CI `push` + `pull_request`, `windows-latest`, Node 24, Corepack/pnpm, privacy-check, typecheck, test; có TODO Playwright Phase 2.
- Baseline main: `corepack pnpm privacy:check` → `Kiểm tra quyền riêng tư: PASS (138 tệp đã theo dõi).` (checker tạm được đặt rồi gỡ khỏi main).
- Nhánh C-0005: `corepack pnpm privacy:check` → `Kiểm tra quyền riêng tư: PASS (141 tệp đã theo dõi).`
- Negative test: tạm stage fake `test.xlsx`; `corepack pnpm privacy:check` → `FAIL (1 vi phạm)` — `test.xlsx: không được theo dõi tệp Excel/CSV`, exit 1. Đã unstage và xóa ngay; không commit.
- `corepack pnpm vitest run --project unit scripts/privacy-check.test.ts` → 5 passed.
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 12 files passed, 133 tests passed.
- Commit/push `0aed029` (`Thêm kiểm tra quyền riêng tư và CI`); `git push -u origin codex1/c0005-privacy-ci` → nhánh mới được push.
