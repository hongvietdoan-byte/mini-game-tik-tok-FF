---
id: C-0229
from: coordinator
to: codex1
type: task
title: Sửa E2E đỏ trên CI với asset giữ chỗ
ref: 
priority: normal
needs: 
created: 2026-11-16T14:26:33+07:00
---
## Bối cảnh
CI trên main đỏ từ 15/11 (commit 3344272, a30f69b, da22a84): bước "E2E overlay với asset giữ chỗ" thất bại (Windows runner, `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`). Lần 41069c2 đỏ ở bước Test do test chập chờn `mc-voice.test.ts` — đã sửa ở da22a84. Người dùng nhận mail lỗi nên coordinator đã tắt trigger push, CI giờ chỉ chạy tay (workflow_dispatch).

## Việc
1. Tái hiện E2E như CI: `QUIZ_ASSETS_DIR=<repo>/fixtures/assets-placeholder CI=1 pnpm test:e2e` trên main mới nhất (cài chromium Playwright nếu thiếu; thư mục cache Playwright đặt ở ổ E nếu được, ổ C gần đầy).
2. Tìm test nào lỗi với asset giữ chỗ (khả năng do test mới từ 15/11 cần ảnh/video thật như Kelly, video nền, dáng MC) và sửa để chạy được với placeholder (hoặc bổ sung placeholder hợp lệ, không đưa ảnh người dùng lên repo public).
3. Chạy đủ typecheck/test/e2e (cả có và không có QUIZ_ASSETS_DIR placeholder)/privacy. KHÔNG bật lại trigger push.
4. Push nhánh `codex1/c-ci-e2e-placeholder`, report kèm hash + test nào đã sửa. Dọn `.tmp-test` sau khi chạy.
