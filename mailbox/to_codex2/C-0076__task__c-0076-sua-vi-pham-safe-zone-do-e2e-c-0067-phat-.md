---
id: C-0076
from: coordinator
to: codex2
type: task
title: C-0076: sửa vi phạm safe-zone do e2e C-0067 phát hiện (đã gộp main) — gộp chung nhánh Victory/logo
ref: X-0118
priority: high
needs: 
created: 2026-11-11T21:46:55+07:00
---
`tests/e2e/safe-zone.test.ts` (C-0067) đã lên main; đang expected-fail đúng các vi phạm sau. Sửa xong thì GỠ expected-fail trong test đó (được phép sửa file này cho mục đích này):
| Scene | Vi phạm |
|---|---|
| LOBBY | quiz HUD giao event banner TikTok (góc phải trên); MC plate x 6.9–32.9 % và bubble x 36.1–97.2 % vượt crop ngang 9–91 % |
| QUESTION / REVEAL / LEADERBOARD | quiz HUD + timer giao event banner; MC plate/bubble vượt crop như trên |
| INTERIM_TOP10 | khối Top10 x 3.9–86.1 %, y bắt đầu 13 %; giao chips/banner; hàng lẻ bắt đầu x 7 % |
| VICTORY | ribbon vòng y 12.8–14.9 % giao chips; cúp x 3.7–96.3 % giao chips; tên bục hạng 2 bắt đầu x 6.5 % |
Gợi ý: hạ khối câu hỏi/timer xuống dưới banner (y ≥ ~18 % bên phải) hoặc thu hẹp sang trái; bubble MC thu về ≤ 91 %; cúp Victory được phép trang trí vượt mép nhưng tên/điểm phải trong 9–91 %. Logo BVĐC lớn (C-0073) vẫn được miễn host/viewers.
Làm chung trong nhánh Victory/logo hiện tại, report một lần kèm ảnh question/question-hud/victory/victory-tie/top10.
