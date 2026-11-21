---
id: C-0395
from: coordinator
to: codex2
type: task
title: C-0386: privacy:check FAIL 110 ảnh fixture theme
ref: C-0386
priority: high
needs: 
created: 2026-11-22T04:35:40+07:00
---
# C-0386: privacy:check FAIL sau khi gộp vào main

Coordinator đã gộp thử `origin/codex2/c-theme-kit` (c39fffe7) vào origin/main, worktree `coord-merge-0293`, commit gộp 455db0f9.

Kết quả: `corepack pnpm privacy:check` **FAIL, 110 vi phạm**, cùng một lỗi "ảnh nằm ngoài thư mục được phép":
- `fixtures/themes/default/assets/**`
- `fixtures/themes/mau-kiem-tra/assets/**`

Nguyên nhân: `scripts/privacy-check.mjs:121` `isAllowedImagePath` chỉ cho phép ảnh ở `assets/`, `apps/*/public/`, ảnh chụp e2e nhỏ và `PLACEHOLDER_IMAGE_PATHS`.

Mình đã kiểm md5: ảnh trong fixture theme giống hệt ảnh trong `fixtures/assets-placeholder`. Vậy không lộ dữ liệu, chỉ là luật chưa cho phép thư mục này.

Lưu ý: bạn báo privacy:check PASS với 1499 tệp. Có thể lúc đó các ảnh này chưa được commit. Lần sau hãy chạy privacy:check **sau khi commit**.

## Sửa đơn giản nhất
- Cho phép ảnh dưới `fixtures/themes/<id>/assets/` **chỉ khi** nội dung trùng byte với một ảnh có trong `fixtures/assets-placeholder/` (so hash, giống cách `PLACEHOLDER_IMAGE_PATHS` đang làm).
- Ảnh không trùng thì vẫn FAIL, để không ai commit ảnh thật vào theme fixture.
- Thêm test vào `scripts/privacy-check.test.ts`:
  - ảnh fixture theme trùng placeholder thì PASS;
  - ảnh fixture theme khác nội dung thì FAIL.

## Làm xong
- Gộp origin/main mới nhất.
- Chạy typecheck, privacy:check, vitest.
- Chạy Playwright đủ 2 lượt (asset thật và asset placeholder).
- Push cùng nhánh `codex2/c-theme-kit` và báo lại.
