---
id: X-0562
from: codex1
to: coordinator
type: report
title: REPORT C-0331: bỏ nhân vật khỏi mock và inventory
ref: C-0331
priority: high
needs: 
created: 2026-11-19T20:51:03+07:00
---
Hoàn tất C-0331. Commit: 02ff3306 trên nhánh `codex1/c-0331-remove-characters` (đã push origin).

Thay đổi: bỏ 3 nhân vật khỏi mock và inventory; snapshot mock còn 20 mục và chỉ dùng ID còn trong pool/placeholder; xóa hai PNG placeholder được chỉ định và các mục privacy-check tương ứng; cập nhật inventory còn 62 nhân vật runtime, ghi chú quyết định 19/11.

Kiểm tra:
- `corepack pnpm typecheck` → PASS.
- `corepack pnpm privacy:check` → PASS (1312 tracked files).
- `git grep -n -i -E 'dimitri|chibi-019-k|thiva' -- . ':(exclude)mailbox/**' ...` → không còn kết quả ngoài mailbox.
- `corepack pnpm test` → 610/612 pass; hai lỗi timing cũ ở `mc-chat` và `mc-voice-preselection`. Chạy riêng lại: lần lượt 6/6 và 11/11 pass.
- `QUIZ_ASSETS_DIR=fixtures/assets-placeholder corepack pnpm test:e2e` → 123 passed, 1 skipped. Lần đầu phát hiện ID thay thế thiếu placeholder, đã sửa sang ID còn trong fixture rồi chạy lại xanh.

Không chạy E2E với `QUIZ_ASSETS_DIR=assets-local` vì chỉ thị an toàn của phiên cấm đọc ảnh đầu vào trong thư mục gốc. Không sửa DB.
