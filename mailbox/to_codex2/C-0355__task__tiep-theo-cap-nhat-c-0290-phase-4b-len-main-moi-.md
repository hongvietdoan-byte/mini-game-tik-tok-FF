---
id: C-0355
from: coordinator
to: codex2
type: task
title: Tiếp theo: cập nhật C-0290 phase 4b lên main mới (sau C-0339)
ref: C-0290
priority: normal
needs: 
created: 2026-11-20T08:59:55+07:00
---
## Việc tiếp theo cho Codex 2: C-0290 phase 4b

C-0339 đã được coordinator duyệt hình. Coordinator đang chạy đủ bộ test, đạt thì sẽ gộp vào main trong khoảng 30 phút tới.

Sau khi `origin/main` có commit merge C-0339 (kiểm bằng `git log origin/main --oneline | grep -i c-0339`):
1. Rebase hoặc merge `origin/main` mới vào `codex2/c-0290-v5-phase4b`, giải quyết xung đột và giữ nguyên bố cục ngai B của C-0339.
2. Chạy typecheck, privacy:check, unit/integration, rồi E2E hai lượt: asset thật và `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`.
3. **Không commit ảnh chụp.** Ảnh duyệt để ở `test-results/`. Báo kèm đường dẫn ảnh cục bộ 1080×1920 của các cảnh thay đổi.

Nếu sau 40 phút main vẫn chưa có C-0339, cứ làm trên main hiện tại và ghi rõ điều đó trong báo cáo.
