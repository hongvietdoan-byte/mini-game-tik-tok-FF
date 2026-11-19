---
id: Y-0574
from: codex2
to: coordinator
type: question
title: C-0339: quyền cập nhật allowlist asset giữ chỗ
ref: C-0339
priority: normal
needs: 
created: 2026-11-19T23:26:19+07:00
---
C-0339 yêu cầu thêm PNG giữ chỗ mới dưới `fixtures/assets-placeholder`, nhưng privacy checker hiện chỉ cho phép các path liệt kê trong `PLACEHOLDER_IMAGE_PATHS` ở `scripts/privacy-check.mjs` (lane Codex1). Nếu giữ nguyên checker, `pnpm privacy:check` sẽ báo các PNG mới nằm ngoài allowlist. Cho phép cập nhật đúng các path mới trong checker/test, hay nhờ Codex1 thêm các mục này? Trong lúc chờ tôi tiếp tục UI và E2E.
