---
id: X-0604
from: codex1
to: coordinator
type: report
title: C-0361 hoàn tất — preselection đồng bộ đúng request câu 1
ref: C-0361
priority: normal
needs: 
created: 2026-11-20T14:35:06+07:00
---
# C-0361 — MC Voice preselection / preflight

**Nhánh:** `codex1/c-0361-preselection-preflight`  
**Commit sửa test:** `7b2d4f1e`  
**Commit C-0347 được kiểm tra:** `fc0a335c` (preflight đủ 4 ảnh/nhân vật và placeholder tương ứng)  
**Đã merge:** `origin/main` mới nhất trước báo cáo (merge commit trên nhánh).

## Kết quả điều tra

Không tái hiện lỗi coordinator báo trên môi trường này. Trên worktree C-0347 nguyên bản, lệnh chạy toàn file `tests/integration/mc-voice-preselection.test.ts` 10 lần liên tiếp đều 11/11 (10/10 lượt). Vì vậy chưa có bằng chứng xác nhận thiếu placeholder hoặc 248 `existsSync` là nguyên nhân của lần lỗi trước.

Ca lỗi dùng `mode: MOCK`; preflight dành cho lệnh START_ROUND TikTok không áp dụng cho cấu hình này. Đồng thời, test trước đây chờ `provider.synthesize` được gọi bất kỳ — lời chào WELCOME cũng thỏa điều kiện, không chứng minh tổng hợp câu hỏi 1 đã bắt đầu và đang bị gate giữ. Sửa test để chờ chính request có text bắt đầu bằng `Câu hỏi thử nghiệm số` trước khi bật auto mode. Đây là đồng bộ chính xác hơn cho tình huống test; không tăng timeout, không nới preflight.

Commit C-0347 đã có đủ 4 placeholder cho từng ID trong manifest `chibi-01..03`; các ảnh đều 67 byte và đã có trong allowlist `PLACEHOLDER_IMAGE_PATHS`. Không thay đổi logic preflight.

## Bằng chứng

- C-0347 nguyên bản, chạy vòng lặp toàn file 10 lần: **10/10 lượt, mỗi lượt 11/11**.
- C-0347 + barrier đã sửa, chạy vòng lặp toàn file 10 lần: **10/10 lượt, mỗi lượt 11/11**.
- `corepack pnpm -s typecheck`: PASS.
- `corepack pnpm -s privacy:check`: PASS — 1405 tệp theo dõi.
- `corepack pnpm exec vitest run --project unit --project integration --pool=forks --maxWorkers=2`: **96/96 tệp, 630/630 test đạt**.
- `PLAYWRIGHT_SERVER_PORT=18961 PLAYWRIGHT_OVERLAY_PORT=15361 corepack pnpm exec playwright test` (PowerShell env): **141/141 đạt**, asset thật mặc định.
- `QUIZ_ASSETS_DIR=fixtures/assets-placeholder PLAYWRIGHT_SERVER_PORT=18962 PLAYWRIGHT_OVERLAY_PORT=15362 corepack pnpm exec playwright test`: **140 đạt, 1 skip, 0 fail**.
- `git diff --check`: PASS.

Lỗi ban đầu không tái hiện được, nên thay đổi loại bỏ một race trong điều kiện đồng bộ của test; chưa kết luận đó là nguyên nhân duy nhất của lần fail coordinator quan sát.
