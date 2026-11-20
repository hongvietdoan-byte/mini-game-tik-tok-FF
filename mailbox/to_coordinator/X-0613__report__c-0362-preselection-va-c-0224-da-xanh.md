---
id: X-0613
from: codex1
to: coordinator
type: report
title: C-0362: preselection và C-0224 đã xanh
ref: C-0362
priority: high
needs: 
created: 2026-11-20T17:50:45+07:00
---
# Báo cáo C-0362: preselection và C-0224

Nhánh: `codex1/c-0361-preselection-preflight`
Commit: `7c651e02`
Đã merge `origin/main` mới nhất trước khi gửi báo cáo: `2df0d1b3`.

## Kết quả

- So sánh test preselection: `origin/main` 16/20 pass, 4 fail; nhánh trước bản sửa 14/20 pass, 6 fail; sau sửa 20/20 pass. Chẩn đoán cho thấy test phụ thuộc cache filesystem thật và thứ tự khởi động synth; test mới dùng cache metadata trong bộ nhớ, vẫn giữ provider thật, cổng synth và assertion chuyển scene.
- Unit + integration: `corepack pnpm exec vitest run --project unit --project integration --pool=forks --maxWorkers=2` — 96 files, 630 tests pass trong cả 3 lượt.
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm privacy:check` — PASS (1428 tệp được theo dõi).
- `git diff --check` — PASS.
- C-0224 trước sửa: `--repeat-each=5` với asset thật tái hiện 5/5 timeout ở giới hạn 30 giây.
- C-0224 sau sửa: `corepack pnpm exec playwright test tests/e2e/c0223-mc-dialogue-wrap.spec.ts --repeat-each=10` — asset thật 10/10 pass; `QUIZ_ASSETS_DIR=fixtures/assets-placeholder` — 10/10 pass.
- Full Playwright với asset thật: 141 passed, 0 failed, 0 skipped, 0 did not run (8.9 phút).
- Full Playwright với placeholder: 140 passed, 0 failed, 1 skipped, 0 did not run (7.1 phút).

## C-0224

Timeout đến từ chi phí chụp lặp lại bubble/scene trong test. Đã chờ font, ảnh trong bubble hoàn tất decode và hai frame layout một lần mỗi layout; bubble được cuộn vào view rồi chụp bằng page clip theo bbox. Bảng đo vẫn kiểm tra đủ 10 scene; toàn bộ mẫu hội thoại, hình contact sheet và mọi assertion/số mẫu giữ nguyên. Bỏ 10 ảnh viewport phụ khỏi artefact để test không chụp dư; báo cáo review vẫn có tọa độ từng scene và contact sheet đầy đủ.

Chỉ sửa `tests/e2e/c0223-mc-dialogue-wrap.spec.ts` trong phạm vi được C-0366 cho phép và `tests/integration/mc-voice-preselection.test.ts` cho C-0361.

Tiếp theo theo thứ tự C-0362: C-0335, rồi nhánh gộp C-0360 + C-0329. C-0365 và C-0367 được ghi nhận để áp dụng ở các bước tương ứng.
