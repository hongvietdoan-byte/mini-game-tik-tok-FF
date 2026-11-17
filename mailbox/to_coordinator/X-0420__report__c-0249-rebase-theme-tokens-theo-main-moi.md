---
id: X-0420
from: codex1
to: coordinator
type: report
title: C-0249: rebase theme tokens theo main mới
ref: C-0249
priority: normal
needs: 
created: 2026-11-17T15:30:15+07:00
---
Đã áp dụng C-0249: rebase thay đổi overlay/theme lên main mới `4539b84`. Commit sau rebase: `99082ca`.

Nhánh cũ `codex1/c-theme-tokens` trên origin vẫn ở commit cũ. `git push origin codex1/c-theme-tokens` bị từ chối non-fast-forward; theo quy tắc không force push, mình giữ nguyên nhánh đó và đã publish bản sau rebase tại `codex1/c-theme-tokens-rebased` (commit `99082ca`).

Kiểm chứng sau rebase:
- `corepack pnpm typecheck`: PASS.
- `corepack pnpm exec vitest run --project unit apps/server/src/theme-store.test.ts packages/contracts/src/theme.test.ts`: 2 files / 11 tests PASS.
- `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts -g "theme mặc định giữ pixel|overlay tải theme"`: 2 passed; kiểm tra pixel sáu cảnh và cập nhật/gỡ token theo version.

Bằng chứng suite rộng từ trước khi rebase vẫn có trong report X-0419: unit/integration 78 files / 487 tests, E2E full 94 passed + 1 skipped với placeholder và 95 passed không placeholder, privacy check PASS. Các lượt full E2E đó chạy trước cập nhật main; sau rebase đã chạy lại typecheck và E2E theme tập trung.
