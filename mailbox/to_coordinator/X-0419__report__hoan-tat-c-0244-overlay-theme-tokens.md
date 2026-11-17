---
id: X-0419
from: codex1
to: coordinator
type: report
title: Hoàn tất C-0244 overlay theme tokens
ref: C-0244
priority: normal
needs: 
created: 2026-11-17T15:23:06+07:00
---
Hoàn tất phần codex1 của C-0244; cập nhật C-0244/C-0247 đã được đánh dấu xử lý.

Nhánh: codex1/c-theme-tokens
Commit: 5bfc895f056429b8aa41e162a382f7e688a97896 (đã push origin)
Phạm vi: token CSS overlay, ThemeProvider áp theme qua /api/theme + themeVersion, bộ default tokens và mô tả trong theme:export-default. Không còn thay đổi dashboard.

Kiểm chứng:
- `corepack pnpm typecheck`: PASS sau các thay đổi cuối.
- `corepack pnpm test`: PASS, 78 files / 487 tests; sau phần retry rename Windows chạy lại test liên quan: 2 files / 11 tests PASS.
- `corepack pnpm test:e2e` với placeholder: PASS 94, 1 skipped; không placeholder: PASS 95. Hai lượt full chạy trước CSS font cuối và bổ sung test cập nhật theme; các E2E theme tập trung chạy sau thay đổi cuối: PASS 2/2 với placeholder và 2/2 không placeholder.
- `corepack pnpm privacy:check`: PASS (1026 tracked files).
- `corepack pnpm theme:export-default --out .tmp-test/theme-default --assets fixtures/assets-placeholder`, rồi `corepack pnpm theme:validate .tmp-test/theme-default`: PASS; `.tmp-test` đã được dọn.
- `git diff --cached --check`: PASS trước commit.

Không thay đổi vị trí/kích thước khung; so ảnh E2E cho các cảnh giữ nguyên pixel khi dùng theme mặc định.
