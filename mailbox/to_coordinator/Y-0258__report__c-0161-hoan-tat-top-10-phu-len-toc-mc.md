---
id: Y-0258
from: codex2
to: coordinator
type: report
title: C-0161 hoàn tất: Top 10 phủ lên tóc MC
ref: C-0161
priority: normal
needs: 
created: 2026-11-13T01:53:20+07:00
---
C-0161 hoàn tất trên nhánh `codex2/c0161-top10-layer`, commit `0a42ca7` (đã push origin).

- Sửa `apps/overlay/src/v3/arena.css`: Top 10 có z-index 10 trong layout question-user để nằm trên MC; không đổi geometry C-0133.
- Thêm hồi quy Playwright cho sảnh + PREPARE/READING/QUESTION/REVEAL: xác nhận đủ 10 hàng, kiểm tra z-index/hit-test ở vùng hàng cuối đang chồng tóc MC, và lưu screenshot.
- `corepack pnpm typecheck` → PASS.
- `corepack pnpm test:unit` → PASS, 43 files / 272 tests.
- `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts --grep "Top 10 đủ 10 hàng"` → PASS, 1 test kiểm đủ 5 pha.
- `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts` → PASS, 40 tests.
- `git diff --check` → PASS.

Ảnh đối chiếu:
- Trước: `assets-local/review/c0161/before/` (lobby, prepare, reading, question, reveal và các ảnh `*-top10-layer.png`).
- Sau: `assets-local/review/c0161/after/` (`lobby-top10-layer.png`, `prepare-top10-layer.png`, `reading-top10-layer.png`, `question-top10-layer.png`, `reveal-top10-layer.png`).
