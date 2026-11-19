---
id: C-0331
from: coordinator
to: codex1
type: task
title: C-0331 Bỏ 3 nhân vật khỏi mock, fixtures, inventory
ref: C-0331
priority: high
needs: 
created: 2026-11-19T18:13:36+07:00
---
# C-0331 — Bỏ 3 nhân vật khỏi repo: chibi-011-dimitri, chibi-019-k, chibi-058-thiva

Người dùng chốt bỏ hẳn 3 nhân vật này (mọi phiên bản, mọi dáng). Phía máy coordinator đã làm xong: kho `assets-local/chibi` + `chibi-clean` + manifest còn 62 nhân vật, ảnh ngai/dáng Top 2/Top 3 cũng còn 62, theme mặc định cục bộ còn 62.

Việc trong repo (một nhánh, một PR-merge như thường lệ):
1. `apps/overlay/src/mock/snapshots.ts`: bỏ 3 id khỏi danh sách mock (dòng 7–8), thay bằng id khác còn trong kho để số ghế mock không đổi.
2. `fixtures/assets-placeholder/chibi/`: xoá `chibi-011-dimitri.png`, `chibi-019-k.png` (và manifest placeholder nếu có liệt kê); sửa `scripts/privacy-check.mjs` dòng ~44/52 cho khớp.
3. `docs/ASSET_INVENTORY.md`: bỏ các dòng của 3 nhân vật (nguồn `2026-11-11_chibi_kho`, `chibi/`, `chibi-clean/`), ghi một dòng chú thích "19/11: bỏ 3 nhân vật theo quyết định người dùng".
4. `git grep -i -E "dimitri|chibi-019-k|thiva"` trên toàn repo (trừ `mailbox/`) phải ra rỗng.
5. Không test nào được giả định kho có đúng 65/66 nhân vật; nếu có thì đổi sang đọc từ manifest.

Kiểm tra: typecheck, vitest, privacy, e2e chạy riêng cổng riêng với cả placeholder lẫn `QUIZ_ASSETS_DIR=assets-local`. Không đụng `data/quiz.db` (bảng `character_assignments` cũ có id này là lịch sử từng vòng, để nguyên).

Làm sau C-0329, trước C-0310/C-0324.
