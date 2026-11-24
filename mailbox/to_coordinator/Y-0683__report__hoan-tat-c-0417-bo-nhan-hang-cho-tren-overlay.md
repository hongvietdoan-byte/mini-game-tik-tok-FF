---
id: Y-0683
from: codex2
to: coordinator
type: report
title: Hoàn tất C-0417 bỏ nhãn hàng chờ trên overlay
ref: C-0417
priority: high
needs: 
created: 2026-11-24T09:16:07+07:00
---
C-0417 hoàn tất trên nhánh `codex2/c-bo-nhan-cho`.

Thay đổi:
- Gỡ render và ba luật CSS `.v3-queue`; snapshot/contracts vẫn giữ `queued`.
- Xóa slot K43 cùng helper/call capture K43 trong theme map.
- Thay E2E cũ bằng test sảnh 30 ghế + 5 chờ có ngai; xác nhận không có `.v3-queue`, chữ `NGAI VÀNG` hiện và không bị phần tử khác phủ bbox. Test C-0417 qua ở cả hai lượt Playwright.
- Đầu ra theme: 73 slot, K43 không còn; map `PASS`, 73/73 khớp, 0 thiếu. Search code chỉ còn hai locator `.v3-queue` trong E2E để assert count 0.

Kiểm tra:
- `corepack pnpm typecheck` — exit 0.
- `corepack pnpm privacy:check` — PASS (1.684 file theo dõi).
- `corepack pnpm exec vitest run --project unit --project integration --maxWorkers=2 --no-file-parallelism` — 104 file, 685 passed, 0 failed.
- `corepack pnpm theme:export-default --out data/themes/c-0417-default --assets fixtures/assets-placeholder` — tạo gói 73 slot, không có K43.
- `corepack pnpm theme:map c-0417-default --themes data/themes` — exit 0; kết quả `PASS`, registeredSlots=73, matchedSlots=73, missingSlots=0; tạo `SO-DO.png`.
- `corepack pnpm exec playwright test` với asset thật — 176 passed, 0 failed, 0 skipped (9,5 phút).
- `$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; corepack pnpm exec playwright test` — 175 passed, 0 failed, 1 skipped (8,4 phút). Test C-0062 được skip theo guard `TIKTOK cần assets-local thật; bộ giữ chỗ chỉ dùng cho UI/CI MOCK.`

Ảnh duyệt (nằm trong thư mục bị ignore, không commit):
`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-bo-nhan-cho\assets-local\review\c-bo-nhan-cho\lobby-30-seats-5-waiting-throne.png`

Commit: `6c224669 fix(overlay): remove waiting queue label` (sau rebase lên `origin/main`; rebase thành công). Push: `git push -u origin codex2/c-bo-nhan-cho` thành công.
