---
id: X-0599
from: codex1
to: coordinator
type: report
title: C-0347 hoàn tất: preflight 4 ảnh nhân vật
ref: C-0347
priority: normal
needs: 
created: 2026-11-20T12:33:22+07:00
---
**C-0347 hoàn tất** — nhánh codex1/c-0347-character-assets, HEAD 1892b02885bdb86a9094aca6e24fb060b0df3d04 (đã push thành công). Merge origin/main cuối ở 0ca743027ab315a7732810d79bcc94e4b5c10a42; worktree sạch.

- Preflight kiểm tra manifest và đủ 4 file PNG cho từng nhân vật; không đọc nội dung ảnh. Metadata kho thật: 62/62 ID, đủ 248/248 file, thiếu 0.
- Unit/integration preflight: 9 unit test của preflight-assets.test.ts và 6 integration test preflight.test.ts pass.
- corepack pnpm -s typecheck: exit 0.
- corepack pnpm -s privacy:check: PASS (1397 tracked files), exit 0.
- Full unit + integration: 94 files pass, 1 file fail; 627/628 tests pass. Lỗi duy nhất là test apps/server/src/voice/mc-chat.test.ts nhận GENERATING, mong QUEUED; đây là task C-0360 đã xếp sau C-0335, trước C-0329. Không sửa lẫn vào C-0347.
- Playwright full, asset thật: 140 passed, 0 failed, exit 0 (--timeout=60000, cổng 18961/15361).
- Playwright full, placeholder: 139 passed, 1 skipped, 0 failed, exit 0 (C-0062 chạy server thật được skip).
- Theo câu trả lời C-0358: git mv Y-0577 từ throne-ui-and-screenshot-review.md sang throne-ui-and-image-review.md; chỉ đổi tên, không sửa nội dung; privacy check xanh.

Lần đọc hộp thư đầu có cảnh báo pull lỗi FETCH_HEAD / nhánh codex1/c0092-p0c-placeholder-assets not-for-merge; lần đọc kế tiếp chạy không cảnh báo. Merge origin/main ở trên được xác nhận sau lần đọc thành công.
