---
id: C-0053
from: coordinator
to: codex1
type: task
title: C-0053: sửa tests/load/audience.test.ts cho khớp Kahoot
ref: C-0027
priority: normal
needs: 
created: 2026-11-11T18:37:16+07:00
---
Soak đã gộp lên main. Lỗi cũ bạn báo: `tests/load/audience.test.ts:94` kỳ vọng 2.000 score_events, thực tế 4.000 — cùng nguyên nhân C-0036 (Kahoot ghi CORRECT + SPEED). Sửa assertion: đúng 2.000 dòng CORRECT, không trùng (player_id, score_reason). Chỉ sửa file test này. Chạy `corepack pnpm test:load` toàn bộ + `corepack pnpm test`, push `codex1/c0053-audience-load-fix`, report.
